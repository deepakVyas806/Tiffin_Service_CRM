import { api } from "./api";

// urlBase64ToUint8Array
function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js");
    return reg;
  } catch (e) {
    console.warn("SW register failed", e);
    return null;
  }
}

export async function subscribeToPush() {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      await api.post("/push/subscribe", { subscription: existing.toJSON() });
      return true;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return false;
    const { data } = await api.get("/push/vapid-public");
    if (!data?.public_key) return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(data.public_key),
    });
    await api.post("/push/subscribe", { subscription: sub.toJSON() });
    return true;
  } catch (e) {
    console.warn("Push subscribe failed", e);
    return false;
  }
}
