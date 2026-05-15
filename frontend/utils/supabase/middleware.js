import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const ADMIN_PREFIXES = ["/admin"];
const CUSTOMER_PREFIXES = ["/home", "/menu", "/calendar", "/wallet", "/profile", "/plans", "/checkout", "/payment"];
const ADMIN_ROLES = ["admin", "super_admin", "kitchen_manager", "customer_support"];
const DELIVERY_ROLES = ["delivery", "delivery_staff", "admin", "super_admin"];

function landingPath(role) {
  if (ADMIN_ROLES.includes(role)) return "/admin";
  if (DELIVERY_ROLES.includes(role)) return "/delivery";
  return "/home";
}

function isProtectedPath(pathname) {
  return pathname === "/delivery" ||
    ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    CUSTOMER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request) {
  const pathname = request.nextUrl.pathname;
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData?.user;

  if (!authUser && isProtectedPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authUser && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();
    const url = request.nextUrl.clone();
    url.pathname = landingPath(profile?.role);
    return NextResponse.redirect(url);
  }

  if (authUser && isProtectedPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authUser.id)
      .maybeSingle();
    const role = profile?.role || "customer";
    const isAdminPath = ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isCustomerPath = CUSTOMER_PREFIXES.some((prefix) => pathname.startsWith(prefix));
    const isDeliveryPath = pathname === "/delivery";

    if (isAdminPath && !ADMIN_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = landingPath(role);
      return NextResponse.redirect(url);
    }
    if (isCustomerPath && role !== "customer") {
      const url = request.nextUrl.clone();
      url.pathname = landingPath(role);
      return NextResponse.redirect(url);
    }
    if (isDeliveryPath && !DELIVERY_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = landingPath(role);
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
