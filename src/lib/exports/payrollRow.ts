// ---------------------------------------------------------------------------
// Shared payroll calculation logic.
//
// This is the same computeRow/sumRows logic used in
// src/app/(authed)/payroll/page.tsx, extracted so the export routes (which
// run server-side, outside React) compute pay using the exact same rules
// as the screen the user already trusts. If you change pay logic, change it
// here AND in payroll/page.tsx (or better: have payroll/page.tsx import
// from here next time you touch it).
// ---------------------------------------------------------------------------

import type { BasicEmployeeRow } from "@/components/employees/types";
import type { PayrollSettingsRow } from "@/components/settings/types";

export type EmployeeForPayroll = BasicEmployeeRow & {
  basic?: number | null;
  position_id?: string | null;
  skill_grade_id?: string | null;
  gets_bpjs_jp?: boolean | null;
  cash_loan_balance_idr?: number | null;
  positions?: { id: string; name: string; allowance_idr: number } | null;
  skill_grades?: {
    id: string;
    level: number | null;
    increase_monthly_idr?: number | null;
  } | null;
  seniority_grades?: {
    id: string;
    grade: number | null;
    increase_monthly_idr?: number | null;
  } | null;
};

export type EmployeeInput = {
  full_days_worked: number;
  unexcused_full_days: number;
  unexcused_half_days: number;
  excused_full_days: number;
  excused_half_days: number;
  late_minutes_count: number;
  loan_repayment: number;
  new_loan: number;
  overtime_hours_1: number;
  overtime_hours_2: number;
  overtime_hours_3: number;
  other_adjustment_idr: number;
  other_adjustment_note: string;
};

export type PayrollRow = {
  employee: EmployeeForPayroll;
  basic: number;
  position_allowance: number;
  skill_grade_increase: number;
  housing_allowance: number;
  main_salary: number;
  seniority_increase: number;
  meal_allowance: number;
  meal_eligible_days: number;
  attendance_reward: number;
  overtime_pay: number;
  unexcused_deduction: number;
  lateness_deduction: number;
  gross: number;
  loan_balance: number;
  loan_repayment: number;
  new_loan: number;
  projected_loan_balance: number;
  other_adjustment: number;
  bpjs_employee_jht: number;
  bpjs_employee_jp: number;
  bpjs_company_jht: number;
  bpjs_company_jkm: number;
  bpjs_company_jkk: number;
  bpjs_company_jp: number;
  net_pay: number;
  company_bpjs_total: number;
};

export const blankInput = (stdDays = 21): EmployeeInput => ({
  full_days_worked: stdDays,
  excused_full_days: 0,
  excused_half_days: 0,
  unexcused_full_days: 0,
  unexcused_half_days: 0,
  late_minutes_count: 0,
  loan_repayment: 0,
  new_loan: 0,
  overtime_hours_1: 0,
  overtime_hours_2: 0,
  overtime_hours_3: 0,
  other_adjustment_idr: 0,
  other_adjustment_note: "",
});

export function safe(n: number | null | undefined): number {
  return Number.isFinite(n as number) ? (n as number) : 0;
}

export function computeLatenessDeduction(
  totalMinutes: number,
  settings: PayrollSettingsRow,
): number {
  if (totalMinutes <= 0) return 0;

  const baseDeduction = safe(settings.lateness_base_deduction_idr) || 25000;
  const baseMinutes = safe(settings.lateness_base_minutes) || 5;
  const incrementIdr = safe(settings.lateness_increment_idr) || 10000;
  const incrementMinutes = safe(settings.lateness_increment_minutes) || 5;

  if (totalMinutes <= baseMinutes) return baseDeduction;

  const extraMinutes = totalMinutes - baseMinutes;
  const brackets = Math.ceil(extraMinutes / incrementMinutes);

  return baseDeduction + brackets * incrementIdr;
}

export function computeRow(
  emp: EmployeeForPayroll,
  input: EmployeeInput,
  settings: PayrollSettingsRow,
  periodWorkingDays: number,
): PayrollRow {
  const stdDays =
    periodWorkingDays || safe(settings.standard_working_days) || 21;
  const basic = safe(emp.basic);
  const positionAllowance = safe(emp.positions?.allowance_idr);
  const skillGradeIncrease =
    safe(emp.skill_grades?.level) <= 1
      ? 0
      : safe(emp.skill_grades?.increase_monthly_idr);
  const seniorityIncrease = safe(emp.seniority_grades?.increase_monthly_idr);
  const housingAllowance = safe(emp.housing_allowance_idr);
  const mainSalary = basic + positionAllowance + skillGradeIncrease;

  const unexcusedEquivalentDays =
    safe(input.unexcused_full_days) + safe(input.unexcused_half_days) * 0.5;
  const unexcusedDeduction = Math.round(
    (basic / stdDays) * unexcusedEquivalentDays,
  );
  const latenessDeduction = computeLatenessDeduction(
    safe(input.late_minutes_count),
    settings,
  );

  const hasPerfectAttendance =
    safe(input.excused_full_days) === 0 &&
    safe(input.excused_half_days) === 0 &&
    safe(input.unexcused_full_days) === 0 &&
    safe(input.unexcused_half_days) === 0;
  const attendanceReward = hasPerfectAttendance
    ? safe(settings.attendance_reward_idr)
    : 0;

  const mealEligibleDays = emp.gets_meal_allowance
    ? Math.max(0, stdDays - safe(input.excused_full_days) - safe(input.unexcused_full_days))
    : 0;
  const mealAllowance = emp.gets_meal_allowance
    ? Math.round(mealEligibleDays * safe(settings.meal_allowance_per_day_idr))
    : 0;

  const hourlyRate = mainSalary / stdDays / safe(settings.hours_per_day || 8);
  const overtimePay = Math.round(
    safe(input.overtime_hours_1) * hourlyRate * safe(settings.overtime1_multiplier) +
      safe(input.overtime_hours_2) * hourlyRate * safe(settings.overtime2_multiplier) +
      safe(input.overtime_hours_3) * hourlyRate * safe(settings.overtime3_multiplier),
  );

  const otherAdjustment = safe(input.other_adjustment_idr);

  const gross =
    mainSalary +
    housingAllowance +
    mealAllowance +
    attendanceReward +
    overtimePay +
    (otherAdjustment > 0 ? otherAdjustment : 0);

  const bpjsEmpJHT = Math.round(mainSalary * safe(settings.bpjs_employee_jht));
  const bpjsEmpJP = emp.gets_bpjs_jp
    ? Math.round(mainSalary * safe(settings.bpjs_employee_jp))
    : 0;
  const bpjsCoJHT = Math.round(mainSalary * safe(settings.bpjs_company_jht));
  const bpjsCoJKM = Math.round(mainSalary * safe(settings.bpjs_company_jkm));
  const bpjsCoJKK = Math.round(mainSalary * safe(settings.bpjs_company_jkk));
  const bpjsCoJP = emp.gets_bpjs_jp
    ? Math.round(mainSalary * safe(settings.bpjs_company_jp))
    : 0;

  const loanBalance = safe(emp.cash_loan_balance_idr);
  const loanRepayment = safe(input.loan_repayment);
  const newLoan = safe(input.new_loan);
  const projectedLoanBalance = loanBalance - loanRepayment + newLoan;

  const netPay =
    gross -
    bpjsEmpJHT -
    bpjsEmpJP -
    loanRepayment +
    newLoan +
    (otherAdjustment < 0 ? otherAdjustment : 0);

  const companyBpjsTotal =
    bpjsCoJHT + bpjsCoJKM + bpjsCoJKK + bpjsCoJP + bpjsEmpJHT + bpjsEmpJP;

  return {
    employee: emp,
    basic,
    position_allowance: positionAllowance,
    skill_grade_increase: skillGradeIncrease,
    housing_allowance: housingAllowance,
    main_salary: mainSalary,
    seniority_increase: seniorityIncrease,
    meal_allowance: mealAllowance,
    meal_eligible_days: mealEligibleDays,
    attendance_reward: attendanceReward,
    overtime_pay: overtimePay,
    unexcused_deduction: unexcusedDeduction,
    lateness_deduction: latenessDeduction,
    gross,
    loan_balance: loanBalance,
    loan_repayment: loanRepayment,
    new_loan: newLoan,
    projected_loan_balance: projectedLoanBalance,
    other_adjustment: otherAdjustment,
    bpjs_employee_jht: bpjsEmpJHT,
    bpjs_employee_jp: bpjsEmpJP,
    bpjs_company_jht: bpjsCoJHT,
    bpjs_company_jkm: bpjsCoJKM,
    bpjs_company_jkk: bpjsCoJKK,
    bpjs_company_jp: bpjsCoJP,
    net_pay: netPay,
    company_bpjs_total: companyBpjsTotal,
  };
}

export function sumRows(rows: PayrollRow[]) {
  const sum = (key: keyof PayrollRow) =>
    rows.reduce((acc, r) => acc + (r[key] as number), 0);
  return {
    main_salary: sum("main_salary"),
    housing_allowance: sum("housing_allowance"),
    seniority_increase: sum("seniority_increase"),
    meal_allowance: sum("meal_allowance"),
    overtime_pay: sum("overtime_pay"),
    unexcused_deduction: sum("unexcused_deduction"),
    lateness_deduction: sum("lateness_deduction"),
    attendance_reward: sum("attendance_reward"),
    gross: sum("gross"),
    loan_repayment: sum("loan_repayment"),
    other_adjustment: sum("other_adjustment"),
    bpjs_employee_jht: sum("bpjs_employee_jht"),
    bpjs_employee_jp: sum("bpjs_employee_jp"),
    bpjs_company_jht: sum("bpjs_company_jht"),
    bpjs_company_jkm: sum("bpjs_company_jkm"),
    bpjs_company_jkk: sum("bpjs_company_jkk"),
    bpjs_company_jp: sum("bpjs_company_jp"),
    net_pay: sum("net_pay"),
    company_bpjs_total: sum("company_bpjs_total"),
  };
}

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
