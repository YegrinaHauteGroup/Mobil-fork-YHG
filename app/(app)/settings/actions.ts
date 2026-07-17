"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error: string } | { ok: true } | null;

export async function updateDisplayName(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const name = String(formData.get("display_name") || "").trim();
  if (name.length > 80) return { error: "Name is too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name || null })
    .eq("id", user.id);

  if (error) return { error: "Failed to save." };
  revalidatePath("/", "layout");
  return { ok: true };
}
