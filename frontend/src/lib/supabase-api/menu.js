import { apiError, assertRole, requireUser, supabase, todayIso } from "./common";

export async function getWeekMenu() {
  await requireUser();
  const date = new Date();
  const monday = new Date(date);
  monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return d.toISOString().slice(0, 10);
  });

  const { data, error } = await supabase
    .from("daily_menu")
    .select("*")
    .in("date", days);
  if (error) throw apiError(error.message, 500);
  const { data: schedule, error: scheduleError } = await supabase
    .from("kitchen_schedule")
    .select("*")
    .in("date", days);
  if (scheduleError) throw apiError(scheduleError.message, 500);

  const byDate = new Map((data || []).map((item) => [item.date, item]));
  const scheduleByDate = new Map((schedule || []).map((item) => [item.date, item]));
  return days.map((day) => ({
    ...(byDate.get(day) || {
    date: day,
    main_dish: "Menu coming soon",
    sides: [],
    nutrition: {},
    is_special: false,
    image_url: null,
    tags: [],
    }),
    kitchen_schedule: scheduleByDate.get(day) || null,
  }));
}

export async function getTodayMenu() {
  await requireUser();
  const { data, error } = await supabase
    .from("daily_menu")
    .select("*")
    .eq("date", todayIso())
    .maybeSingle();

  if (error) throw apiError(error.message, 500);
  const { data: schedule } = await supabase
    .from("kitchen_schedule")
    .select("*")
    .eq("date", todayIso())
    .maybeSingle();
  return {
    ...(data || {
    date: todayIso(),
    main_dish: "Chef's special tiffin",
    sides: ["Rice", "Dal"],
    nutrition: { calories: 650 },
    is_special: false,
    image_url: null,
    tags: ["veg"],
    }),
    kitchen_schedule: schedule || null,
  };
}

export async function listAdminMenu() {
  const user = await requireUser();
  assertRole(user, "admin");
  const { data, error } = await supabase.from("daily_menu").select("*").order("date");
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function upsertMenu(body) {
  const user = await requireUser();
  assertRole(user, "admin");
  const { data, error } = await supabase
    .from("daily_menu")
    .upsert(body)
    .select("*")
    .single();
  if (error) throw apiError(error.message, 500);
  return data;
}

export async function deleteMenu(menuDate) {
  const user = await requireUser();
  assertRole(user, "admin");
  await supabase.from("daily_menu").delete().eq("date", menuDate);
  return { ok: true };
}
