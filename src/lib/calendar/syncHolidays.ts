import { supabase } from "@/lib/supabaseClient";

const HOLIDAY_API_KEY = process.env.HOLIDAY_API_KEY;
if (!HOLIDAY_API_KEY) throw new Error("Missing HOLIDAY_API_KEY in environment");

export async function syncHolidaysForYear(year: number): Promise<{
  inserted: number;
  skipped: number;
}> {
  const res = await fetch(
    `https://holidayapi.com/v1/holidays?country=ID&year=${year}&key=${HOLIDAY_API_KEY}`,
  );

  if (!res.ok)
    throw new Error(`Holiday API error: ${res.status} ${res.statusText}`);

  const { holidays } = await res.json();

  if (!holidays?.length) return { inserted: 0, skipped: 0 };

  const rows = holidays.map((h: { date: string; name: string }) => ({
    date: h.date,
    name: h.name,
    year,
  }));

  const { data, error } = await supabase
    .from("indonesia_holidays")
    .upsert(rows, { onConflict: "date", ignoreDuplicates: true })
    .select();

  if (error) throw error;

  const inserted = data?.length ?? 0;
  const skipped = rows.length - inserted;

  console.log(
    `[syncHolidays] Year ${year}: ${inserted} inserted, ${skipped} already existed`,
  );

  return { inserted, skipped };
}
