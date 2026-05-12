import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Home, UtensilsCrossed, CalendarDays, Wallet, User } from "lucide-react";

const TABS = [
  { to: "/home", label: "Home", icon: Home, testid: "tab-home" },
  { to: "/menu", label: "Menu", icon: UtensilsCrossed, testid: "tab-menu" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "tab-calendar" },
  { to: "/wallet", label: "Wallet", icon: Wallet, testid: "tab-wallet" },
  { to: "/profile", label: "Profile", icon: User, testid: "tab-profile" },
];

export default function BottomNav() {
  const location = useLocation();
  return (
    <nav
      data-testid="bottom-nav"
      className="md:hidden fixed bottom-3 left-3 right-3 z-50 tf-glass rounded-full border shadow-[0_10px_40px_rgba(0,0,0,0.08)]"
    >
      <ul className="flex items-center justify-between px-2 py-1.5">
        {TABS.map((tab) => {
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
                    {tab.label}
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
