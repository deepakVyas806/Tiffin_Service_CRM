import {
  BarChart3,
  Bell,
  CalendarDays,
  ChefHat,
  CreditCard,
  Home,
  Settings,
  ShoppingBag,
  Sparkles,
  Truck,
  User,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

export const ROLES = {
  CUSTOMER: "customer",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
  KITCHEN_MANAGER: "kitchen_manager",
  DELIVERY_STAFF: "delivery_staff",
  DELIVERY: "delivery",
  CUSTOMER_SUPPORT: "customer_support",
};

export const ROLE_PERMISSIONS = {
  [ROLES.CUSTOMER]: ["customer:access"],
  [ROLES.ADMIN]: ["admin:access", "admin:dashboard", "orders:manage", "subscriptions:manage", "kitchen:manage", "meals:manage", "customers:manage", "payments:manage", "delivery:manage", "analytics:read", "notifications:manage", "settings:manage"],
  [ROLES.SUPER_ADMIN]: ["admin:access", "admin:dashboard", "orders:manage", "subscriptions:manage", "kitchen:manage", "meals:manage", "customers:manage", "payments:manage", "delivery:manage", "analytics:read", "notifications:manage", "settings:manage"],
  [ROLES.KITCHEN_MANAGER]: ["admin:access", "orders:manage", "kitchen:manage", "meals:manage"],
  [ROLES.DELIVERY_STAFF]: ["delivery:manage"],
  [ROLES.DELIVERY]: ["delivery:manage"],
  [ROLES.CUSTOMER_SUPPORT]: ["admin:access", "orders:manage", "subscriptions:manage", "customers:manage", "notifications:manage"],
};

export const ADMIN_ROLES = [
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN,
  ROLES.KITCHEN_MANAGER,
  ROLES.CUSTOMER_SUPPORT,
];

export const DELIVERY_ROLES = [ROLES.DELIVERY, ROLES.DELIVERY_STAFF, ROLES.ADMIN, ROLES.SUPER_ADMIN];

export function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(user, permission) {
  if (!permission) return true;
  return permissionsForRole(user?.role).includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(role);
}

export function isCustomerRole(role) {
  return role === ROLES.CUSTOMER;
}

export function landingPathForRole(role) {
  if (isAdminRole(role)) return "/admin";
  if (DELIVERY_ROLES.includes(role)) return "/delivery";
  return "/home";
}

export const customerNav = [
  { to: "/home", label: "Home", icon: Home, testid: "side-home", permission: "customer:access" },
  { to: "/menu", label: "Weekly menu", icon: UtensilsCrossed, testid: "side-menu", permission: "customer:access" },
  { to: "/calendar", label: "Subscription", icon: CalendarDays, testid: "side-calendar", permission: "customer:access" },
  { to: "/plans", label: "Plans", icon: Sparkles, testid: "side-plans", permission: "customer:access" },
  { to: "/wallet", label: "Wallet", icon: Wallet, testid: "side-wallet", permission: "customer:access" },
  { to: "/profile", label: "Profile", icon: User, testid: "side-profile", permission: "customer:access" },
];

export const adminNav = [
  { to: "/admin", label: "Dashboard", icon: BarChart3, testid: "side-admin", permission: "admin:dashboard", end: true, mobilePrimary: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag, testid: "side-admin-orders", permission: "orders:manage" },
  { to: "/admin/subscriptions", label: "Subscriptions", mobileLabel: "Subs", icon: Sparkles, testid: "side-admin-subscriptions", permission: "subscriptions:manage", mobilePrimary: true },
  { to: "/admin/kitchen-schedule", label: "Kitchen Schedule", mobileLabel: "Schedule", icon: CalendarDays, testid: "side-admin-kitchen", permission: "kitchen:manage", mobilePrimary: true },
  { to: "/admin/menu", label: "Meal Management", mobileLabel: "Meals", icon: ChefHat, testid: "side-admin-menu", permission: "meals:manage", mobilePrimary: true },
  { to: "/admin/customers", label: "Customers", icon: Users, testid: "side-admin-customers", permission: "customers:manage" },
  { to: "/admin/payments", label: "Payments", icon: CreditCard, testid: "side-admin-payments", permission: "payments:manage" },
  { to: "/admin/delivery", label: "Delivery Tracking", mobileLabel: "Delivery", icon: Truck, testid: "side-admin-delivery", permission: "delivery:manage", mobilePrimary: true },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3, testid: "side-admin-analytics", permission: "analytics:read" },
  { to: "/admin/notifications", label: "Notifications", icon: Bell, testid: "side-admin-notifications", permission: "notifications:manage" },
  { to: "/admin/settings", label: "Settings", icon: Settings, testid: "side-admin-settings", permission: "settings:manage" },
];

export const deliveryNav = [
  { to: "/delivery", label: "Delivery", icon: Truck, testid: "side-delivery", permission: "delivery:manage" },
];
