import { apiError, requireUser, supabase } from "./common";

export async function getCurrentProfile() {
  return requireUser();
}

export async function updateProfile(body) {
  const user = await requireUser();
  const updates = { ...body };
  if (body.dietary_tags !== undefined || body.address_summary !== undefined) {
    updates.onboarded = true;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select("*")
    .single();
  if (error) throw apiError(error.message, 500);
  return data;
}
