import { syncHolidaysForYear } from '@/lib/calendar/syncHolidays'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const year = Number(req.nextUrl.searchParams.get('year') ?? new Date().getFullYear())

  if (isNaN(year)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
  }

  const result = await syncHolidaysForYear(year)
  return NextResponse.json({ year, ...result })
}
