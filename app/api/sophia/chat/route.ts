import { createClient } from "@/lib/supabase/server";
import { SOPHIA_TOOLS, executeSophiaTool } from "@/app/(app)/sophia/tools";

// Llama 70B 완성 전체를 기다리면 서버리스 함수 기본 제한 시간(대개 10초)을
// 넘기기 쉬워 "응답이 아예 안 옴" 증상으로 이어진다. 스트리밍으로 바꿔도
// 함수 실행 시간 자체는 그대로 걸리므로, 더 긴 응답도 끝까지 받을 수 있게
// 제한 시간을 넉넉히 늘린다(플랫폼이 지원하는 한도 내로 자동 clamp됨).
export const maxDuration = 60;

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

// 도구 호출이 계속 이어지는 걸 막기 위한 최대 라운드 수 — 마지막 라운드는
// tools 를 아예 안 붙여서 반드시 텍스트 답으로 마무리되게 한다.
const MAX_TOOL_ROUNDS = 4;

const SYSTEM_PROMPT = `You are Sophia, the AI assistant built into Mobil (a personal workspace for documents, code, sheets, files and mind maps). Be helpful, concise, and clear.

You have tools to search, read, create, and edit the user's Mobil content, and to search external papers/GitHub code (Big Brother). Use them whenever they'd help answer the question or complete a request — don't just describe what you would do, actually call the tool. Search first if you need an id you don't already have. Before a 'replace' edit that overwrites existing content, briefly confirm that's what the user wants unless they clearly already asked for exactly that. After using a tool, tell the user plainly what you found or did (don't narrate the tool call itself).`;

type ToolCallOut = { id: string; type: "function"; function: { name: string; arguments: string } };

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: ToolCallOut[];
  tool_call_id?: string;
};

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

/** 여러 키를 순서대로 시도해 스트리밍 응답을 얻는다. 전부 실패하면 null. */
async function callNvidia(
  messages: ChatMessage[],
  tools: typeof SOPHIA_TOOLS | undefined
): Promise<{ upstream: Response } | { error: string; status: number }> {
  const keys = getOrderedKeys();
  if (keys.length === 0) {
    return { error: "Sophia isn't configured yet (missing NVIDIA_API_KEY).", status: 500 };
  }

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
          ...(tools ? { tools, tool_choice: "auto" } : {}),
        }),
      });
      if (res.ok) return { upstream: res };
      lastStatus = res.status;
      const text = await res.text().catch(() => "");
      console.error(`[sophia] NVIDIA API error (key ${i + 1}/${keys.length})`, res.status, text);
      if (!isRetryableStatus(res.status) || isLastKey) {
        return { error: `Sophia is unavailable right now (${res.status}).`, status: 502 };
      }
    } catch (e) {
      console.error(`[sophia] NVIDIA API request failed (key ${i + 1}/${keys.length})`, e);
      if (isLastKey) return { error: "Sophia is unavailable right now.", status: 502 };
    }
  }
  return { error: `Sophia is unavailable right now (${lastStatus ?? "network error"}).`, status: 502 };
}

/**
 * 한 라운드의 SSE 스트림을 소비한다. tool_calls 델타가 하나라도 보이면 이
 * 라운드는 "도구 호출" 라운드로 간주해 텍스트를 클라이언트로 내보내지
 * 않고 조용히 누적만 한다(OpenAI 호환 API 는 한 메시지 안에서 content 와
 * tool_calls 를 섞어 보내지 않는다). tool_calls 가 전혀 없으면 최종 답변
 * 라운드이므로 델타가 오는 즉시 클라이언트로 스트리밍한다.
 */
async function consumeRound(
  upstream: Response,
  forward: (chunk: string) => void
): Promise<{ content: string; toolCalls: ToolCallOut[] }> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let hasToolCalls = false;
  const callsByIndex = new Map<number, { id: string; name: string; args: string }>();

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
      let json: {
        choices?: {
          delta?: {
            content?: string;
            tool_calls?: {
              index: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }[];
          };
        }[];
      };
      try {
        json = JSON.parse(payload);
      } catch {
        continue; // 중간에 잘려 온 청크 등 — 무시하고 계속.
      }
      const delta = json?.choices?.[0]?.delta;
      if (delta?.tool_calls?.length) {
        hasToolCalls = true;
        for (const tc of delta.tool_calls) {
          const existing = callsByIndex.get(tc.index) ?? { id: "", name: "", args: "" };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name += tc.function.name;
          if (tc.function?.arguments) existing.args += tc.function.arguments;
          callsByIndex.set(tc.index, existing);
        }
      } else if (delta?.content && !hasToolCalls) {
        content += delta.content;
        forward(delta.content);
      }
    }
  }

  const toolCalls: ToolCallOut[] = [...callsByIndex.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, c]) => ({
      id: c.id || `call_${Math.random().toString(36).slice(2)}`,
      type: "function" as const,
      function: { name: c.name, arguments: c.args },
    }));

  return { content, toolCalls };
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

  const isFirstMessage = (history ?? []).length <= 1;

  // 첫 라운드는 스트림을 열기 전에 시도한다 — 실패하면(키 미설정, NVIDIA 쪽
  // 오류 등) 이전처럼 적절한 상태 코드로 바로 응답할 수 있다. 도구를 호출한
  // 이후의 라운드(2번째부터)는 이미 200 스트림이 시작된 뒤라 실패 시 본문에
  // 에러 텍스트를 흘려보내는 것으로 대신한다 — 흔치 않은 경로다.
  const firstAttempt = await callNvidia(messages, SOPHIA_TOOLS);
  if ("error" in firstAttempt) {
    return new Response(firstAttempt.error, { status: firstAttempt.status });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const forward = (chunk: string) => controller.enqueue(encoder.encode(chunk));
      let full = "";
      let failed: string | null = null;
      let nextUpstream: Response | null = firstAttempt.upstream;

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const isLastAllowedRound = round === MAX_TOOL_ROUNDS - 1;
          if (!nextUpstream) {
            const attempt = await callNvidia(messages, isLastAllowedRound ? undefined : SOPHIA_TOOLS);
            if ("error" in attempt) {
              failed = attempt.error;
              break;
            }
            nextUpstream = attempt.upstream;
          }

          const { content, toolCalls } = await consumeRound(nextUpstream, forward);
          nextUpstream = null;

          if (toolCalls.length > 0 && !isLastAllowedRound) {
            messages.push({ role: "assistant", content: content || null, tool_calls: toolCalls });
            for (const call of toolCalls) {
              let args: Record<string, unknown> = {};
              try {
                args = JSON.parse(call.function.arguments || "{}");
              } catch {
                // 인자 JSON 이 깨져 왔으면 빈 인자로 실행해 도구가 명확한 에러를 돌려주게 한다.
              }
              const result = await executeSophiaTool(call.function.name, args);
              messages.push({
                role: "tool",
                tool_call_id: call.id,
                content: JSON.stringify(result),
              });
            }
            continue;
          }

          full = content;
          break;
        }
      } finally {
        if (failed && !full) {
          controller.enqueue(encoder.encode(failed));
        } else {
          const finalContent = full || "…";
          await supabase
            .from("ai_messages")
            .insert({ conversation_id: conversationId, role: "assistant", content: finalContent });

          const nextTitle =
            isFirstMessage && conv.title === "New chat" ? trimmed.slice(0, 60) : conv.title;
          await supabase.from("ai_conversations").update({ title: nextTitle }).eq("id", conversationId);
        }
        controller.close();
      }
    },
    cancel() {},
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
