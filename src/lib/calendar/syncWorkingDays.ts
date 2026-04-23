import { supabase } from "@/lib/supabaseClient";

const PERIOD_START_DAY = 25;
const PERIOD_END_DAY = 24;

export function getPayPeriodBounds(
  year: number,
  month: number,
): { start: Date; end: Date } {
  const start = new Date(year, month - 2, PERIOD_START_DAY);
  const end = new Date(year, month - 1, PERIOD_END_DAY);
  return { start, end };
}

function toDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function syncWorkingDays(
  year: number,
  month: number,
): Promise<{
  working_days_raw: number;
  red_days: number;
  working_days: number;
}> {
  const { start, end } = getPayPeriodBounds(year, month);

  const startStr = toDateStr(start);
  const endStr = toDateStr(end);

  const { data: holidayRows, error } = await supabase
    .from("indonesia_holidays")
    .select("date")
    .gte("date", startStr)
    .lte("date", endStr);

  if (error) throw error;

  const holidaySet = new Set(holidayRows?.map((h) => h.date) ?? []);

  let weekdays = 0;
  let red_days = 0;

  const current = new Date(start);

  while (current <= end) {
    const day = current.getDay();
    const dateStr = toDateStr(current);
    const isWeekday = day !== 0 && day !== 6;

    if (isWeekday) {
      if (holidaySet.has(dateStr)) {
        red_days++;
      } else {
        weekdays++;
      }
    }

    current.setDate(current.getDate() + 1);
  }

  const working_days_raw = weekdays + red_days;
  const working_days = weekdays;

  return { working_days_raw, red_days, working_days };
}
