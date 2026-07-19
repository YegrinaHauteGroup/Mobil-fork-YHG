"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

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
