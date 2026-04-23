import { syncWorkingDays } from "@/lib/calendar/syncWorkingDays";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";

// run this to get it to sync to the pay periods for a whole year (need the holidays to be in place)
// http://localhost:3000/api/calendar/sync-periods?year=2026
export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const year = Number(yearParam ?? new Date().getFullYear());

  if (isNaN(year)) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const results = [];

  for (let month = 1; month <= 12; month++) {
    const { data: period, error: periodError } = await supabaseAdmin
      .from("payroll_periods")
      .select("id")
      .eq("year", year)
      .eq("month", month)
      .single();

    if (periodError || !period) {
      results.push({ month, status: "skipped — period does not exist" });
      continue;
    }

    const { red_days, working_days } = await syncWorkingDays(year, month);

    const { error } = await supabaseAdmin
      .from("payroll_periods")
      .update({ working_days, red_days })
      .eq("id", period.id);

    if (error) {
      results.push({ month, status: "error", error: error.message });
    } else {
      results.push({ month, status: "updated", working_days, red_days });
    }
  }

  return NextResponse.json({ year, results });
}
