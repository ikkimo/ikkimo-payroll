import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabaseAdmin";
import { buildPayrollSpreadsheet } from "@/lib/exports/spreadsheet";
import { buildSinglePayslipWorkbook, type CompanyInfo } from "@/lib/exports/payslipExcel";
import { renderPayslipPdfBuffer } from "@/lib/exports/payslipPdf";
import type { ExportRow, StoredPayrollEntry, EmployeeForExport } from "@/lib/exports/types";

const BUCKET = "payroll-exports";

const ENTRY_SELECT = [
  "employee_uuid",
  "full_days_worked", "excused_full_days", "excused_half_days",
  "unexcused_full_days", "unexcused_half_days", "late_minutes_count",
  "loan_repayment_idr", "new_loan_idr",
  "overtime_hours_1", "overtime_hours_2", "overtime_hours_3",
  "other_adjustment_idr", "other_adjustment_note", "salary_to_pay",
  "main_salary_idr", "position_allowance_idr", "skill_grade_increase_idr",
  "housing_allowance_idr", "meal_allowance_idr", "meal_eligible_days",
  "attendance_reward_idr", "overtime_pay_idr",
  "unexcused_deduction_idr", "lateness_deduction_idr", "gross_idr",
  "bpjs_employee_jht_idr", "bpjs_employee_jp_idr",
  "bpjs_company_jht_idr", "bpjs_company_jkm_idr", "bpjs_company_jkk_idr", "bpjs_company_jp_idr",
  "company_bpjs_total_idr", "loan_balance_before_idr", "loan_balance_after_idr",
].join(", ");

const EMPLOYEE_SELECT =
  "uuid, employee_code, employee_name, preferred_name, department, bank, bank_account, bank_account_name, positions(name)";

const COMPANY: CompanyInfo = {
  name: process.env.PAYSLIP_COMPANY_NAME ?? "PT Luma Tamu Rumah",
  logoPngBase64: process.env.PAYSLIP_LOGO_BASE64 ?? null,
};

function safeFileSegment(s: string): string {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_");
}

/**
 * POST /api/exports/generate
 * Body: { period_id: string }
 *
 * Called exactly once, by handleSubmit, right after a payroll period is
 * locked. Reads the just-written payroll_entries breakdown (no
 * calculation happens here — it only ever reads stored columns), builds
 * the full spreadsheet and every employee's payslip (xlsx + pdf), and
 * uploads them all to Supabase Storage. The Exports page later just lists
 * and signs URLs for whatever this run produced — it never calls this
 * route's calculation path because there isn't one.
 */
export async function POST(req: NextRequest) {
  let body: { period_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { period_id } = body;
  if (!period_id) {
    return NextResponse.json({ error: "period_id is required" }, { status: 400 });
  }

  const supabaseAdmin = createSupabaseAdmin();

  const periodRes = await supabaseAdmin
    .from("payroll_periods")
    .select("id, year, month, locked")
    .eq("id", period_id)
    .maybeSingle();

  if (periodRes.error || !periodRes.data) {
    return NextResponse.json({ error: "Payroll period not found" }, { status: 404 });
  }
  const period = periodRes.data;

  if (!period.locked) {
    return NextResponse.json(
      { error: "This period is not locked. Submit payroll before generating documents." },
      { status: 409 },
    );
  }

  const [entriesRes, employeesRes] = await Promise.all([
    supabaseAdmin.from("payroll_entries").select(ENTRY_SELECT).eq("period_id", period_id),
    supabaseAdmin.from("employees").select(EMPLOYEE_SELECT),
  ]);

  if (entriesRes.error) {
    return NextResponse.json({ error: entriesRes.error.message }, { status: 500 });
  }
  if (employeesRes.error) {
    return NextResponse.json({ error: employeesRes.error.message }, { status: 500 });
  }

  const entries = (entriesRes.data ?? []) as unknown as StoredPayrollEntry[];
  const employeesById = new Map<string, EmployeeForExport>(
    ((employeesRes.data ?? []) as unknown as EmployeeForExport[]).map((e) => [e.uuid, e]),
  );

  const rows: ExportRow[] = [];
  for (const entry of entries) {
    const employee = employeesById.get(entry.employee_uuid);
    if (!employee) continue; // employee record missing/deleted — skip, don't fail the whole batch
    rows.push({ entry, employee });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "No payroll entries found for this period" }, { status: 404 });
  }

  const folder = `${period.year}-${String(period.month).padStart(2, "0")}`;
  const payslipDate = new Date();
  const logoDataUri = COMPANY.logoPngBase64 ? `data:image/png;base64,${COMPANY.logoPngBase64}` : null;

  const uploadErrors: string[] = [];

  // 1. Full spreadsheet
  try {
    const wb = await buildPayrollSpreadsheet(rows, period.year, period.month);
    const buffer = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(`${folder}/spreadsheet.xlsx`, buffer, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true,
      });
    if (error) uploadErrors.push(`spreadsheet.xlsx: ${error.message}`);
  } catch (err) {
    uploadErrors.push(`spreadsheet.xlsx: ${err instanceof Error ? err.message : "unknown error"}`);
  }

  // 2. Per-employee payslips (xlsx + pdf)
  for (const row of rows) {
    const codeSafe = safeFileSegment(row.employee.employee_code || row.employee.uuid);

    try {
      const wb = await buildSinglePayslipWorkbook(row, {
        company: COMPANY,
        year: period.year,
        month: period.month,
        payslipDate,
      });
      const xlsxBuffer = (await wb.xlsx.writeBuffer()) as unknown as Buffer;
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(`${folder}/payslips/${codeSafe}.xlsx`, xlsxBuffer, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          upsert: true,
        });
      if (error) uploadErrors.push(`payslips/${codeSafe}.xlsx: ${error.message}`);
    } catch (err) {
      uploadErrors.push(`payslips/${codeSafe}.xlsx: ${err instanceof Error ? err.message : "unknown error"}`);
    }

    try {
      const pdfBuffer = await renderPayslipPdfBuffer({
        row,
        company: COMPANY,
        year: period.year,
        month: period.month,
        payslipDate,
        logoDataUri,
      });
      const { error } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(`${folder}/payslips/${codeSafe}.pdf`, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (error) uploadErrors.push(`payslips/${codeSafe}.pdf: ${error.message}`);
    } catch (err) {
      uploadErrors.push(`payslips/${codeSafe}.pdf: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }

  if (uploadErrors.length > 0) {
    return NextResponse.json(
      {
        error: `Generated with ${uploadErrors.length} file error(s)`,
        details: uploadErrors,
        generated: rows.length,
      },
      { status: 207 }, // partial success
    );
  }

  return NextResponse.json({ ok: true, generated: rows.length, folder });
}
