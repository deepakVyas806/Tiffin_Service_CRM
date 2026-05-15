import { NavLink, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../lib/auth";
import { motion } from "framer-motion";
import { adminNav, customerNav, deliveryNav, hasPermission, isAdminRole, isCustomerRole } from "../config/permissions";

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };
  const items = [
    ...(isCustomerRole(user?.role) ? customerNav : []),
    ...(isAdminRole(user?.role) ? adminNav : []),
    ...((user?.role === "delivery" || user?.role === "delivery_staff") ? deliveryNav : []),
  ].filter((item) => hasPermission(user, item.permission));

  return (
    <aside
      data-testid="sidebar"
      className="hidden md:flex md:flex-col fixed left-0 top-0 bottom-0 w-72 px-6 py-8 border-r border-black/5 overflow-hidden"
      style={{ background: "var(--tf-sidebar)" }}
    >
      <div className="flex items-center gap-2 mb-6 select-none shrink-0">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white font-display font-bold">T</div>
        <div className="font-display text-2xl font-bold tracking-tight">TiffinFlow</div>
      </div>

      <nav className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        <ul className="space-y-1.5">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  data-testid={it.testid}
                  end={it.end}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
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
        </ul>
      </nav>

      {user && (
        <div className="mt-3 shrink-0">
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
