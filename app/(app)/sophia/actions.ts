"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const NVIDIA_MODEL = "meta/llama-3.3-70b-instruct";

const SYSTEM_PROMPT =
  "You are Sophia, the AI assistant built into Mobil (a personal workspace for documents, code, sheets, files and mind maps). Be helpful, concise, and clear.";

export type ConversationRow = { id: string; title: string; updated_at: string };
export type MessageRow = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function listConversations(): Promise<ConversationRow[]> {
  const { userId } = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_conversations")
    .select("id, title, updated_at")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function createConversation(): Promise<
  ConversationRow | { error: string }
> {
  const { userId } = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ owner_id: userId })
    .select("id, title, updated_at")
    .single();
  if (error || !data) return { error: "Failed to start a new chat." };
  return data;
}

export async function getMessages(conversationId: string): Promise<MessageRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function deleteConversation(
  conversationId: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", conversationId);
  if (error) return { error: "Failed to delete chat." };
  return { ok: true };
}

/** 사용자 메시지를 저장하고, NVIDIA(Llama 3.3 70B)에 물어 답변을 받아 저장한다. */
export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ reply: string } | { error: string }> {
  const trimmed = content.trim();
  if (!trimmed) return { error: "Message is empty." };

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return { error: "Sophia isn't configured yet (missing NVIDIA_API_KEY)." };
  }

  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id, title")
    .eq("id", conversationId)
    .single();
  if (!conv) return { error: "Conversation not found." };

  const { error: userInsertErr } = await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "user", content: trimmed });
  if (userInsertErr) return { error: "Failed to save message." };

  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
  ];

  let reply: string;
  try {
    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("[sophia] NVIDIA API error", res.status, text);
      return { error: `Sophia is unavailable right now (${res.status}).` };
    }

    const json = await res.json();
    reply = (json?.choices?.[0]?.message?.content ?? "").trim() || "…";
  } catch (e) {
    console.error("[sophia] NVIDIA API request failed", e);
    return { error: "Sophia is unavailable right now." };
  }

  await supabase
    .from("ai_messages")
    .insert({ conversation_id: conversationId, role: "assistant", content: reply });

  // 첫 메시지면 대화 제목을 자동으로 붙인다(항상 title 을 넣어야 updated_at
  // 트리거가 확실히 갱신되어 목록이 최신순으로 재정렬된다).
  const isFirstMessage = (history ?? []).length <= 1;
  const nextTitle =
    isFirstMessage && conv.title === "New chat" ? trimmed.slice(0, 60) : conv.title;
  await supabase
    .from("ai_conversations")
    .update({ title: nextTitle })
    .eq("id", conversationId);

  return { reply };
}
