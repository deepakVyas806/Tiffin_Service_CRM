import { apiError, newId, nowIso, requireUser, supabase } from "./common";

export async function createNotification(userId, title, body, kind = "info", extra = {}) {
  const notification = {
    id: newId(),
    user_id: userId,
    title,
    body,
    kind,
    data: extra,
    read: false,
    created_at: nowIso(),
  };
  await supabase.from("notifications").insert(notification);
  return notification;
}

export async function listNotifications() {
  const user = await requireUser();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw apiError(error.message, 500);
  const items = data || [];
  return { items, unread: items.filter((item) => !item.read).length };
}

export async function markNotificationRead(notificationId) {
  const user = await requireUser();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  return { ok: true };
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("user_id", user.id)
    .eq("read", false);
  return { ok: true };
}
