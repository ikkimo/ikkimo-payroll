import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { computeRow, blankInput, type EmployeeForPayroll, type EmployeeInput } from "@/lib/exports/payrollRow";
import { buildSinglePayslipWorkbook, type CompanyInfo } from "@/lib/exports/payslipExcel";
import { renderPayslipPdfBuffer } from "@/lib/exports/payslipPdf";
import type { PayrollSettingsRow } from "@/components/settings/types";

const EMPLOYEE_SELECT =
  "uuid, internal_no, employee_code, preferred_name, employee_name, department, start_date, active, probation, basic, fingerprint_id, skill_grade_id, position_id, gets_bpjs_jp, thr_preference, cash_loan_balance_idr, housing_allowance_idr, gets_meal_allowance, bank, bank_account, bank_account_name, seniority_grades(id, grade, increase_monthly_idr), skill_grades(id, position_id, level, increase_monthly_idr), positions(id, name, allowance_idr)";

const ENTRY_SELECT =
  "employee_uuid, full_days_worked, excused_full_days, excused_half_days, unexcused_full_days, unexcused_half_days, late_minutes_count, loan_repayment_idr, new_loan_idr, overtime_hours_1, overtime_hours_2, overtime_hours_3, other_adjustment_idr, other_adjustment_note";

// Company branding for the payslip header. Swap via env vars whenever the
// real letterhead/logo is finalized — no code change needed.
const COMPANY: CompanyInfo = {
  name: process.env.PAYSLIP_COMPANY_NAME ?? "PT Luma Tamu Rumah",
  logoPngBase64: process.env.PAYSLIP_LOGO_BASE64 ?? null,
};

function safeFileSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * POST /api/exports/payslips
 * Body: { period_id: string, employee_uuids?: string[] }
 *
 * Returns a zip containing payslip_<code>.xlsx and payslip_<code>.pdf for
 * each requested employee (or all employees in the period if
 * employee_uuids is omitted). Only works for locked periods.
 */
export async function POST(req: NextRequest) {
  let body: { period_id?: string; employee_uuids?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { period_id, employee_uuids } = body;
  if (!period_id) {
    return NextResponse.json({ error: "period_id is required" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdmin();

  const periodRes = await supabaseAdmin
    .from("payroll_periods")
    .select("id, year, month, working_days, locked")
    .eq("id", period_id)
    .maybeSingle();

  if (periodRes.error || !periodRes.data) {
    return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
  }
  const period = periodRes.data;

  if (!period.locked) {
    return NextResponse.json(
      { error: "This period has not been submitted yet. Submit and lock it before generating payslips." },
      { status: 409 },
    );
  }

  let employeeQuery = supabaseAdmin.from("employees").select(EMPLOYEE_SELECT);
  if (employee_uuids && employee_uuids.length > 0) {
    employeeQuery = employeeQuery.in("uuid", employee_uuids);
  }

  const [settingsRes, employeesRes, entriesRes] = await Promise.all([
    supabaseAdmin.from("payroll_settings").select("*").limit(1).maybeSingle(),
    employeeQuery,
    supabaseAdmin.from("payroll_entries").select(ENTRY_SELECT).eq("period_id", period_id),
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

  if (employees.length === 0) {
    return NextResponse.json({ error: "No employees found for this selection" }, { status: 404 });
  }

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
  const payslipDate = new Date();
  const logoDataUri = COMPANY.logoPngBase64 ? `data:image/png;base64,${COMPANY.logoPngBase64}` : null;

  const zip = new JSZip();

  for (const emp of employees) {
    const input = entryByEmployee.get(emp.uuid) ?? blankInput(periodDays);
    const row = computeRow(emp, input, settings, periodDays);

    const wb = await buildSinglePayslipWorkbook(row, {
      company: COMPANY,
      year: period.year,
      month: period.month,
      payslipDate,
    });
    const xlsxBuffer = await wb.xlsx.writeBuffer();

    const pdfBuffer = await renderPayslipPdfBuffer({
      row,
      company: COMPANY,
      year: period.year,
      month: period.month,
      payslipDate,
      logoDataUri,
    });

    const codeSafe = safeFileSegment(emp.employee_code || emp.uuid);
    zip.file(`payslip_${codeSafe}.xlsx`, xlsxBuffer as Buffer);
    zip.file(`payslip_${codeSafe}.pdf`, pdfBuffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const filename = `payslips_${period.year}_${String(period.month).padStart(2, "0")}.zip`;

  return new NextResponse(zipBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
