import { useEffect, useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "./ui/drawer";
import { subscribeToPush } from "../lib/push";
import { useNavigate } from "react-router-dom";

export default function NotificationBell({ compact = false }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch (_) {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  const openDrawer = async () => {
    setOpen(true);
    if (unread > 0) {
      try { await api.post("/notifications/read-all"); } catch (_) {}
      setUnread(0);
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    }
  };

  const tapItem = (n) => {
    setOpen(false);
    if (n.data?.order_id) navigate(`/track/${n.data.order_id}`);
  };

  const enablePush = async () => {
    const ok = await subscribeToPush();
    if (ok) load();
  };

  return (
    <>
      <button
        data-testid="notification-bell"
        onClick={openDrawer}
        className={`relative ${compact ? "h-9 w-9 rounded-full bg-white border border-black/5" : "h-10 w-10 rounded-full hover:bg-neutral-100"} flex items-center justify-center transition`}
      >
        {unread > 0 ? <BellRing size={16} className="text-orange-600" /> : <Bell size={16} className="text-neutral-700" />}
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-orange-600 text-white text-[9px] font-bold flex items-center justify-center"
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-white">
          <DrawerTitle className="sr-only">Notifications</DrawerTitle>
          <DrawerDescription className="sr-only">Your recent app activity.</DrawerDescription>
          <div className="p-6 pb-10 max-w-xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold">Notifications</h2>
              <button data-testid="enable-push" onClick={enablePush} className="text-xs font-semibold text-orange-600">Enable push</button>
            </div>
            {items.length === 0 ? (
              <div className="text-center py-12 text-sm text-neutral-500">No notifications yet</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto tf-no-scrollbar">
                {items.map((n) => (
                  <button key={n.id} data-testid={`notif-${n.id}`} onClick={() => tapItem(n)} className="w-full text-left tf-card p-4 hover:bg-neutral-50 transition">
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${n.kind === "success" ? "bg-green-50 text-green-600" : n.kind === "delivery" ? "bg-orange-50 text-orange-600" : "bg-neutral-100 text-neutral-600"}`}>
                        <Bell size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold">{n.title}</div>
                        <div className="text-xs text-neutral-500 mt-0.5">{n.body}</div>
                        <div className="text-[10px] text-neutral-400 mt-1.5">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-orange-500 mt-2 flex-shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
