// ---------------------------------------------------------------------------
// Builds the "full spreadsheet" export — one sheet, one row per employee,
// every stored pay field, with a totals row. Reads only; computes nothing.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import type { ExportRow } from "./types";
import { monthName } from "./types";

const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FF1F2937" },
};
const HEADER_FONT: Partial<ExcelJS.Font> = {
  name: "Arial",
  size: 10,
  bold: true,
  color: { argb: "FFFFFFFF" },
};
const TOTALS_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFF3F4F6" },
};

type Column = {
  header: string;
  key: string;
  width: number;
  money?: boolean;
  get: (r: ExportRow) => string | number;
};

const COLUMNS: Column[] = [
  { header: "Employee code", key: "employee_code", width: 14, get: (r) => r.employee.employee_code },
  { header: "Name", key: "employee_name", width: 24, get: (r) => r.employee.employee_name },
  { header: "Department", key: "department", width: 16, get: (r) => r.employee.department ?? "" },
  { header: "Position", key: "position", width: 18, get: (r) => r.employee.positions?.name ?? "" },
  { header: "Basic + allowances", key: "main_salary", width: 16, money: true, get: (r) => r.entry.main_salary_idr },
  { header: "Position allowance", key: "position_allowance", width: 14, money: true, get: (r) => r.entry.position_allowance_idr },
  { header: "Skill grade increase", key: "skill_grade_increase", width: 14, money: true, get: (r) => r.entry.skill_grade_increase_idr },
  { header: "Housing allowance", key: "housing_allowance", width: 14, money: true, get: (r) => r.entry.housing_allowance_idr },
  { header: "Meal allowance", key: "meal_allowance", width: 14, money: true, get: (r) => r.entry.meal_allowance_idr },
  { header: "Overtime pay", key: "overtime_pay", width: 14, money: true, get: (r) => r.entry.overtime_pay_idr },
  { header: "Attendance reward", key: "attendance_reward", width: 14, money: true, get: (r) => r.entry.attendance_reward_idr },
  { header: "Gross", key: "gross", width: 15, money: true, get: (r) => r.entry.gross_idr },
  { header: "Unexcused deduction", key: "unexcused_deduction", width: 14, money: true, get: (r) => r.entry.unexcused_deduction_idr },
  { header: "Lateness deduction", key: "lateness_deduction", width: 14, money: true, get: (r) => r.entry.lateness_deduction_idr },
  { header: "Tax", key: "tax", width: 14, money: true, get: (r) => r.entry.tax_idr },
  { header: "BPJS employee JHT", key: "bpjs_employee_jht", width: 14, money: true, get: (r) => r.entry.bpjs_employee_jht_idr },
  { header: "BPJS employee JP", key: "bpjs_employee_jp", width: 14, money: true, get: (r) => r.entry.bpjs_employee_jp_idr },
  { header: "Total deductions", key: "total_deductions", width: 16, money: true, get: (r) => r.entry.total_deductions_idr },
  { header: "Loan repayment", key: "loan_repayment", width: 14, money: true, get: (r) => r.entry.loan_repayment_idr },
  { header: "New loan", key: "new_loan", width: 14, money: true, get: (r) => r.entry.new_loan_idr },
  { header: "Other additions", key: "other_adjustment_positive", width: 14, money: true, get: (r) => r.entry.other_adjustment_positive_idr },
  { header: "Other deductions", key: "other_adjustment_negative", width: 14, money: true, get: (r) => r.entry.other_adjustment_negative_idr },
  { header: "Loan balance (before)", key: "loan_balance_before", width: 14, money: true, get: (r) => r.entry.loan_balance_before_idr },
  { header: "Loan balance (after)", key: "loan_balance_after", width: 14, money: true, get: (r) => r.entry.loan_balance_after_idr },
  { header: "Net pay", key: "net_pay", width: 16, money: true, get: (r) => r.entry.salary_to_pay },
  { header: "BPJS company JHT", key: "bpjs_company_jht", width: 14, money: true, get: (r) => r.entry.bpjs_company_jht_idr },
  { header: "BPJS company JKM", key: "bpjs_company_jkm", width: 14, money: true, get: (r) => r.entry.bpjs_company_jkm_idr },
  { header: "BPJS company JKK", key: "bpjs_company_jkk", width: 14, money: true, get: (r) => r.entry.bpjs_company_jkk_idr },
  { header: "BPJS company JP", key: "bpjs_company_jp", width: 14, money: true, get: (r) => r.entry.bpjs_company_jp_idr },
  { header: "Total company BPJS", key: "company_bpjs_total", width: 16, money: true, get: (r) => r.entry.company_bpjs_total_idr },
  { header: "Bank", key: "bank", width: 12, get: (r) => r.employee.bank ?? "" },
  { header: "Bank account", key: "bank_account", width: 18, get: (r) => r.employee.bank_account ?? "" },
  { header: "Account name", key: "bank_account_name", width: 22, get: (r) => r.employee.bank_account_name ?? "" },
];

const MONEY_COL_INDICES = COLUMNS.reduce<number[]>((acc, col, i) => {
  if (col.money) acc.push(i + 1);
  return acc;
}, []);

export async function buildPayrollSpreadsheet(
  rows: ExportRow[],
  year: number,
  month: number,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Ikkimo Payroll";
  wb.created = new Date();

  const ws = wb.addWorksheet(`${monthName(month)} ${year}`, {
    views: [{ state: "frozen", ySplit: 1, xSplit: 2 }],
  });

  ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  const headerRow = ws.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  headerRow.height = 28;

  for (const row of rows) {
    const values = COLUMNS.map((c) => c.get(row));
    const sheetRow = ws.addRow(values);
    for (const idx of MONEY_COL_INDICES) {
      sheetRow.getCell(idx).numFmt = "#,##0";
    }
  }

  for (let i = 2; i <= rows.length + 1; i++) {
    ws.getRow(i).eachCell((cell) => {
      cell.font = { name: "Arial", size: 10 };
    });
  }

  const sumOf = (get: (r: ExportRow) => number) =>
    rows.reduce((acc, r) => acc + (get(r) || 0), 0);

  const totalsRowValues = COLUMNS.map((c) => {
    if (c.key === "employee_code") return "TOTAL";
    if (!c.money) return "";
    return sumOf(c.get as (r: ExportRow) => number);
  });

  const totalsRow = ws.addRow(totalsRowValues);
  totalsRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true };
    cell.fill = TOTALS_FILL;
    cell.border = { top: { style: "double" } };
  });
  for (const idx of MONEY_COL_INDICES) {
    totalsRow.getCell(idx).numFmt = "#,##0";
  }

  ws.autoFilter = { from: "A1", to: `${ws.getColumn(COLUMNS.length).letter}1` };

  return wb;
}
