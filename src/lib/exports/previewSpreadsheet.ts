// ---------------------------------------------------------------------------
// Builds a "preview" spreadsheet download straight from the payroll page's
// live, unsaved calculations (PayrollRow[]) — before anything is submitted.
//
// Reuses the exact same buildPayrollSpreadsheet() that /api/exports/generate
// uses for the real, post-submit export, so the preview always matches what
// the final file will look like. The only difference is the source of the
// numbers: this reads live in-memory calculations instead of the frozen
// payroll_entries columns, since nothing is saved to the database yet.
//
// Nothing here touches Supabase, Storage, or payroll_entries — this is a
// pure client-side "download what you'd get" preview.
// ---------------------------------------------------------------------------

import { buildPayrollSpreadsheet } from "./spreadsheet";
import type { ExportRow, StoredPayrollEntry, EmployeeForExport } from "./types";

// Minimal shape this needs from PayrollRow — kept local so this file doesn't
// import the payroll page's types and create a circular dependency.
type PreviewPayrollRow = {
  employee: {
    uuid: string;
    employee_code: string;
    employee_name: string;
    preferred_name: string | null;
    department?: string | null;
    start_date?: string | null;
    positions?: { name: string } | null;
  };
  main_salary: number;
  position_allowance: number;
  skill_grade_increase: number;
  housing_allowance: number;
  meal_allowance: number;
  meal_eligible_days: number;
  attendance_reward: number;
  overtime_pay: number;
  unexcused_deduction: number;
  lateness_deduction: number;
  gross: number;
  tax: number;
  bpjs_employee_jht: number;
  bpjs_employee_jp: number;
  bpjs_employee_kesehatan: number;
  total_deductions: number;
  loan_repayment: number;
  new_loan: number;
  other_adjustment_positive: number;
  other_adjustment_negative: number;
  loan_balance: number;
  projected_loan_balance: number;
  net_pay: number;
  bpjs_company_jht: number;
  bpjs_company_jkm: number;
  bpjs_company_jkk: number;
  bpjs_company_jp: number;
  bpjs_company_kesehatan: number;
  company_bpjs_total: number;
};

function toExportRow(row: PreviewPayrollRow): ExportRow {
  const entry: StoredPayrollEntry = {
    employee_uuid: row.employee.uuid,
    // Not tracked on PayrollRow / not shown by the spreadsheet columns —
    // filled with harmless defaults just to satisfy the stored-entry shape.
    full_days_worked: 0,
    excused_full_days: 0,
    excused_half_days: 0,
    unexcused_full_days: 0,
    unexcused_half_days: 0,
    late_minutes_count: 0,
    overtime_hours_1: 0,
    overtime_hours_2: 0,
    overtime_hours_3: 0,

    main_salary_idr: row.main_salary,
    position_allowance_idr: row.position_allowance,
    skill_grade_increase_idr: row.skill_grade_increase,
    housing_allowance_idr: row.housing_allowance,
    meal_allowance_idr: row.meal_allowance,
    meal_eligible_days: row.meal_eligible_days,
    attendance_reward_idr: row.attendance_reward,
    overtime_pay_idr: row.overtime_pay,
    unexcused_deduction_idr: row.unexcused_deduction,
    lateness_deduction_idr: row.lateness_deduction,
    gross_idr: row.gross,
    tax_idr: row.tax,
    bpjs_employee_jht_idr: row.bpjs_employee_jht,
    bpjs_employee_jp_idr: row.bpjs_employee_jp,
    bpjs_employee_kesehatan_idr: row.bpjs_employee_kesehatan,
    total_deductions_idr: row.total_deductions,
    loan_repayment_idr: row.loan_repayment,
    new_loan_idr: row.new_loan,
    other_adjustment_idr: row.other_adjustment_positive + row.other_adjustment_negative,
    other_adjustment_positive_idr: row.other_adjustment_positive,
    other_adjustment_negative_idr: row.other_adjustment_negative,
    loan_balance_before_idr: row.loan_balance,
    loan_balance_after_idr: row.projected_loan_balance,
    salary_to_pay: row.net_pay,
    bpjs_company_jht_idr: row.bpjs_company_jht,
    bpjs_company_jkm_idr: row.bpjs_company_jkm,
    bpjs_company_jkk_idr: row.bpjs_company_jkk,
    bpjs_company_jp_idr: row.bpjs_company_jp,
    bpjs_company_kesehatan_idr: row.bpjs_company_kesehatan,
    company_bpjs_total_idr: row.company_bpjs_total,
  };

  // Bank details aren't fetched on the payroll page (only the submit-time
  // export route pulls them), so the preview leaves them blank.
  const employee: EmployeeForExport = {
    uuid: row.employee.uuid,
    employee_code: row.employee.employee_code,
    employee_name: row.employee.employee_name,
    preferred_name: row.employee.preferred_name,
    department: row.employee.department ?? null,
    bank: null,
    bank_account: null,
    bank_account_name: null,
    start_date: row.employee.start_date ?? null,
    positions: row.employee.positions ?? null,
  };

  return { entry, employee };
}

export async function downloadPreviewSpreadsheet(
  rows: PreviewPayrollRow[],
  year: number,
  month: number,
): Promise<void> {
  const exportRows = rows.map(toExportRow);
  const wb = await buildPayrollSpreadsheet(exportRows, year, month);
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const monthStr = String(month).padStart(2, "0");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${year}-${monthStr}-payroll-PREVIEW.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}