"use server";

import { createClient } from "@/lib/supabase/server";

export type SettingsState = { error: string } | { ok: true } | null;

/** 필수 입력 검증: 모든 프로필 필드는 빈칸을 허용하지 않는다(공개 여부와는 별개). */
export async function updateProfile(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const displayName = String(formData.get("display_name") || "").trim();
  const gender = String(formData.get("gender") || "").trim();
  const bio = String(formData.get("bio") || "").trim();
  const ageRaw = String(formData.get("age") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const agePublic = formData.get("age_public") === "on";
  const addressPublic = formData.get("address_public") === "on";
  const phonePublic = formData.get("phone_public") === "on";

  if (!displayName || !gender || !bio || !ageRaw || !address || !phone) {
    return { error: "All fields are required — none can be left blank." };
  }
  if (displayName.length > 80) return { error: "Name is too long." };
  if (gender.length > 40) return { error: "Gender is too long." };
  if (bio.length > 500) return { error: "Bio is too long (max 500 characters)." };
  if (address.length > 300) return { error: "Address is too long." };
  if (phone.length > 40) return { error: "Phone number is too long." };

  const age = Number(ageRaw);
  if (!Number.isInteger(age) || age < 0 || age > 150) {
    return { error: "Enter a valid age (0–150)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      gender,
      bio,
      age,
      address,
      phone,
      age_public: agePublic,
      address_public: addressPublic,
      phone_public: phonePublic,
    })
    .eq("id", user.id);

  if (error) return { error: "Failed to save." };
  return { ok: true };
}

export async function setAvatarUrl(
  url: string
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Authentication required." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { error: "Failed to save avatar." };
  return { ok: true };
}
