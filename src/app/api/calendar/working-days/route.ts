// app/api/holidays/working-days/route.ts
import { syncWorkingDays } from "@/lib/calendar/syncWorkingDays";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const yearParam = req.nextUrl.searchParams.get("year");
  const monthParam = req.nextUrl.searchParams.get("month");

  if (!yearParam || !monthParam) {
    return NextResponse.json(
      { error: "Missing year or month param" },
      { status: 400 },
    );
  }

  const year = Number(yearParam);
  const month = Number(monthParam);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Invalid year or month" },
      { status: 400 },
    );
  }

  const result = await syncWorkingDays(year, month);
  return NextResponse.json({ year, month, ...result });
}
