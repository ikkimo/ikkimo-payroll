import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { computeRow, blankInput, type EmployeeForPayroll, type EmployeeInput } from "@/lib/exports/payrollRow";
import { buildPayrollSpreadsheet } from "@/lib/exports/spreadsheet";
import type { PayrollSettingsRow } from "@/components/settings/types";

const EMPLOYEE_SELECT =
  "uuid, internal_no, employee_code, preferred_name, employee_name, department, start_date, active, probation, basic, fingerprint_id, skill_grade_id, position_id, gets_bpjs_jp, thr_preference, cash_loan_balance_idr, housing_allowance_idr, gets_meal_allowance, bank, bank_account, bank_account_name, seniority_grades(id, grade, increase_monthly_idr), skill_grades(id, position_id, level, increase_monthly_idr), positions(id, name, allowance_idr)";

const ENTRY_SELECT =
  "employee_uuid, full_days_worked, excused_full_days, excused_half_days, unexcused_full_days, unexcused_half_days, late_minutes_count, loan_repayment_idr, new_loan_idr, overtime_hours_1, overtime_hours_2, overtime_hours_3, other_adjustment_idr, other_adjustment_note";

/**
 * GET /api/exports/spreadsheet?period_id=...
 *
 * Returns the full payroll spreadsheet (.xlsx) for a locked period: one row
 * per employee with every computed pay field, plus a totals row.
 *
 * Only locked (submitted) periods can be exported — draft data shouldn't be
 * treated as a final record. This mirrors the RLS policies on
 * payroll_entries, which already gate writes on `locked`.
 */
export async function GET(req: NextRequest) {
  const periodId = req.nextUrl.searchParams.get("period_id");
  if (!periodId) {
    return NextResponse.json({ error: "period_id is required" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdmin();

  const periodRes = await supabaseAdmin
    .from("payroll_periods")
    .select("id, year, month, working_days, locked")
    .eq("id", periodId)
    .maybeSingle();

  if (periodRes.error || !periodRes.data) {
    return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
  }
  const period = periodRes.data;

  if (!period.locked) {
    return NextResponse.json(
      { error: "This period has not been submitted yet. Submit and lock it before exporting." },
      { status: 409 },
    );
  }

  const [settingsRes, employeesRes, entriesRes] = await Promise.all([
    supabaseAdmin.from("payroll_settings").select("*").limit(1).maybeSingle(),
    supabaseAdmin.from("employees").select(EMPLOYEE_SELECT).order("internal_no", { ascending: true }),
    supabaseAdmin.from("payroll_entries").select(ENTRY_SELECT).eq("period_id", periodId),
  ]);

  if (settingsRes.error || !settingsRes.data) {
    return NextResponse.json({ error: "Payroll settings not found" }, { status: 500 });
  }
  if (employeesRes.error) {
    return NextResponse.json({ error: employeesRes.error.message }, { status: 500 });
  }
  if (entriesRes.error) {
    return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });
  }

  const settings = settingsRes.data as unknown as PayrollSettingsRow;
  const employees = (employeesRes.data ?? []) as unknown as EmployeeForPayroll[];
  const entries = entriesRes.data ?? [];

  const entryByEmployee = new Map<string, EmployeeInput>();
  for (const e of entries) {
    entryByEmployee.set(e.employee_uuid, {
      full_days_worked: e.full_days_worked ?? period.working_days ?? 0,
      excused_full_days: e.excused_full_days ?? 0,
      excused_half_days: e.excused_half_days ?? 0,
      unexcused_full_days: e.unexcused_full_days ?? 0,
      unexcused_half_days: e.unexcused_half_days ?? 0,
      late_minutes_count: e.late_minutes_count ?? 0,
      loan_repayment: e.loan_repayment_idr ?? 0,
      new_loan: e.new_loan_idr ?? 0,
      overtime_hours_1: e.overtime_hours_1 ?? 0,
      overtime_hours_2: e.overtime_hours_2 ?? 0,
      overtime_hours_3: e.overtime_hours_3 ?? 0,
      other_adjustment_idr: e.other_adjustment_idr ?? 0,
      other_adjustment_note: e.other_adjustment_note ?? "",
    });
  }

  const periodDays = period.working_days ?? settings.standard_working_days ?? 21;

  const rows = employees.map((emp) =>
    computeRow(emp, entryByEmployee.get(emp.uuid) ?? blankInput(periodDays), settings, periodDays),
  );

  const wb = await buildPayrollSpreadsheet(rows, period.year, period.month);
  const buffer = await wb.xlsx.writeBuffer();

  const filename = `payroll_${period.year}_${String(period.month).padStart(2, "0")}.xlsx`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
