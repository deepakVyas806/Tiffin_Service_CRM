import { apiError, assertAnyRole, requireUser, supabase, todayIso } from "./common";

export async function listKitchenSchedule(fromDate, toDate) {
  await requireUser();
  let query = supabase.from("kitchen_schedule").select("*").order("date");
  if (fromDate) query = query.gte("date", fromDate);
  if (toDate) query = query.lte("date", toDate);
  const { data, error } = await query;
  if (error) throw apiError(error.message, 500);
  return data || [];
}

export async function upsertKitchenSchedule(body) {
  const user = await requireUser();
  assertAnyRole(user, ["admin", "super_admin", "kitchen_manager"]);
  if (!body.date) throw apiError("Date is required");
  const row = {
    date: body.date,
    lunch_closed: !!body.lunch_closed || body.closed_meal === "lunch" || body.closed_meal === "full_day",
    dinner_closed: !!body.dinner_closed || body.closed_meal === "dinner" || body.closed_meal === "full_day",
    reason: body.reason || null,
    recurring_rule: body.recurring_rule || null,
    created_by: user.id,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("kitchen_schedule")
    .upsert(row, { onConflict: "date" })
    .select("*")
    .single();
  if (error) throw apiError(error.message, 500);
  await markClosedEntitlements(data);
  return data;
}

export async function deleteKitchenSchedule(date) {
  const user = await requireUser();
  assertAnyRole(user, ["admin", "super_admin", "kitchen_manager"]);
  const { error } = await supabase.from("kitchen_schedule").delete().eq("date", date);
  if (error) throw apiError(error.message, 500);
  return { ok: true };
}

export async function getMealAvailability(date = todayIso(), mealType = "lunch") {
  const schedule = await listKitchenSchedule(date, date);
  const day = schedule[0];
  if (!day) return { available: true, reason: null };
  const closed = mealType === "dinner" ? day.dinner_closed : day.lunch_closed;
  return { available: !closed, reason: closed ? day.reason || "Kitchen closed" : null, schedule: day };
}

async function markClosedEntitlements(schedule) {
  const updates = [];
  if (schedule.lunch_closed) updates.push("lunch");
  if (schedule.dinner_closed) updates.push("dinner");
  await Promise.all(updates.map((mealType) =>
    supabase
      .from("subscription_tracking")
      .update({ status: "kitchen_closed", status_reason: schedule.reason || "Kitchen closed", updated_at: new Date().toISOString() })
      .eq("date", schedule.date)
      .eq("meal_type", mealType)
      .eq("status", "active")
  ));
}
