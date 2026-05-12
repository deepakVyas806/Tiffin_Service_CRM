import { NavLink, useNavigate } from "react-router-dom";
import { Home, UtensilsCrossed, CalendarDays, Wallet, User, Sparkles, LogOut, ShieldCheck, Truck, ChefHat, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "../lib/auth";
import NotificationBell from "./NotificationBell";
import { motion } from "framer-motion";

const ITEMS = [
  { to: "/home", label: "Home", icon: Home, testid: "side-home" },
  { to: "/menu", label: "Weekly menu", icon: UtensilsCrossed, testid: "side-menu" },
  { to: "/calendar", label: "Subscription", icon: CalendarDays, testid: "side-calendar" },
  { to: "/plans", label: "Plans", icon: Sparkles, testid: "side-plans" },
  { to: "/wallet", label: "Wallet", icon: Wallet, testid: "side-wallet" },
  { to: "/profile", label: "Profile", icon: User, testid: "side-profile" },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => { await logout(); navigate("/"); };

  return (
    <aside
      data-testid="sidebar"
      className="hidden md:flex md:flex-col fixed left-0 top-0 bottom-0 w-72 px-6 py-8 border-r border-black/5"
      style={{ background: "var(--tf-sidebar)" }}
    >
      <div className="flex items-center gap-2 mb-12 select-none">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-display font-bold">T</div>
        <div className="font-display text-2xl font-bold tracking-tight">TiffinFlow</div>
      </div>

      <nav className="flex-1">
        <ul className="space-y-1.5">
          {ITEMS.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  data-testid={it.testid}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                      isActive ? "bg-white text-orange-600 shadow-sm" : "text-neutral-600 hover:bg-white/60"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                      <span>{it.label}</span>
                      {isActive && (
                        <motion.span layoutId="side-active" className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-orange-500" />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            );
          })}
          {user?.role === "admin" && (
            <>
              <li>
                <NavLink to="/admin" data-testid="side-admin" end className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${isActive ? "bg-white text-orange-600 shadow-sm" : "text-neutral-600 hover:bg-white/60"}`}>
                  <ShieldCheck size={18} /> <span>Admin overview</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/menu" data-testid="side-admin-menu" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${isActive ? "bg-white text-orange-600 shadow-sm" : "text-neutral-600 hover:bg-white/60"}`}>
                  <ChefHat size={18} /> <span>Manage menu</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/plans" data-testid="side-admin-plans" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${isActive ? "bg-white text-orange-600 shadow-sm" : "text-neutral-600 hover:bg-white/60"}`}>
                  <Sparkles size={18} /> <span>Manage plans</span>
                </NavLink>
              </li>
              <li>
                <NavLink to="/admin/settings" data-testid="side-admin-settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${isActive ? "bg-white text-orange-600 shadow-sm" : "text-neutral-600 hover:bg-white/60"}`}>
                  <SettingsIcon size={18} /> <span>Settings</span>
                </NavLink>
              </li>
            </>
          )}
          {(user?.role === "delivery" || user?.role === "admin") && (
            <li>
              <NavLink to="/delivery" data-testid="side-delivery" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold ${isActive ? "bg-white text-orange-600 shadow-sm" : "text-neutral-600 hover:bg-white/60"}`}>
                <Truck size={18} /> <span>Delivery</span>
              </NavLink>
            </li>
          )}
        </ul>
      </nav>

      {user && (
        <div className="mt-6">
          <div className="flex items-center justify-end mb-2 pr-1"><NotificationBell /></div>
          <div className="p-4 rounded-2xl bg-white border border-black/5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
              {user.full_name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user.full_name}</div>
              <div className="text-xs text-neutral-500 truncate">{user.email}</div>
            </div>
            <button data-testid="logout-button" onClick={handleLogout} className="p-2 rounded-full hover:bg-neutral-100">
              <LogOut size={16} className="text-neutral-500" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
