"use client";

export const dynamic = "force-dynamic";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { verifyCurrentUserPassword } from "@/lib/auth";
import { formatIDR } from "@/lib/formatters";
import type { BasicEmployeeRow } from "@/components/employees/types";
import type { PayrollSettingsRow } from "@/components/settings/types";
import { useSearchParams } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type OtherItem = { id: string; description: string; amount_idr: number };

type PayrollPeriod = {
  id: string;
  year: number;
  month: number;
  working_days: number | null;
  red_days?: number | null;
  locked?: boolean | null;
};

type EmployeeForPayroll = BasicEmployeeRow & {
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

type EmployeeInput = {
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
  other_items: OtherItem[];
  tax_idr: number; // NEW
};

type PayrollRow = {
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
  other_adjustment_positive: number;
  other_adjustment_negative: number;
  tax: number; // NEW
  total_deductions: number; // NEW — the one reconciled deductions figure
  bpjs_employee_jht: number;
  bpjs_employee_jp: number;
  bpjs_company_jht: number;
  bpjs_company_jkm: number;
  bpjs_company_jkk: number;
  bpjs_company_jp: number;
  net_pay: number;
  company_bpjs_total: number;
};

type SessionStatus = "none" | "draft" | "submitted";

const blankInput = (stdDays = 21): EmployeeInput => ({
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
  other_items: [],
  tax_idr: 0,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthName(m: number) {
  return (
    [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ][m - 1] ?? ""
  );
}

function safe(n: number | null | undefined): number {
  return Number.isFinite(n as number) ? (n as number) : 0;
}

// Default period = current calendar month. A stored period (year, month)
// represents the 25th of the previous month through the 24th of this
// month, so this naturally stays on, e.g., the May25–June24 period for
// all of June, and only rolls over to June25–July24 on July 1st. This
// matches the Home page's "Current period" logic (nowYearMonth()).
function getDefaultPeriod(): { year: number; month: number } {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}

function computeLatenessDeduction(
  totalMinutes: number,
  settings: PayrollSettingsRow,
): number {
  if (totalMinutes <= 0) return 0;

  const baseDeduction = safe(settings.lateness_base_deduction_idr) || 25000;
  const baseMinutes = safe(settings.lateness_base_minutes) || 5;
  const incrementIdr = safe(settings.lateness_increment_idr) || 10000;
  const incrementMinutes = safe(settings.lateness_increment_minutes) || 5;

  // First bracket: any lateness up to baseMinutes = flat baseDeduction
  if (totalMinutes <= baseMinutes) return baseDeduction;

  // Additional minutes beyond the base threshold, rounded up to nearest bracket
  const extraMinutes = totalMinutes - baseMinutes;
  const brackets = Math.ceil(extraMinutes / incrementMinutes);

  return baseDeduction + brackets * incrementIdr;
}

function computeRow(
  emp: EmployeeForPayroll,
  input: EmployeeInput,
  settings: PayrollSettingsRow,
  periodWorkingDays: number,
): PayrollRow {
  // periodWorkingDays (the period's specific working_days override) is
  // deliberately NOT used below: the unexcused-absence deduction and
  // overtime calculations always use settings.standard_working_days,
  // regardless of any per-period override. Only full_days_worked (computed
  // outside this function) and, by extension, attendance-reward
  // eligibility follow the period-specific working days.
  const stdDays = safe(settings.standard_working_days) || 21;
  const basic = safe(emp.basic);
  const positionAllowance = safe(emp.positions?.allowance_idr);
  const skillGradeIncrease =
    safe(emp.skill_grades?.level) <= 1
      ? 0
      : safe(emp.skill_grades?.increase_monthly_idr);
  const seniorityIncrease = safe(emp.seniority_grades?.increase_monthly_idr);
  const housingAllowance = safe(emp.housing_allowance_idr);
  // "Main salary" = basic + position allowance + skill grade increase.
  // This is the "current salary" referred to elsewhere — the figure that
  // unexcused-absence deductions and overtime are based on. BPJS is
  // deliberately NOT based on this — see below.
  const mainSalary = basic + positionAllowance + skillGradeIncrease;

  // FIX: was (basic / stdDays) — absence deductions are based on main
  // salary (basic + position allowance + skill grade), not basic alone.
  // e.g. an unexcused half day = (basic+pos+skill) / standardWorkingDays * 0.5
  const unexcusedEquivalentDays =
    safe(input.unexcused_full_days) + safe(input.unexcused_half_days) * 0.5;
  const unexcusedDeduction = Math.round(
    (mainSalary / stdDays) * unexcusedEquivalentDays,
  );

  // Lateness stays as its own flat, minute-bracket model from Settings —
  // intentionally unrelated to salary.
  const latenessDeduction = computeLatenessDeduction(
    safe(input.late_minutes_count),
    settings,
  );

  // FIX: attendance reward now also requires zero lateness minutes, in
  // addition to zero excused and zero unexcused absences. Overtime still
  // does not affect eligibility.
  const hasPerfectAttendance =
    safe(input.excused_full_days) === 0 &&
    safe(input.excused_half_days) === 0 &&
    safe(input.unexcused_full_days) === 0 &&
    safe(input.unexcused_half_days) === 0 &&
    safe(input.late_minutes_count) === 0;
  const attendanceReward = hasPerfectAttendance
    ? safe(settings.attendance_reward_idr) || 100000
    : 0;

  // Overtime — unchanged. Already correctly based on main salary spread
  // over settings.standard_working_days and settings.hours_per_day.
  const hoursPerDay = safe(settings.hours_per_day) || 8;
  const hourlyRate = mainSalary / (stdDays * hoursPerDay);
  const overtimeMultiplier1 = safe(settings.overtime1_multiplier) || 1.5;
  const overtimeMultiplier2 = safe(settings.overtime2_multiplier) || 2.0;
  const overtimeMultiplier3 = safe(settings.overtime3_multiplier) || 3.0;
  const overtimePay = Math.round(
    hourlyRate *
      (safe(input.overtime_hours_1) * overtimeMultiplier1 +
        safe(input.overtime_hours_2) * overtimeMultiplier2 +
        safe(input.overtime_hours_3) * overtimeMultiplier3),
  );

  const halfDaysCount =
    safe(input.excused_half_days) + safe(input.unexcused_half_days);
  const mealEligibleDays = emp.gets_meal_allowance
    ? Math.max(
        0,
        Math.floor(safe(input.full_days_worked) - halfDaysCount * 0.5),
      )
    : 0;
  const mealAllowance = Math.round(
    mealEligibleDays * safe(settings.meal_allowance_per_day_idr),
  );

  // FIX: Gross is now full earnings BEFORE any deduction — nothing
  // subtracted here. Unexcused/lateness move down into total_deductions,
  // so Gross − total_deductions + newLoan + otherAdjustment = Net Pay,
  // exactly, every time. (Seniority increase still deliberately excluded.)
  const gross =
    mainSalary + housingAllowance + mealAllowance + attendanceReward + overtimePay;

  // FIX: BPJS is now based on basic alone, not main salary.
  const bpjsEmpJHT = Math.round(basic * safe(settings.bpjs_employee_jht));
  const bpjsEmpJP = emp.gets_bpjs_jp
    ? Math.round(basic * safe(settings.bpjs_employee_jp))
    : 0;
  const bpjsCoJHT = Math.round(basic * safe(settings.bpjs_company_jht));
  const bpjsCoJKM = Math.round(basic * safe(settings.bpjs_company_jkm));
  const bpjsCoJKK = Math.round(basic * safe(settings.bpjs_company_jkk));
  const bpjsCoJP = emp.gets_bpjs_jp
    ? Math.round(basic * safe(settings.bpjs_company_jp))
    : 0;

  const loanBalance = safe(emp.cash_loan_balance_idr);
  const loanRepayment = safe(input.loan_repayment);
  const newLoan = safe(input.new_loan);
  const projectedLoanBalance = loanBalance - loanRepayment + newLoan;

  const otherItems = input.other_items ?? [];
  const otherPositive = otherItems
    .filter((i) => safe(i.amount_idr) > 0)
    .reduce((acc, i) => acc + safe(i.amount_idr), 0);
  const otherNegative = otherItems
    .filter((i) => safe(i.amount_idr) < 0)
    .reduce((acc, i) => acc + safe(i.amount_idr), 0); // stays negative
  const otherAdjustment = otherPositive + otherNegative; // net, unchanged formula below

  const tax = safe(input.tax_idr); // NEW

  // NEW: the single reconciled "total deductions" figure — every strictly-
  // subtracted item, nothing double-counted. This is what the Pay Summary
  // table, the payslip, and the spreadsheet should all display.
  const totalDeductions =
    unexcusedDeduction +
    latenessDeduction +
    bpjsEmpJHT +
    bpjsEmpJP +
    tax +
    loanRepayment;

  // FIX: net pay now derives from gross and total_deductions directly, so
  // it always reconciles with what's printed next to it.
  const netPay = gross - totalDeductions + newLoan + otherAdjustment;

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
    unexcused_deduction: unexcusedDeduction,
    lateness_deduction: latenessDeduction,
    attendance_reward: attendanceReward,
    overtime_pay: overtimePay,
    gross,
    loan_balance: loanBalance,
    loan_repayment: loanRepayment,
    new_loan: newLoan,
    projected_loan_balance: projectedLoanBalance,
    other_adjustment: otherAdjustment,
    other_adjustment_positive: otherPositive,
    other_adjustment_negative: otherNegative,
    tax,
    total_deductions: totalDeductions,
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

function sumRows(rows: PayrollRow[]) {
  const sum = (key: keyof PayrollRow) =>
    rows.reduce((acc, r) => acc + (r[key] as number), 0);
  return {
    main_salary: sum("main_salary"),
    housing_allowance: sum("housing_allowance"),
    seniority_increase: sum("seniority_increase"),
    meal_allowance: sum("meal_allowance"),
    unexcused_deduction: sum("unexcused_deduction"),
    lateness_deduction: sum("lateness_deduction"),
    attendance_reward: sum("attendance_reward"),
    overtime_pay: sum("overtime_pay"),
    gross: sum("gross"),
    loan_repayment: sum("loan_repayment"),
    other_adjustment: sum("other_adjustment"),
    other_adjustment_positive: sum("other_adjustment_positive"),
    other_adjustment_negative: sum("other_adjustment_negative"),
    tax: sum("tax"),
    total_deductions: sum("total_deductions"),
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

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function Th({
  children,
  right,
  center,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
}) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-xs font-semibold text-[var(--ikkimo-text-muted,#666)] ${right ? "text-right" : center ? "text-center" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  right,
  muted,
  red,
  center,
}: {
  children: React.ReactNode;
  right?: boolean;
  muted?: boolean;
  red?: boolean;
  center?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-sm ${right ? "text-right tabular-nums" : center ? "text-center tabular-nums" : ""} ${muted ? "text-[var(--ikkimo-text-muted,#888)]" : ""} ${red ? "text-red-600" : ""}`}
    >
      {children}
    </td>
  );
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5">
      <div className="text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]">
        {label}
      </div>
      <div className="mt-2 text-xl font-bold tabular-nums">{value}</div>
      {hint && (
        <div className="mt-1 text-xs text-[var(--ikkimo-text-muted,#aaa)]">
          {hint}
        </div>
      )}
    </div>
  );
}

function NumInput({
  value,
  onChange,
  step = 1,
  min = 0,
  wide,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  wide?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      value={String(value)}
      min={min}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        onChange(Number.isFinite(n) ? Math.max(min, n) : min);
      }}
      disabled={disabled}
      className={`${wide ? "w-28" : "w-14"} rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-center text-sm tabular-nums outline-none focus:border-[var(--ikkimo-brand)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none disabled:cursor-not-allowed disabled:bg-[var(--ikkimo-surface,#f5f5f5)] disabled:opacity-60`}
    />
  );
}

function EmpCell({ emp }: { emp: EmployeeForPayroll }) {
  return (
    <td className="whitespace-nowrap px-3 py-2">
      <div className="text-sm font-medium">
        {emp.preferred_name ?? emp.employee_name}
      </div>
      <div className="text-xs text-[var(--ikkimo-text-muted,#888)]">
        {emp.employee_code}
      </div>
    </td>
  );
}

// Inline breakdown row for pay summary — card style, no horizontal scroll needed
function BreakdownCard({ row }: { row: PayrollRow }) {
  return (
    <tr className="bg-[var(--ikkimo-surface,#fafafa)]">
      <td colSpan={6} className="px-4 py-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Earnings */}
          <div className="rounded-xl border border-[var(--ikkimo-border)] bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]">
              Earnings
            </div>
            <div className="space-y-1 text-xs">
              <Line label="Basic" value={formatIDR(row.basic)} />
              <Line
                label="Position allowance"
                value={formatIDR(row.position_allowance)}
              />
              {row.skill_grade_increase > 0 && (
                <Line
                  label="Skill grade"
                  value={formatIDR(row.skill_grade_increase)}
                />
              )}
              {/* <Line label="Seniority" value={formatIDR(row.seniority_increase)} /> */}
              {row.housing_allowance > 0 && (
                <Line
                  label="Housing"
                  value={formatIDR(row.housing_allowance)}
                />
              )}
              {row.meal_allowance > 0 && (
                <Line
                  label={`Meal (${row.meal_eligible_days}d)`}
                  value={formatIDR(row.meal_allowance)}
                />
              )}
              {row.attendance_reward > 0 && (
                <Line
                  label="Attendance reward"
                  value={formatIDR(row.attendance_reward)}
                />
              )}
              {row.overtime_pay > 0 && (
                <Line
                  label="Overtime pay"
                  value={formatIDR(row.overtime_pay)}
                />
              )}
              <div className="mt-1 border-t border-[var(--ikkimo-border)] pt-1">
                <Line label="Gross" value={formatIDR(row.gross)} bold />
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="rounded-xl border border-[var(--ikkimo-border)] bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]">
              Deductions
            </div>
            <div className="space-y-1 text-xs">
              {row.unexcused_deduction > 0 && (
                <Line
                  label="Unexcused absences"
                  value={`− ${formatIDR(row.unexcused_deduction)}`}
                  red
                />
              )}
              {row.lateness_deduction > 0 && (
                <Line
                  label="Lateness"
                  value={`− ${formatIDR(row.lateness_deduction)}`}
                  red
                />
              )}
              <Line
                label="Emp. JHT"
                value={`− ${formatIDR(row.bpjs_employee_jht)}`}
                red
              />
              {row.employee.gets_bpjs_jp && (
                <Line
                  label="Emp. JP"
                  value={`− ${formatIDR(row.bpjs_employee_jp)}`}
                  red
                />
              )}
              {row.tax > 0 && (
                <Line label="Tax" value={`− ${formatIDR(row.tax)}`} red />
              )}
              {row.loan_repayment > 0 && (
                <Line
                  label="Loan repayment"
                  value={`− ${formatIDR(row.loan_repayment)}`}
                  red
                />
              )}
              {row.new_loan > 0 && (
                <Line label="New loan" value={`+ ${formatIDR(row.new_loan)}`} />
              )}
              {row.other_adjustment_positive > 0 && (
                <Line
                  label="Other additions"
                  value={`+ ${formatIDR(row.other_adjustment_positive)}`}
                />
              )}
              {row.other_adjustment_negative < 0 && (
                <Line
                  label="Other deductions"
                  value={`− ${formatIDR(Math.abs(row.other_adjustment_negative))}`}
                  red
                />
              )}
              {row.unexcused_deduction === 0 &&
                row.lateness_deduction === 0 &&
                row.tax === 0 &&
                row.loan_repayment === 0 &&
                row.new_loan === 0 &&
                row.other_adjustment_positive === 0 &&
                row.other_adjustment_negative === 0 && (
                  <div className="text-[var(--ikkimo-text-muted,#aaa)]">
                    No deductions
                  </div>
                )}
              <div className="mt-1 border-t border-[var(--ikkimo-border)] pt-1">
                <Line
                  label="Total deductions"
                  value={`− ${formatIDR(row.total_deductions)}`}
                />
                <Line label="Net pay" value={formatIDR(row.net_pay)} bold />
              </div>
            </div>
          </div>

          {/* Loan */}
          <div className="rounded-xl border border-[var(--ikkimo-border)] bg-white p-3">
            <div className="mb-2 text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]">
              Loan
            </div>
            <div className="space-y-1 text-xs">
              <Line
                label="Balance before"
                value={row.loan_balance > 0 ? formatIDR(row.loan_balance) : "—"}
                muted={row.loan_balance === 0}
              />
              {row.loan_repayment > 0 && (
                <Line
                  label="Repayment"
                  value={`− ${formatIDR(row.loan_repayment)}`}
                  red
                />
              )}
              {row.new_loan > 0 && (
                <Line label="New loan" value={formatIDR(row.new_loan)} />
              )}
              <div className="mt-1 border-t border-[var(--ikkimo-border)] pt-1">
                <Line
                  label="Projected balance"
                  value={
                    row.projected_loan_balance > 0
                      ? formatIDR(row.projected_loan_balance)
                      : "—"
                  }
                  red={row.projected_loan_balance > 0}
                />
              </div>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function Line({
  label,
  value,
  bold,
  red,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  red?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span
        className={
          muted
            ? "text-[var(--ikkimo-text-muted,#aaa)]"
            : "text-[var(--ikkimo-text-muted,#666)]"
        }
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${bold ? "font-semibold text-[var(--ikkimo-text,#111)]" : ""} ${red ? "text-red-600" : ""} ${muted ? "text-[var(--ikkimo-text-muted,#aaa)]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function PayrollFormPageInner() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [generatingExports, setGeneratingExports] = useState(false);
  const [exportsError, setExportsError] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>("none");
  const [employees, setEmployees] = useState<EmployeeForPayroll[]>([]);
  const [settings, setSettings] = useState<PayrollSettingsRow | null>(null);
  const [stdDays, setStdDays] = useState(21);

  const [inputs, setInputs] = useState<Record<string, EmployeeInput>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [view, setView] = useState<
    "attendance" | "loans" | "overtime" | "taxOther" | "summary" | "bpjs"
  >("attendance");

  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth() + 1,
  );
  const [periodReady, setPeriodReady] = useState(false);

  const isSubmitted = sessionStatus === "submitted";
  const searchParams = useSearchParams();

  const [newPeriodWorkingDays, setNewPeriodWorkingDays] = useState("");
  const [newPeriodRedDays, setNewPeriodRedDays] = useState("");
  const [creatingPeriod, setCreatingPeriod] = useState(false);
  const [periodFormError, setPeriodFormError] = useState<string | null>(null);

  const [editingPeriodDays, setEditingPeriodDays] = useState(false);
  const [editWorkingDays, setEditWorkingDays] = useState("");
  const [editRedDays, setEditRedDays] = useState("");
  const [savingPeriodDays, setSavingPeriodDays] = useState(false);

  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadAllError, setDownloadAllError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);

      const [empRes, settingsRes] = await Promise.all([
        supabase
          .from("employees")
          .select(
            "uuid, internal_no, employee_code, preferred_name, employee_name, department, start_date, active, basic, probation, position_id, skill_grade_id, gets_bpjs_jp, cash_loan_balance_idr, housing_allowance_idr, gets_meal_allowance, thr_preference, positions:positions!employees_position_id_fkey(id, name, allowance_idr), skill_grades:skill_grades!employees_skill_grade_id_fkey(id, level, increase_monthly_idr), seniority_grades:seniority_grades!employees_seniority_grade_id_fkey(id, grade, increase_monthly_idr)",
          )
          .eq("active", true)
          .order("internal_no", { ascending: true })
          .limit(500),
        supabase
          .from("payroll_settings")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!alive) return;
      if (empRes.error) {
        setError(`Employees: ${empRes.error.message}`);
        setLoading(false);
        return;
      }
      if (settingsRes.error) {
        setError(`Settings: ${settingsRes.error.message}`);
        setLoading(false);
        return;
      }

      const loadedSettings = settingsRes.data as PayrollSettingsRow | null;
      const emps = (empRes.data ?? []) as unknown as EmployeeForPayroll[];
      const days = loadedSettings?.standard_working_days ?? 21;

      setSettings(loadedSettings);
      setEmployees(emps);
      setStdDays(days);

      const init: Record<string, EmployeeInput> = {};
      for (const emp of emps) init[emp.uuid] = blankInput(days);
      setInputs(init);

      const yearParam = Number(searchParams.get("year"));
      const monthParam = Number(searchParams.get("month"));
      const hasValidParams =
        Number.isInteger(yearParam) &&
        Number.isInteger(monthParam) &&
        monthParam >= 1 &&
        monthParam <= 12;

      const { year, month } = hasValidParams
        ? { year: yearParam, month: monthParam }
        : getDefaultPeriod();

      setSelectedYear(year);
      setSelectedMonth(month);
      setPeriodReady(true);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Period fetch + load saved entries if draft exists
  // ---------------------------------------------------------------------------
  // ----------- Period fetch / load saved entries if draft exists -----------
  useEffect(() => {
    if (!periodReady || employees.length === 0) return;
    let alive = true;

    (async () => {
      const res = await supabase
        .from("payroll_periods")
        .select("id, year, month, working_days, red_days, locked")
        .eq("year", selectedYear)
        .eq("month", selectedMonth)
        .maybeSingle();

      if (!alive) return;

      const p = res.error ? null : (res.data as PayrollPeriod | null);

      setPeriod(p);

      const periodDays = p?.working_days ?? stdDays;

      // Always reset ALL employees to this period's working days first
      const freshInputs: Record<string, EmployeeInput> = {};
      for (const emp of employees) {
        freshInputs[emp.uuid] = blankInput(periodDays);
      }

      if (!p) {
        setSessionStatus("none");
        setInputs(freshInputs);
        return;
      }

      const status: SessionStatus = p.locked === true ? "submitted" : "draft";
      setSessionStatus(status);

      // Load saved entries and overlay on top of fresh inputs
      const entryRes = await supabase
        .from("payroll_entries")
        .select(
          "employee_uuid, full_days_worked, excused_full_days, excused_half_days, unexcused_full_days, unexcused_half_days, late_minutes_count, loan_repayment_idr, new_loan_idr, overtime_hours_1, overtime_hours_2, overtime_hours_3, other_items, tax_idr, salary_to_pay",
        )
        .eq("period_id", p.id);

      if (!alive) return;

      if (!entryRes.error && entryRes.data?.length) {
        for (const entry of entryRes.data) {
          const excusedFull = entry.excused_full_days ?? 0;
          const excusedHalf = entry.excused_half_days ?? 0;
          const unexcusedFull = entry.unexcused_full_days ?? 0;
          const unexcusedHalf = entry.unexcused_half_days ?? 0;
          freshInputs[entry.employee_uuid] = {
            // Always re-derived from the period's CURRENT working days,
            // never trusted from storage — so a working_days correction
            // stays correct on reload too, not just in the live session
            // where it was made.
            full_days_worked: Math.max(
              0,
              periodDays - excusedFull - unexcusedFull - excusedHalf * 0.5 - unexcusedHalf * 0.5,
            ),
            excused_full_days: excusedFull,
            excused_half_days: excusedHalf,
            unexcused_full_days: unexcusedFull,
            unexcused_half_days: unexcusedHalf,
            late_minutes_count: entry.late_minutes_count ?? 0,
            loan_repayment: entry.loan_repayment_idr ?? 0,
            new_loan: entry.new_loan_idr ?? 0,
            overtime_hours_1: entry.overtime_hours_1 ?? 0,
            overtime_hours_2: entry.overtime_hours_2 ?? 0,
            overtime_hours_3: entry.overtime_hours_3 ?? 0,
            other_items: entry.other_items ?? [],
            tax_idr: entry.tax_idr ?? 0,
          };
        }
      }

      setInputs(freshInputs);
    })();

    return () => {
      alive = false;
    };
  }, [selectedYear, selectedMonth, periodReady, stdDays, employees]);

  // ---------------------------------------------------------------------------
  // Derived rows
  // ---------------------------------------------------------------------------
  const payrollRows = useMemo<PayrollRow[]>(() => {
    if (!settings) return [];
    return employees.map((emp) =>
      computeRow(
        emp,
        inputs[emp.uuid] ?? blankInput(period?.working_days ?? stdDays),
        settings,
        period?.working_days ?? settings.standard_working_days ?? stdDays,
      ),
    );
  }, [employees, inputs, settings, period, stdDays]);

  const totals = useMemo(() => sumRows(payrollRows), [payrollRows]);

  function updateInput(
    uuid: string,
    key: keyof EmployeeInput,
    value: number | string | OtherItem[],
  ) {
    setInputs((prev) => {
      const current = prev[uuid] ?? blankInput(period?.working_days ?? stdDays);
      const updated = { ...current, [key]: value } as EmployeeInput;

      if (
        key === "excused_full_days" ||
        key === "excused_half_days" ||
        key === "unexcused_full_days" ||
        key === "unexcused_half_days"
      ) {
        const periodDays = period?.working_days ?? stdDays;
        updated.full_days_worked = Math.max(
          0,
          periodDays -
            updated.excused_full_days -
            updated.unexcused_full_days -
            updated.excused_half_days * 0.5 -
            updated.unexcused_half_days * 0.5,
        );
      }

      return { ...prev, [uuid]: updated };
    });
  }

  function addOtherItem(uuid: string) {
    updateInput(uuid, "other_items", [
      ...(inputs[uuid]?.other_items ?? []),
      { id: crypto.randomUUID(), description: "", amount_idr: 0 },
    ]);
  }
  function updateOtherItem(uuid: string, idx: number, field: "description" | "amount_idr", value: string | number) {
    const items = [...(inputs[uuid]?.other_items ?? [])];
    items[idx] = { ...items[idx], [field]: value };
    updateInput(uuid, "other_items", items);
  }
  function removeOtherItem(uuid: string, idx: number) {
    const items = (inputs[uuid]?.other_items ?? []).filter((_, i) => i !== idx);
    updateInput(uuid, "other_items", items);
  }

  // ---------------------------------------------------------------------------
  // Save (draft upsert)
  // ---------------------------------------------------------------------------
  async function handleSave() {
    if (!period) {
      console.warn("[handleSave] No period selected — cannot save.");
      return;
    }
    console.log(
      "[handleSave] Saving draft for period:",
      period.id,
      `${monthName(selectedMonth)} ${selectedYear}`,
    );
    setSaving(true);
    setSaveMsg(null);

    const upsertRows = employees.map((emp) => {
      const inp =
        inputs[emp.uuid] ?? blankInput(period.working_days ?? stdDays);
      const row = payrollRows.find((r) => r.employee.uuid === emp.uuid);
      console.log(
        `  [handleSave] ${emp.employee_name}: full_days=${inp.full_days_worked}, net_pay=${row?.net_pay}`,
      );
      return {
        period_id: period.id,
        employee_uuid: emp.uuid,
        full_days_worked: inp.full_days_worked,
        excused_full_days: inp.excused_full_days,
        excused_half_days: inp.excused_half_days,
        unexcused_full_days: inp.unexcused_full_days,
        unexcused_half_days: inp.unexcused_half_days,
        late_minutes_count: inp.late_minutes_count,
        loan_repayment_idr: inp.loan_repayment,
        new_loan_idr: inp.new_loan,
        overtime_hours_1: inp.overtime_hours_1,
        overtime_hours_2: inp.overtime_hours_2,
        overtime_hours_3: inp.overtime_hours_3,
        other_items: inp.other_items,
        tax_idr: inp.tax_idr,
        salary_to_pay: row?.net_pay ?? null,
      };
    });

    console.log("[handleSave] Upserting rows:", upsertRows.length);
    const { error: upsertErr } = await supabase
      .from("payroll_entries")
      .upsert(upsertRows, { onConflict: "period_id,employee_uuid" });

    if (upsertErr) {
      console.error("[handleSave] Upsert failed:", upsertErr);
      setSaveMsg(`Save failed: ${upsertErr.message}`);
    } else {
      console.log("[handleSave] ✅ Saved successfully");
      setSessionStatus("draft");
      setSaveMsg("Saved");
      setTimeout(() => setSaveMsg(null), 3000);
    }
    setSaving(false);
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit() {
    if (!period) {
      console.warn("[handleSubmit] No period — cannot submit.");
      return;
    }
    console.log(
      "[handleSubmit] Submitting payroll for period:",
      period.id,
      `${monthName(selectedMonth)} ${selectedYear}`,
    );
    setSaving(true);
    setShowSubmitModal(false);
    setExportsError(null);

    const upsertRows = employees.map((emp) => {
      const inp =
        inputs[emp.uuid] ?? blankInput(period.working_days ?? stdDays);
      const row = payrollRows.find((r) => r.employee.uuid === emp.uuid);
      console.log(
        `  [handleSubmit] ${emp.employee_name}: net_pay=${row?.net_pay}`,
      );
      return {
        period_id: period.id,
        employee_uuid: emp.uuid,
        full_days_worked: inp.full_days_worked,
        excused_full_days: inp.excused_full_days,
        excused_half_days: inp.excused_half_days,
        unexcused_full_days: inp.unexcused_full_days,
        unexcused_half_days: inp.unexcused_half_days,
        late_minutes_count: inp.late_minutes_count,
        loan_repayment_idr: inp.loan_repayment,
        new_loan_idr: inp.new_loan,
        overtime_hours_1: inp.overtime_hours_1,
        overtime_hours_2: inp.overtime_hours_2,
        overtime_hours_3: inp.overtime_hours_3,
        other_items: inp.other_items,
        other_adjustment_idr: row?.other_adjustment ?? 0,
        other_adjustment_positive_idr: row?.other_adjustment_positive ?? 0,
        other_adjustment_negative_idr: row?.other_adjustment_negative ?? 0,
        tax_idr: inp.tax_idr,
        salary_to_pay: row?.net_pay ?? null,
        // Full breakdown, frozen at submit time. This is what the export
        // routes read — they never recompute pay, only this table.
        main_salary_idr: row?.main_salary ?? 0,
        position_allowance_idr: row?.position_allowance ?? 0,
        skill_grade_increase_idr: row?.skill_grade_increase ?? 0,
        housing_allowance_idr: row?.housing_allowance ?? 0,
        meal_allowance_idr: row?.meal_allowance ?? 0,
        meal_eligible_days: row?.meal_eligible_days ?? 0,
        attendance_reward_idr: row?.attendance_reward ?? 0,
        overtime_pay_idr: row?.overtime_pay ?? 0,
        unexcused_deduction_idr: row?.unexcused_deduction ?? 0,
        lateness_deduction_idr: row?.lateness_deduction ?? 0,
        gross_idr: row?.gross ?? 0,
        total_deductions_idr: row?.total_deductions ?? 0,
        bpjs_employee_jht_idr: row?.bpjs_employee_jht ?? 0,
        bpjs_employee_jp_idr: row?.bpjs_employee_jp ?? 0,
        bpjs_company_jht_idr: row?.bpjs_company_jht ?? 0,
        bpjs_company_jkm_idr: row?.bpjs_company_jkm ?? 0,
        bpjs_company_jkk_idr: row?.bpjs_company_jkk ?? 0,
        bpjs_company_jp_idr: row?.bpjs_company_jp ?? 0,
        company_bpjs_total_idr: row?.company_bpjs_total ?? 0,
        loan_balance_before_idr: row?.loan_balance ?? 0,
        loan_balance_after_idr: row?.projected_loan_balance ?? 0,
      };
    });

    const { error: upsertErr } = await supabase
      .from("payroll_entries")
      .upsert(upsertRows, { onConflict: "period_id,employee_uuid" });

    if (upsertErr) {
      console.error("[handleSubmit] Upsert failed:", upsertErr);
      setSaveMsg(`Submit failed: ${upsertErr.message}`);
      setSaving(false);
      return;
    }

    // ---- Apply loan balance changes to employees (submit-time only) ----
    const loanUpdates = employees
      .map((emp) => {
        const inp = inputs[emp.uuid];
        if (!inp) return null;
        const repayment = inp.loan_repayment || 0;
        const newLoan = inp.new_loan || 0;
        if (repayment === 0 && newLoan === 0) return null; // nothing to change

        const currentBalance = emp.cash_loan_balance_idr ?? 0;
        const nextBalance = currentBalance - repayment + newLoan;

        return { uuid: emp.uuid, nextBalance };
      })
      .filter((u): u is { uuid: string; nextBalance: number } => u !== null);

    if (loanUpdates.length > 0) {
      const results = await Promise.all(
        loanUpdates.map((u) =>
          supabase
            .from("employees")
            .update({ cash_loan_balance_idr: u.nextBalance })
            .eq("uuid", u.uuid),
        ),
      );

      const loanErr = results.find((r) => r.error)?.error;
      if (loanErr) {
        console.error("[handleSubmit] Loan balance update failed:", loanErr);
        setSaveMsg(`Submit failed: ${loanErr.message}`);
        setSaving(false);
        return;
      }
    }
    //this works but not as good
    // const { error: statusErr } = await supabase
    //   .from("payroll_periods")
    //   .update({ locked: true })
    //   .eq("id", period.id);

    // if (statusErr) {
    //   console.error("[handleSubmit] Status update failed:", statusErr);
    //   setSaveMsg(`Status update failed: ${statusErr.message}`);
    //   setSaving(false);
    //   return;
    // }
    const { data: lockedRows, error: statusErr } = await supabase
    .from("payroll_periods")
    .update({ locked: true })
    .eq("id", period.id)
    .select("id, locked"); // <- forces a real read-back of what was actually updated

    if (statusErr) {
      console.error("[handleSubmit] Status update failed:", statusErr);
      setSaveMsg(`Status update failed: ${statusErr.message}`);
      setSaving(false);
      return;
    }

    if (!lockedRows || lockedRows.length === 0) {
      // RLS silently blocked the update — no error, but nothing was changed.
      console.error("[handleSubmit] Lock update affected 0 rows (likely RLS).");
      setSaveMsg(
        "Submit failed: you don't have permission to lock this payroll period. Contact an admin.",
      );
      setSaving(false);
      return;
    }

    console.log("[handleSubmit] ✅ Submitted successfully");
    setSessionStatus("submitted");
    setPeriod((p) => (p ? { ...p, locked: true } : p));
    setSaveMsg("Submitted");
    setTimeout(() => setSaveMsg(null), 3000);
    setSaving(false);

    // Generate the spreadsheet + payslip files now, once, server-side.
    // The Exports page never generates anything itself — it only lists
    // and downloads whatever this call produces.
    setGeneratingExports(true);
    try {
      const res = await fetch("/api/exports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_id: period.id }),
      });
      const resBody = await res.json().catch(() => ({}));
      if (!res.ok || res.status === 207) {
        console.error("[handleSubmit] Export generation errors:", resBody.details);
        throw new Error(
          resBody.details?.length
            ? `Document generation failed: ${resBody.details[0]}${resBody.details.length > 1 ? ` (+${resBody.details.length - 1} more)` : ""}`
            : resBody.error || `Document generation failed (${res.status})`,
        );
      }
      console.log("[handleSubmit] ✅ Export documents generated");
    } catch (err) {
      console.error("[handleSubmit] Export generation failed:", err);
      setExportsError(
        err instanceof Error
          ? `Payroll submitted, but document generation failed: ${err.message}. You can retry from the Exports page.`
          : "Payroll submitted, but document generation failed. You can retry from the Exports page.",
      );
    } finally {
      setGeneratingExports(false);
    }
  }

  async function handleCreatePeriod() {
    setPeriodFormError(null);
    const wd = Number(newPeriodWorkingDays);
    const rd = newPeriodRedDays === "" ? 0 : Number(newPeriodRedDays);
    if (!newPeriodWorkingDays || !Number.isInteger(wd) || wd <= 0) {
      setPeriodFormError("Enter a valid number of working days.");
      return;
    }
    if (!Number.isInteger(rd) || rd < 0) {
      setPeriodFormError("Enter a valid number of red days (0 if none).");
      return;
    }
    setCreatingPeriod(true);
    const { data, error } = await supabase
      .from("payroll_periods")
      .insert({
        year: selectedYear,
        month: selectedMonth,
        working_days: wd,
        red_days: rd,
        locked: false,
      })
      .select("id, year, month, working_days, red_days, locked")
      .single();
    setCreatingPeriod(false);

    if (error || !data) {
      setPeriodFormError(error?.message || "Could not create this payroll period.");
      return;
    }

    const newPeriod = data as PayrollPeriod;
    setPeriod(newPeriod);
    setSessionStatus("draft");
    const freshInputs: Record<string, EmployeeInput> = {};
    for (const emp of employees) freshInputs[emp.uuid] = blankInput(wd);
    setInputs(freshInputs);
    setNewPeriodWorkingDays("");
    setNewPeriodRedDays("");
  }

  async function handleSavePeriodDays() {
    if (!period) return;
    setPeriodFormError(null);
    const wd = Number(editWorkingDays);
    const rd = editRedDays === "" ? 0 : Number(editRedDays);
    if (!editWorkingDays || !Number.isInteger(wd) || wd <= 0) {
      setPeriodFormError("Enter a valid number of working days.");
      return;
    }
    if (!Number.isInteger(rd) || rd < 0) {
      setPeriodFormError("Enter a valid number of red days (0 if none).");
      return;
    }
    setSavingPeriodDays(true);
    const { error } = await supabase
      .from("payroll_periods")
      .update({ working_days: wd, red_days: rd })
      .eq("id", period.id);
    setSavingPeriodDays(false);

    if (error) {
      setPeriodFormError(error.message);
      return;
    }

    setPeriod({ ...period, working_days: wd, red_days: rd });

    // Working days changed — recompute full_days_worked for every employee
    // from the corrected figure, using their already-entered absence
    // counts, so meal eligibility / attendance reward / gross / net all
    // immediately reflect the correction instead of the old wrong number.
    setInputs((prev) => {
      const next: Record<string, EmployeeInput> = {};
      for (const [uuid, inp] of Object.entries(prev)) {
        next[uuid] = {
          ...inp,
          full_days_worked: Math.max(
            0,
            wd -
              inp.excused_full_days -
              inp.unexcused_full_days -
              inp.excused_half_days * 0.5 -
              inp.unexcused_half_days * 0.5,
          ),
        };
      }
      return next;
    });

    setEditingPeriodDays(false);
  }

  // ---------------------------------------------------------------------------
  // Reset session
  // ---------------------------------------------------------------------------
  async function verifyResetPassword(): Promise<boolean> {
    setResetError(null);
    const result = await verifyCurrentUserPassword(resetPassword);
    if (!result.ok) {
      setResetError(result.error);
      return false;
    }
    setResetPassword("");
    return true;
  }

  async function handleResetSession() {
    if (!period) return;
    setResetting(true);

    const { error: delErr } = await supabase
      .from("payroll_entries")
      .delete()
      .eq("period_id", period.id);

    if (delErr) {
      setResetError(`Reset failed: ${delErr.message}`);
      setResetting(false);
      return;
    }

    const periodDays = period.working_days ?? stdDays;
    const blanked: Record<string, EmployeeInput> = {};
    for (const emp of employees) {
      blanked[emp.uuid] = blankInput(periodDays);
    }
    setInputs(blanked);
    setShowResetModal(false);
    setSaveMsg("Session reset");
    setTimeout(() => setSaveMsg(null), 3000);
    setResetting(false);
  }

  async function confirmReset() {
    const ok = await verifyResetPassword();
    if (!ok) return;
    await handleResetSession();
  }

  async function handleDownloadAll() {
    if (!period) return;
    setDownloadAllError(null);
    setDownloadingAll(true);
    try {
      const { downloadAllForPeriod } = await import("@/lib/exports/downloadAll");
      await downloadAllForPeriod(period.year, period.month);
    } catch (err) {
      setDownloadAllError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingAll(false);
    }
}

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const tabLabels: Record<typeof view, string> = {
    attendance: "Attendance",
    loans: "Loans",
    overtime: "Overtime",
    taxOther: "Tax & Other",
    summary: "Pay summary",
    bpjs: "BPJS",
  };

  return (
    <div className="space-y-4">
      {/* Submit confirmation modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
        >
          <button
            className="absolute inset-0 bg-black/30"
            aria-label="Close"
            onClick={() => setShowSubmitModal(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
            <div className="text-lg font-semibold">Submit payroll?</div>
            <div className="mt-2 text-sm text-[var(--ikkimo-text-muted,#666)]">
              This will lock the payroll for {monthName(selectedMonth)}{" "}
              {selectedYear}. No further edits will be possible without admin
              intervention.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="rounded-xl border border-[var(--ikkimo-border)] px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white"
              >
                Confirm &amp; submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset session confirmation modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            className="absolute inset-0 bg-black/30"
            aria-label="Close"
            onClick={() => {
              setShowResetModal(false);
              setResetPassword("");
              setResetError(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
            <div className="text-lg font-semibold text-red-600">
              Reset session?
            </div>
            <div className="mt-2 text-sm text-[var(--ikkimo-text-muted,#666)]">
              This will permanently delete all saved attendance, loan,
              overtime, and adjustment data for every employee in{" "}
              {monthName(selectedMonth)} {selectedYear}. The period itself
              (working days, red days) is not affected. This cannot be
              undone.
            </div>

            <div className="mt-4 rounded-xl border border-[var(--ikkimo-border)] p-4">
              <div className="text-xs font-semibold">
                Confirm with your password
              </div>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => {
                  setResetPassword(e.target.value);
                  setResetError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmReset();
                }}
                placeholder="Password"
                autoComplete="current-password"
                className="mt-2 h-9 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              />
            </div>

            {resetError && (
              <p className="mt-2 text-xs text-red-600">{resetError}</p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetPassword("");
                  setResetError(null);
                }}
                className="rounded-xl border border-[var(--ikkimo-border)] px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                disabled={resetting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {resetting ? "Resetting…" : "Confirm reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">Payroll form</div>
              {sessionStatus === "draft" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  Draft
                </span>
              )}
              {sessionStatus === "submitted" && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Submitted
                </span>
              )}
            </div>
            <div className="mt-0.5 text-sm text-[var(--ikkimo-text-muted,#666)]">
              {period ? (
                <>
                  {monthName(period.month)} {period.year}
                  {isSubmitted || !editingPeriodDays ? (
                    <>
                      {period.working_days != null && (
                        <span className="ml-2">
                          · {period.working_days} working days
                        </span>
                      )}
                      {period.red_days != null && (
                        <span className="ml-2">· {period.red_days} red days</span>
                      )}
                      {!isSubmitted && (
                        <button
                          onClick={() => {
                            setEditWorkingDays(String(period.working_days ?? ""));
                            setEditRedDays(String(period.red_days ?? 0));
                            setPeriodFormError(null);
                            setEditingPeriodDays(true);
                          }}
                          className="ml-2 text-xs underline text-[var(--ikkimo-brand)]"
                        >
                          edit
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="ml-2 inline-flex items-center gap-1.5">
                      <input
                        type="number"
                        value={editWorkingDays}
                        onChange={(e) => setEditWorkingDays(e.target.value)}
                        placeholder="Working days"
                        className="w-24 rounded-md border border-[var(--ikkimo-border)] px-1.5 py-0.5 text-xs outline-none focus:border-[var(--ikkimo-brand)]"
                      />
                      <input
                        type="number"
                        value={editRedDays}
                        onChange={(e) => setEditRedDays(e.target.value)}
                        placeholder="Red days"
                        className="w-20 rounded-md border border-[var(--ikkimo-border)] px-1.5 py-0.5 text-xs outline-none focus:border-[var(--ikkimo-brand)]"
                      />
                      <button
                        onClick={handleSavePeriodDays}
                        disabled={savingPeriodDays}
                        className="rounded-md bg-[var(--ikkimo-brand)] px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {savingPeriodDays ? "…" : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingPeriodDays(false)}
                        className="text-xs text-[var(--ikkimo-text-muted,#888)] underline"
                      >
                        cancel
                      </button>
                    </span>
                  )}
                </>
              ) : periodReady ? (
                <span className="inline-flex items-center gap-1.5">
                  <span>No period yet for this month — enter:</span>
                  <input
                    type="number"
                    value={newPeriodWorkingDays}
                    onChange={(e) => setNewPeriodWorkingDays(e.target.value)}
                    placeholder="Working days"
                    className="w-24 rounded-md border border-[var(--ikkimo-border)] px-1.5 py-0.5 text-xs outline-none focus:border-[var(--ikkimo-brand)]"
                  />
                  <input
                    type="number"
                    value={newPeriodRedDays}
                    onChange={(e) => setNewPeriodRedDays(e.target.value)}
                    placeholder="Red days"
                    className="w-20 rounded-md border border-[var(--ikkimo-border)] px-1.5 py-0.5 text-xs outline-none focus:border-[var(--ikkimo-brand)]"
                  />
                  <button
                    onClick={handleCreatePeriod}
                    disabled={creatingPeriod}
                    className="rounded-md bg-[var(--ikkimo-brand)] px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {creatingPeriod ? "Starting…" : "Start session"}
                  </button>
                </span>
              ) : (
                "Loading…"
              )}
            </div>
            {periodFormError && (
              <div className="mt-1 text-xs text-red-600">{periodFormError}</div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {/* Period selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="rounded-xl border border-[var(--ikkimo-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {monthName(m)}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-[var(--ikkimo-border)] px-3 py-1.5 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              >
                {Array.from(
                  { length: 5 },
                  (_, i) => new Date().getFullYear() - 2 + i,
                ).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Save / submit actions */}
            {!loading && !error && settings && employees.length > 0 && (
              <div className="flex items-center gap-2">
                {saveMsg && (
                  <span className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                    {saveMsg}
                  </span>
                )}
                {generatingExports && (
                  <span className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                    Generating spreadsheet and payslips…
                  </span>
                )}
                {exportsError && (
                  <span className="text-xs text-red-600">{exportsError}</span>
                )}
                {isSubmitted ? (
                  <span className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--ikkimo-text-muted,#888)]">Payroll submitted — read only</span>
                    <button
                      onClick={handleDownloadAll}
                      disabled={downloadingAll}
                      className="rounded-lg border border-[var(--ikkimo-border)] px-2 py-1 font-medium hover:border-[var(--ikkimo-brand)] disabled:opacity-50"
                    >
                      {downloadingAll ? "Zipping…" : "Download all (.zip)"}
                    </button>
                    {downloadAllError && <span className="text-red-600">{downloadAllError}</span>}
                  </span>
                ) : (
                  <>
                    {/* Reset session button */}
                    <button
                      onClick={() => {
                        setShowResetModal(true);
                        setResetPassword("");
                        setResetError(null);
                      }}
                      disabled={saving || resetting || !period}
                      title={
                        !period
                          ? "No payroll period configured for this month"
                          : undefined
                      }
                      className="rounded-xl border border-red-200 px-4 py-1.5 text-sm text-red-600 hover:border-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Reset session
                    </button>

                    {/* Save button */}
                    <button
                      onClick={handleSave}
                      disabled={saving || isSubmitted || !period}
                      title={
                        !period
                          ? "No payroll period configured for this month"
                          : undefined
                      }
                      className="rounded-xl border border-[var(--ikkimo-border)] px-4 py-1.5 text-sm hover:border-[var(--ikkimo-brand)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {saving ? "Saving…" : "Save progress"}
                    </button>

                    {/* Submit button */}
                    {!isSubmitted && (
                      <button
                        onClick={() => setShowSubmitModal(true)}
                        disabled={saving || !period}
                        title={
                          !period
                            ? "No payroll period configured for this month"
                            : undefined
                        }
                        className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Submit payroll
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-4 flex flex-wrap gap-1 border-t border-[var(--ikkimo-border)] pt-4">
          {(
            ["attendance", "loans", "overtime", "taxOther", "summary", "bpjs"] as const
          ).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                view === v
                  ? "bg-[var(--ikkimo-brand)] text-white"
                  : "text-[var(--ikkimo-text-muted,#666)] hover:bg-[var(--ikkimo-surface,#f5f5f5)]"
              }`}
            >
              {tabLabels[v]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 text-sm">
          Loading…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 text-sm">
          Error: <span className="font-medium">{error}</span>
        </div>
      ) : !settings ? (
        <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 text-sm">
          No payroll settings found.
        </div>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 text-sm">
          No active employees found.
        </div>
      ) : (
        <>
          {/* ── ATTENDANCE ── */}
          {view === "attendance" && (
            <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white">
              <div className="border-b border-[var(--ikkimo-border)] px-5 py-3">
                <div className="text-sm font-semibold">Attendance</div>
                <div className="mt-0.5 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  Working days pulled from the payroll period (
                  {period?.working_days ?? stdDays} days). Full days attended
                  adjusts automatically based on absences.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)]">
                    <tr>
                      <Th>Employee</Th>
                      <Th center>Days worked</Th>
                      <th
                        colSpan={2}
                        className="border-l border-[var(--ikkimo-border)] px-3 py-2 text-center text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]"
                      >
                        Excused
                      </th>
                      <th
                        colSpan={2}
                        className="border-l border-[var(--ikkimo-border)] px-3 py-2 text-center text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]"
                      >
                        Unexcused
                      </th>
                      <th className="border-l border-[var(--ikkimo-border)] px-3 py-2 text-center text-xs font-semibold text-[var(--ikkimo-text-muted,#666)]">
                        Late minutes
                      </th>
                    </tr>
                    <tr className="border-b border-[var(--ikkimo-border)]">
                      <th />
                      <th />
                      <th className="border-l border-[var(--ikkimo-border)] px-3 py-1 text-center text-xs text-[var(--ikkimo-text-muted,#999)]">
                        Full
                      </th>
                      <th className="px-3 py-1 text-center text-xs text-[var(--ikkimo-text-muted,#999)]">
                        Half
                      </th>
                      <th className="border-l border-[var(--ikkimo-border)] px-3 py-1 text-center text-xs text-[var(--ikkimo-text-muted,#999)]">
                        Full
                      </th>
                      <th className="px-3 py-1 text-center text-xs text-[var(--ikkimo-text-muted,#999)]">
                        Half
                      </th>
                      <th className="border-l border-[var(--ikkimo-border)]" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ikkimo-border)]">
                    {employees.map((emp) => {
                      const inp =
                        inputs[emp.uuid] ??
                        blankInput(period?.working_days ?? stdDays);
                      return (
                        <tr
                          key={emp.uuid}
                          className="hover:bg-[var(--ikkimo-surface,#fafafa)]"
                        >
                          <EmpCell emp={emp} />
                          {/* Days worked — read-only, computed from period working days minus absences */}
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block w-14 rounded-md border border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#f5f5f5)] px-2 py-1 text-center text-sm tabular-nums text-[var(--ikkimo-text-muted,#999)] cursor-not-allowed select-none">
                              {inp.full_days_worked}
                            </span>
                          </td>
                          <td className="border-l border-[var(--ikkimo-border)] px-3 py-2 text-center">
                            <NumInput
                              value={inp.excused_full_days}
                              onChange={(v) =>
                                updateInput(emp.uuid, "excused_full_days", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <NumInput
                              value={inp.excused_half_days}
                              onChange={(v) =>
                                updateInput(emp.uuid, "excused_half_days", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="border-l border-[var(--ikkimo-border)] px-3 py-2 text-center">
                            <NumInput
                              value={inp.unexcused_full_days}
                              onChange={(v) =>
                                updateInput(emp.uuid, "unexcused_full_days", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <NumInput
                              value={inp.unexcused_half_days}
                              onChange={(v) =>
                                updateInput(emp.uuid, "unexcused_half_days", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="border-l border-[var(--ikkimo-border)] px-3 py-2 text-center">
                            <NumInput
                              value={inp.late_minutes_count}
                              onChange={(v) =>
                                updateInput(emp.uuid, "late_minutes_count", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── LOANS ── */}
          {view === "loans" && (
            <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white">
              <div className="border-b border-[var(--ikkimo-border)] px-5 py-3">
                <div className="text-sm font-semibold">Loans</div>
                <div className="mt-0.5 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  Record repayments and any new loan taken this period.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)]">
                    <tr>
                      <Th>Employee</Th>
                      <Th right>Current balance</Th>
                      <Th right>Repayment (IDR)</Th>
                      <Th right>New loan (IDR)</Th>
                      <Th right>Projected balance</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ikkimo-border)]">
                    {payrollRows.map((row) => {
                      const inp =
                        inputs[row.employee.uuid] ?? blankInput(stdDays);
                      return (
                        <tr
                          key={row.employee.uuid}
                          className="hover:bg-[var(--ikkimo-surface,#fafafa)]"
                        >
                          <EmpCell emp={row.employee} />
                          <Td right muted={row.loan_balance === 0}>
                            {row.loan_balance > 0
                              ? formatIDR(row.loan_balance)
                              : "—"}
                          </Td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={inp.loan_repayment}
                              onChange={(v) =>
                                updateInput(
                                  row.employee.uuid,
                                  "loan_repayment",
                                  v,
                                )
                              }
                              step={10000}
                              wide
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={inp.new_loan}
                              onChange={(v) =>
                                updateInput(row.employee.uuid, "new_loan", v)
                              }
                              step={10000}
                              wide
                              disabled={isSubmitted}
                            />
                          </td>
                          <Td
                            right
                            red={row.projected_loan_balance > 0}
                            muted={row.projected_loan_balance <= 0}
                          >
                            {row.projected_loan_balance > 0
                              ? formatIDR(row.projected_loan_balance)
                              : "—"}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── OVERTIME ── */}
          {view === "overtime" && (
            <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white">
              <div className="border-b border-[var(--ikkimo-border)] px-5 py-3">
                <div className="text-sm font-semibold">Overtime</div>
                <div className="mt-0.5 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  Hours are paid at the multipliers set in Settings, based on
                  main salary ÷ standard working days ÷ hours per day.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)]">
                    <tr>
                      <Th>Employee</Th>
                      <Th center>OT1 hours</Th>
                      <Th center>OT2 hours</Th>
                      <Th center>OT3 hours</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ikkimo-border)]">
                    {employees.map((emp) => {
                      const inp = inputs[emp.uuid] ?? blankInput(stdDays);
                      return (
                        <tr
                          key={emp.uuid}
                          className="hover:bg-[var(--ikkimo-surface,#fafafa)]"
                        >
                          <EmpCell emp={emp} />
                          <td className="px-3 py-2 text-center">
                            <NumInput
                              value={inp.overtime_hours_1}
                              onChange={(v) =>
                                updateInput(emp.uuid, "overtime_hours_1", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <NumInput
                              value={inp.overtime_hours_2}
                              onChange={(v) =>
                                updateInput(emp.uuid, "overtime_hours_2", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <NumInput
                              value={inp.overtime_hours_3}
                              onChange={(v) =>
                                updateInput(emp.uuid, "overtime_hours_3", v)
                              }
                              disabled={isSubmitted}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── TAX & OTHER ── */}
          {view === "taxOther" && (
            <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white">
              <div className="border-b border-[var(--ikkimo-border)] px-5 py-3">
                <div className="text-sm font-semibold">Tax &amp; other adjustment</div>
                <div className="mt-0.5 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  &quot;Tax&quot; is always a deduction. &quot;Other&quot; is a one-off addition or deduction, applied after everything else — use a negative amount to deduct.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)]">
                    <tr>
                      <Th>Employee</Th>
                      <Th right>Tax (IDR)</Th>
                      <Th>Other (description + amount)</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ikkimo-border)]">
                    {employees.map((emp) => {
                      const inp = inputs[emp.uuid] ?? blankInput(stdDays);
                      return (
                        <tr
                          key={emp.uuid}
                          className="hover:bg-[var(--ikkimo-surface,#fafafa)]"
                        >
                          <EmpCell emp={emp} />
                          <td className="px-3 py-2 text-right">
                            <NumInput
                              value={inp.tax_idr}
                              onChange={(v) => updateInput(emp.uuid, "tax_idr", v)}
                              step={10000}
                              min={0}
                              wide
                              disabled={isSubmitted}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="space-y-1">
                              {inp.other_items.map((item, idx) => (
                                <div key={item.id} className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => updateOtherItem(emp.uuid, idx, "description", e.target.value)}
                                    placeholder="Description"
                                    disabled={isSubmitted}
                                    className="w-32 rounded border border-[var(--ikkimo-border)] px-1.5 py-0.5 text-xs"
                                  />
                                  <NumInput
                                    value={item.amount_idr}
                                    onChange={(v) => updateOtherItem(emp.uuid, idx, "amount_idr", v)}
                                    step={10000}
                                    min={-999999999}
                                    disabled={isSubmitted}
                                  />
                                  {!isSubmitted && (
                                    <button onClick={() => removeOtherItem(emp.uuid, idx)} className="text-xs text-red-500">×</button>
                                  )}
                                </div>
                              ))}
                              {!isSubmitted && (
                                <button onClick={() => addOtherItem(emp.uuid)} className="text-xs text-[var(--ikkimo-brand)]">
                                  + Add item
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PAY SUMMARY ── */}
          {view === "summary" && (
            <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white">
              <div className="border-b border-[var(--ikkimo-border)] px-5 py-3">
                <div className="text-sm font-semibold">Pay summary</div>
                <div className="mt-0.5 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  Click a row to expand the full breakdown.
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)]">
                    <tr>
                      <Th>Employee</Th>
                      <Th right>Main salary</Th>
                      <Th right>Gross</Th>
                      <Th right>Deductions</Th>
                      <Th right>Net pay</Th>
                      <Th center>Detail</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--ikkimo-border)]">
                    {payrollRows.map((row) => {
                      const id = row.employee.uuid;
                      const expanded = expandedId === id;
                      const totalDeductions = row.total_deductions;
                      return (
                        <Fragment key={id}>
                          <tr className="hover:bg-[var(--ikkimo-surface,#fafafa)]">
                            <EmpCell emp={row.employee} />
                            <Td right>{formatIDR(row.main_salary)}</Td>
                            <Td right>{formatIDR(row.gross)}</Td>
                            <Td right red={totalDeductions > 0}>
                              {totalDeductions > 0
                                ? `− ${formatIDR(totalDeductions)}`
                                : "—"}
                            </Td>
                            <Td right>
                              <span className="font-semibold">
                                {formatIDR(row.net_pay)}
                              </span>
                            </Td>
                            <td className="px-3 py-2 text-center">
                              <button
                                onClick={() =>
                                  setExpandedId(expanded ? null : id)
                                }
                                className="rounded-lg border border-[var(--ikkimo-border)] px-2 py-0.5 text-xs hover:border-[var(--ikkimo-brand)]"
                              >
                                {expanded ? "Hide" : "Show"}
                              </button>
                            </td>
                          </tr>
                          {expanded && <BreakdownCard row={row} />}
                        </Fragment>
                      );
                    })}

                    <tr className="border-t-2 border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)] font-semibold">
                      <Td>Totals</Td>
                      <Td right>{formatIDR(totals.main_salary)}</Td>
                      <Td right>{formatIDR(totals.gross)}</Td>
                      <Td
                        right
                        red
                      >{`− ${formatIDR(totals.total_deductions)}`}</Td>
                      <Td right>
                        <span className="font-bold">
                          {formatIDR(totals.net_pay)}
                        </span>
                      </Td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── BPJS ── */}
          {view === "bpjs" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryTile
                  label="Total employee BPJS deductions"
                  value={formatIDR(
                    totals.bpjs_employee_jht + totals.bpjs_employee_jp,
                  )}
                  hint="JHT + JP — deducted from employee net pay"
                />
                <SummaryTile
                  label="Total company BPJS liability"
                  value={formatIDR(totals.company_bpjs_total)}
                  hint="All components including employee share — paid to government"
                />
                <SummaryTile
                  label="Total net pay to employees"
                  value={formatIDR(totals.net_pay)}
                  hint="After all deductions"
                />
              </div>
              <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white">
                <div className="border-b border-[var(--ikkimo-border)] px-5 py-3">
                  <div className="text-sm font-semibold">BPJS breakdown</div>
                  <div className="mt-0.5 text-xs text-[var(--ikkimo-text-muted,#666)]">
                    Calculated on main salary (basic + position + skill grade).
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)]">
                      <tr>
                        <Th>Employee</Th>
                        <Th right>Main salary</Th>
                        <Th right>Emp. JHT</Th>
                        <Th right>Emp. JP</Th>
                        <Th right>Co. JHT</Th>
                        <Th right>Co. JKM</Th>
                        <Th right>Co. JKK</Th>
                        <Th right>Co. JP</Th>
                        <Th right>Co. total</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ikkimo-border)]">
                      {payrollRows.map((row) => (
                        <tr
                          key={row.employee.uuid}
                          className="hover:bg-[var(--ikkimo-surface,#fafafa)]"
                        >
                          <EmpCell emp={row.employee} />
                          <Td right>{formatIDR(row.main_salary)}</Td>
                          <Td right>{formatIDR(row.bpjs_employee_jht)}</Td>
                          <Td right muted={!row.employee.gets_bpjs_jp}>
                            {row.employee.gets_bpjs_jp
                              ? formatIDR(row.bpjs_employee_jp)
                              : "—"}
                          </Td>
                          <Td right>{formatIDR(row.bpjs_company_jht)}</Td>
                          <Td right>{formatIDR(row.bpjs_company_jkm)}</Td>
                          <Td right>{formatIDR(row.bpjs_company_jkk)}</Td>
                          <Td right muted={!row.employee.gets_bpjs_jp}>
                            {row.employee.gets_bpjs_jp
                              ? formatIDR(row.bpjs_company_jp)
                              : "—"}
                          </Td>
                          <Td right>
                            <span className="font-semibold">
                              {formatIDR(row.company_bpjs_total)}
                            </span>
                          </Td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-[var(--ikkimo-border)] bg-[var(--ikkimo-surface,#fafafa)] font-semibold">
                        <Td>Totals</Td>
                        <Td right>{formatIDR(totals.main_salary)}</Td>
                        <Td right>{formatIDR(totals.bpjs_employee_jht)}</Td>
                        <Td right>{formatIDR(totals.bpjs_employee_jp)}</Td>
                        <Td right>{formatIDR(totals.bpjs_company_jht)}</Td>
                        <Td right>{formatIDR(totals.bpjs_company_jkm)}</Td>
                        <Td right>{formatIDR(totals.bpjs_company_jkk)}</Td>
                        <Td right>{formatIDR(totals.bpjs_company_jp)}</Td>
                        <Td right>
                          <span className="font-bold">
                            {formatIDR(totals.company_bpjs_total)}
                          </span>
                        </Td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default export: wraps the page in Suspense because PayrollFormPageInner
// calls useSearchParams(), which requires a Suspense boundary above it.
// ---------------------------------------------------------------------------

export default function PayrollFormPage() {
  return (
    <Suspense fallback={null}>
      <PayrollFormPageInner />
    </Suspense>
  );
}