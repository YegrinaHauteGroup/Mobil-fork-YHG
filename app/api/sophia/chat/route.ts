import { createClient } from "@/lib/supabase/server";

// Llama 70B 완성 전체를 기다리면 서버리스 함수 기본 제한 시간(대개 10초)을
// 넘기기 쉬워 "응답이 아예 안 옴" 증상으로 이어진다. 스트리밍으로 바꿔도
// 함수 실행 시간 자체는 그대로 걸리므로, 더 긴 응답도 끝까지 받을 수 있게
// 제한 시간을 넉넉히 늘린다(플랫폼이 지원하는 한도 내로 자동 clamp됨).
export const maxDuration = 60;

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

const SYSTEM_PROMPT =
  "You are Sophia, the AI assistant built into Mobil (a personal workspace for documents, code, sheets, files and mind maps). Be helpful, concise, and clear.";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

function isRetryableStatus(status: number): boolean {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

/** NVIDIA_API_KEY_2 가 메인(Llama) 키이므로 항상 먼저 시도하고, 실패하면
 * NVIDIA_API_KEY 로 넘어간다(무작위 로드밸런싱 없이 고정 우선순위). */
function getOrderedKeys(): string[] {
  return [process.env.NVIDIA_API_KEY_2, process.env.NVIDIA_API_KEY].filter(
    (k): k is string => !!k
  );
}

export async function POST(req: Request) {
  let body: { conversationId?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const conversationId = body.conversationId;
  const trimmed = String(body.content ?? "").trim();
  if (!conversationId || !trimmed) {
    return new Response("Missing conversationId or content.", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Authentication required.", { status: 401 });

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", conversationId)
    .single();
  if (!conv) return new Response("Conversation not found.", { status: 404 });

  const { error: insertErr } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "user", content: trimmed });
  if (insertErr) return new Response("Failed to save message.", { status: 500 });

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  const keys = getOrderedKeys();
  if (keys.length === 0) {
    return new Response("Sophia isn't configured yet (missing NVIDIA_API_KEY).", {
      status: 500,
    });
  }

  let upstream: Response | null = null;
  let lastStatus: number | null = null;
  for (let i = 0; i < keys.length; i++) {
    const isLastKey = i === keys.length - 1;
    try {
      const res = await fetch(NVIDIA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keys[i]}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: NVIDIA_MODEL,
          messages,
          temperature: 0.2,
          top_p: 0.7,
          max_tokens: 1024,
          stream: true,
        }),
      });
      if (res.ok) {
        upstream = res;
        break;
      }
      lastStatus = res.status;
      const text = await res.text().catch(() => "");
      console.error(`[sophia] NVIDIA API error (key ${i + 1}/${keys.length})`, res.status, text);
      if (!isRetryableStatus(res.status) || isLastKey) {
        return new Response(`Sophia is unavailable right now (${res.status}).`, {
          status: 502,
        });
      }
    } catch (e) {
      console.error(`[sophia] NVIDIA API request failed (key ${i + 1}/${keys.length})`, e);
      if (isLastKey) {
        return new Response("Sophia is unavailable right now.", { status: 502 });
      }
    }
  }

  if (!upstream || !upstream.body) {
    return new Response(`Sophia is unavailable right now (${lastStatus ?? "network error"}).`, {
      status: 502,
    });
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let full = "";
  let buffer = "";

  const isFirstMessage = (history ?? []).length <= 1;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const payload = t.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta: string = json?.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                full += delta;
                controller.enqueue(encoder.encode(delta));
              }
            } catch {
              // NVIDIA SSE 청크가 중간에 잘려 온 경우 등 — 무시하고 계속.
            }
          }
        }
      } finally {
        const finalContent = full || "…";
        await supabase
          .from("ai_messages")
          .insert({ conversation_id: conversationId, role: "assistant", content: finalContent });

        const nextTitle =
          isFirstMessage && conv.title === "New chat" ? trimmed.slice(0, 60) : conv.title;
        await supabase
          .from("ai_conversations")
          .update({ title: nextTitle })
          .eq("id", conversationId);

        controller.close();
      }
    },
    cancel() {
      reader.cancel();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
