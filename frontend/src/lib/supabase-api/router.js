import { supabase, apiError, getSettings } from "./common";
import { getAdminSettings, getAdminStats, listAdminOrders, listAdminUsers, updateAdminSettings } from "./admin";
import { listAssignedOrders, updateDeliveryStatus } from "./delivery";
import { deleteMenu, getTodayMenu, getWeekMenu, listAdminMenu, upsertMenu } from "./menu";
import { markAllNotificationsRead, markNotificationRead, listNotifications } from "./notifications";
import { createOrder, getOrder, listMyOrders, trackOrder } from "./orders";
import { createPlan, deletePlan, listAdminPlans, listPlans, upsertPlan } from "./plans";
import { fulfillPayment } from "./payments";
import { getCurrentProfile, updateProfile } from "./profile";
import { getActiveSubscription, listMySubscriptions, setSubscriptionPaused, subscribe } from "./subscriptions";
import { getWalletBalance, listWalletTransactions, rechargeWallet } from "./wallet";

export async function handleGet(path) {
  if (path === "/auth/me") return getCurrentProfile();
  if (path === "/menu/week") return getWeekMenu();
  if (path === "/menu/today") return getTodayMenu();
  if (path === "/plans") return listPlans();
  if (path === "/subscriptions/mine") return listMySubscriptions();
  if (path === "/subscriptions/active") return getActiveSubscription();
  if (path === "/orders/mine") return listMyOrders();
  if (path.startsWith("/orders/") && path.endsWith("/track")) return trackOrder(path.split("/")[2]);
  if (path.startsWith("/orders/")) return getOrder(path.split("/")[2]);
  if (path === "/wallet/balance") return getWalletBalance();
  if (path === "/wallet/transactions") return listWalletTransactions();
  if (path.startsWith("/payments/status/")) return fulfillPayment(path.split("/").pop());
  if (path === "/delivery/assigned") return listAssignedOrders();
  if (path === "/admin/stats") return getAdminStats();
  if (path === "/admin/users") return listAdminUsers();
  if (path === "/admin/orders") return listAdminOrders();
  if (path === "/admin/menu") return listAdminMenu();
  if (path === "/admin/plans") return listAdminPlans();
  if (path === "/settings/public") return getSettings();
  if (path === "/admin/settings") return getAdminSettings();
  if (path === "/notifications") return listNotifications();
  if (path === "/push/vapid-public") return { public_key: null };
  throw apiError(`Unsupported endpoint: ${path}`, 404);
}

export async function handlePost(path, body = {}) {
  if (path === "/auth/logout") {
    await supabase.auth.signOut();
    return { ok: true };
  }
  if (path === "/subscriptions/subscribe") return subscribe(body);
  if (path === "/subscriptions/pause") return setSubscriptionPaused(body.subscription_id, body.date, true);
  if (path === "/subscriptions/resume") return setSubscriptionPaused(body.subscription_id, body.date, false);
  if (path === "/orders/create") return createOrder(body);
  if (path === "/wallet/recharge") return rechargeWallet(body);
  if (path === "/delivery/update") return updateDeliveryStatus(body);
  if (path === "/admin/menu") return upsertMenu(body);
  if (path === "/admin/plans") return createPlan(body);
  if (path === "/notifications/read-all") return markAllNotificationsRead();
  if (path.startsWith("/notifications/") && path.endsWith("/read")) return markNotificationRead(path.split("/")[2]);
  if (path === "/push/subscribe") return { ok: true };
  throw apiError(`Unsupported endpoint: ${path}`, 404);
}

export async function handlePatch(path, body = {}) {
  if (path === "/auth/profile") return updateProfile(body);
  throw apiError(`Unsupported endpoint: ${path}`, 404);
}

export async function handlePut(path, body = {}) {
  if (path.startsWith("/admin/menu/")) {
    return upsertMenu({ ...body, date: decodeURIComponent(path.split("/").pop()) });
  }
  if (path.startsWith("/admin/plans/")) return upsertPlan(path.split("/").pop(), body);
  if (path === "/admin/settings") return updateAdminSettings(body);
  throw apiError(`Unsupported endpoint: ${path}`, 404);
}

export async function handleDelete(path) {
  if (path.startsWith("/admin/menu/")) return deleteMenu(decodeURIComponent(path.split("/").pop()));
  if (path.startsWith("/admin/plans/")) return deletePlan(path.split("/").pop());
  throw apiError(`Unsupported endpoint: ${path}`, 404);
}
