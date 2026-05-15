import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../lib/auth";
import { adminNav, customerNav, hasPermission, isAdminRole, isCustomerRole } from "../config/permissions";

export default function BottomNav() {
  const location = useLocation();
  const { user } = useAuth();
  const tabs = (isAdminRole(user?.role) ? adminNav : isCustomerRole(user?.role) ? customerNav : [])
    .filter((tab) => hasPermission(user, tab.permission))
    .slice(0, 5);
  if (tabs.length === 0) return null;

  return (
    <nav
      data-testid="bottom-nav"
      className="md:hidden fixed bottom-3 left-3 right-3 z-50 tf-glass rounded-full border shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
    >
      <ul className="flex items-center justify-between px-2 py-1.5">
        {tabs.map((tab) => {
          const active = location.pathname.startsWith(tab.to);
          const Icon = tab.icon;
          return (
            <li key={tab.to} className="flex-1">
              <NavLink
                to={tab.to}
                data-testid={tab.testid}
                className="relative flex flex-col items-center justify-center py-2 rounded-full"
              >
                {active && (
                  <motion.span
                    layoutId="active-tab"
                    className="absolute inset-1 bg-orange-50 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10 flex flex-col items-center">
                  <Icon
                    size={20}
                    className={active ? "text-orange-600" : "text-neutral-500"}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  <span className={`text-[10px] mt-0.5 font-semibold ${active ? "text-orange-600" : "text-neutral-500"}`}>
                    {tab.mobileLabel || tab.label}
                  </span>
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
