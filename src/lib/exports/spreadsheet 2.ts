// ---------------------------------------------------------------------------
// Builds the "full spreadsheet" export — one sheet, one row per employee,
// every computed pay field, with a totals row at the bottom.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import type { PayrollRow } from "./payrollRow";
import { sumRows, monthName } from "./payrollRow";

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
  get: (r: PayrollRow) => string | number;
};

const COLUMNS: Column[] = [
  { header: "Employee code", key: "employee_code", width: 14, get: (r) => r.employee.employee_code },
  { header: "Name", key: "employee_name", width: 24, get: (r) => r.employee.employee_name },
  { header: "Department", key: "department", width: 16, get: (r) => r.employee.department ?? "" },
  { header: "Position", key: "position", width: 18, get: (r) => r.employee.positions?.name ?? "" },
  { header: "Basic", key: "basic", width: 14, money: true, get: (r) => r.basic },
  { header: "Position allowance", key: "position_allowance", width: 14, money: true, get: (r) => r.position_allowance },
  { header: "Skill grade increase", key: "skill_grade_increase", width: 14, money: true, get: (r) => r.skill_grade_increase },
  { header: "Housing allowance", key: "housing_allowance", width: 14, money: true, get: (r) => r.housing_allowance },
  { header: "Meal allowance", key: "meal_allowance", width: 14, money: true, get: (r) => r.meal_allowance },
  { header: "Overtime pay", key: "overtime_pay", width: 14, money: true, get: (r) => r.overtime_pay },
  { header: "Attendance reward", key: "attendance_reward", width: 14, money: true, get: (r) => r.attendance_reward },
  { header: "Other adjustment", key: "other_adjustment", width: 14, money: true, get: (r) => r.other_adjustment },
  { header: "Gross", key: "gross", width: 15, money: true, get: (r) => r.gross },
  { header: "Unexcused deduction", key: "unexcused_deduction", width: 14, money: true, get: (r) => r.unexcused_deduction },
  { header: "Lateness deduction", key: "lateness_deduction", width: 14, money: true, get: (r) => r.lateness_deduction },
  { header: "BPJS employee JHT", key: "bpjs_employee_jht", width: 14, money: true, get: (r) => r.bpjs_employee_jht },
  { header: "BPJS employee JP", key: "bpjs_employee_jp", width: 14, money: true, get: (r) => r.bpjs_employee_jp },
  { header: "Loan repayment", key: "loan_repayment", width: 14, money: true, get: (r) => r.loan_repayment },
  { header: "New loan", key: "new_loan", width: 14, money: true, get: (r) => r.new_loan },
  { header: "Loan balance (end)", key: "projected_loan_balance", width: 14, money: true, get: (r) => r.projected_loan_balance },
  { header: "Net pay", key: "net_pay", width: 16, money: true, get: (r) => r.net_pay },
  { header: "BPJS company JHT", key: "bpjs_company_jht", width: 14, money: true, get: (r) => r.bpjs_company_jht },
  { header: "BPJS company JKM", key: "bpjs_company_jkm", width: 14, money: true, get: (r) => r.bpjs_company_jkm },
  { header: "BPJS company JKK", key: "bpjs_company_jkk", width: 14, money: true, get: (r) => r.bpjs_company_jkk },
  { header: "BPJS company JP", key: "bpjs_company_jp", width: 14, money: true, get: (r) => r.bpjs_company_jp },
  { header: "Total company BPJS", key: "company_bpjs_total", width: 16, money: true, get: (r) => r.company_bpjs_total },
  { header: "Bank", key: "bank", width: 12, get: (r) => r.employee.bank ?? "" },
  { header: "Bank account", key: "bank_account", width: 18, get: (r) => r.employee.bank_account ?? "" },
  { header: "Account name", key: "bank_account_name", width: 22, get: (r) => r.employee.bank_account_name ?? "" },
];

const MONEY_COL_INDICES = COLUMNS.reduce<number[]>((acc, col, i) => {
  if (col.money) acc.push(i + 1);
  return acc;
}, []);

export async function buildPayrollSpreadsheet(
  rows: PayrollRow[],
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
    const dataRow = ws.getRow(i);
    dataRow.eachCell((cell) => {
      cell.font = { name: "Arial", size: 10 };
    });
  }

  const totals = sumRows(rows);
  const totalsRowValues = COLUMNS.map((c) => {
    switch (c.key) {
      case "employee_code":
        return "TOTAL";
      case "basic":
        return rows.reduce((a, r) => a + r.basic, 0);
      case "position_allowance":
        return rows.reduce((a, r) => a + r.position_allowance, 0);
      case "skill_grade_increase":
        return rows.reduce((a, r) => a + r.skill_grade_increase, 0);
      case "housing_allowance":
        return totals.housing_allowance;
      case "meal_allowance":
        return totals.meal_allowance;
      case "overtime_pay":
        return totals.overtime_pay;
      case "attendance_reward":
        return totals.attendance_reward;
      case "other_adjustment":
        return totals.other_adjustment;
      case "gross":
        return totals.gross;
      case "unexcused_deduction":
        return totals.unexcused_deduction;
      case "lateness_deduction":
        return totals.lateness_deduction;
      case "bpjs_employee_jht":
        return totals.bpjs_employee_jht;
      case "bpjs_employee_jp":
        return totals.bpjs_employee_jp;
      case "loan_repayment":
        return totals.loan_repayment;
      case "new_loan":
        return rows.reduce((a, r) => a + r.new_loan, 0);
      case "projected_loan_balance":
        return rows.reduce((a, r) => a + r.projected_loan_balance, 0);
      case "net_pay":
        return totals.net_pay;
      case "bpjs_company_jht":
        return totals.bpjs_company_jht;
      case "bpjs_company_jkm":
        return totals.bpjs_company_jkm;
      case "bpjs_company_jkk":
        return totals.bpjs_company_jkk;
      case "bpjs_company_jp":
        return totals.bpjs_company_jp;
      case "company_bpjs_total":
        return totals.company_bpjs_total;
      default:
        return "";
    }
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
