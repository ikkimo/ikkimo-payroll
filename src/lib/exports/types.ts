// ---------------------------------------------------------------------------
// Types and small presentation helpers for the export pipeline.
//
// Deliberately contains NO pay calculation logic. Pay is computed exactly
// once, in src/app/(authed)/payroll/page.tsx's computeRow, at the moment
// payroll is submitted. That function writes the full breakdown into
// payroll_entries. Everything downstream — the spreadsheet export and the
// payslip generator — only ever reads those stored columns. This file must
// stay calculation-free; if you find yourself adding arithmetic here, it
// belongs in payroll/page.tsx instead.
// ---------------------------------------------------------------------------

export type StoredPayrollEntry = {
  employee_uuid: string;
  full_days_worked: number;
  excused_full_days: number;
  excused_half_days: number;
  unexcused_full_days: number;
  unexcused_half_days: number;
  late_minutes_count: number;
  loan_repayment_idr: number;
  new_loan_idr: number;
  overtime_hours_1: number;
  overtime_hours_2: number;
  overtime_hours_3: number;
  other_adjustment_idr: number;
  other_adjustment_note: string | null;
  tax_idr: number;
  total_deductions_idr: number;
  salary_to_pay: number;

  main_salary_idr: number;
  position_allowance_idr: number;
  skill_grade_increase_idr: number;
  housing_allowance_idr: number;
  meal_allowance_idr: number;
  meal_eligible_days: number;
  attendance_reward_idr: number;
  overtime_pay_idr: number;
  unexcused_deduction_idr: number;
  lateness_deduction_idr: number;
  gross_idr: number;
  bpjs_employee_jht_idr: number;
  bpjs_employee_jp_idr: number;
  bpjs_company_jht_idr: number;
  bpjs_company_jkm_idr: number;
  bpjs_company_jkk_idr: number;
  bpjs_company_jp_idr: number;
  company_bpjs_total_idr: number;
  loan_balance_before_idr: number;
  loan_balance_after_idr: number;
};

export type EmployeeForExport = {
  uuid: string;
  employee_code: string;
  employee_name: string;
  preferred_name: string | null;
  department: string | null;
  bank: string | null;
  bank_account: string | null;
  bank_account_name: string | null;
  start_date: string | null;
  positions?: { name: string } | null;
};

/** A stored entry joined with its employee record — what the export
 * builders actually consume. No computed fields, only DB columns. */
export type ExportRow = {
  entry: StoredPayrollEntry;
  employee: EmployeeForExport;
};

export function monthName(m: number) {
  return (
    [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ][m - 1] ?? ""
  );
}

const INDO_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export function monthNameId(m: number) {
  return INDO_MONTHS[m - 1] ?? "";
}