// ---------------------------------------------------------------------------
// Generates a single-employee payslip as an .xlsx workbook (ExcelJS).
//
// Loads the actual company template (public/templates/Payslip_Template.xlsx
// — the cleaned PAYSLIP sheet, dead historical tabs and broken VLOOKUPs
// removed) and writes values straight into its real cells. All fonts,
// borders, merges, the logo image, and page setup come from the template
// file itself — nothing to keep visually in sync here.
//
// Reads only from the stored payroll_entries breakdown — performs no pay
// calculation.
//
// The three bold totals (Gross Salary / Deduction / Take Home Pay) are
// always written as the exact stored numbers (entry.gross_idr,
// entry.total_deductions_idr, entry.salary_to_pay), overriding the
// template's own SUM/subtraction formulas, so they're guaranteed correct.
//
// Per product decision: only income tax is wired up this pass. THR and the
// "Lainnya / Others" lines stay blank, same as today. BPJS Kesehatan is now
// wired to S17.
// Loan repayment / new loan / other adjustment have no line on this
// document yet — deferred. The "AL / DP" table near the bottom is
// unrelated to the loan columns and is filled in by hand.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import type { ExportRow } from "./types";

export type CompanyInfo = {
  name: string;
  logoPngBase64?: string | null; // unused -- the logo is baked into the template image itself
};

export type PayslipContext = {
  company: CompanyInfo;
  year: number;
  month: number;
  payslipDate: Date;
};

const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "payslip_template.xlsx");

function loadTemplateBuffer(): ArrayBuffer {
  const buf = fs.readFileSync(TEMPLATE_PATH);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

function monthsBetween(start: Date, end: Date): number {
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  return Math.max(months, 0);
}

export async function buildSinglePayslipWorkbook(
  row: ExportRow,
  ctx: PayslipContext,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(loadTemplateBuffer());

  const ws = wb.getWorksheet("PAYSLIP");
  if (!ws) throw new Error('Payslip template is missing its "PAYSLIP" sheet');

  const emp = row.employee;
  const entry = row.entry;
  const empName = emp.preferred_name ?? emp.employee_name;

  // ---- Header -------------------------------------------------------------
  ws.getCell("D3").value = ctx.company.name;
  ws.getCell("S4").value = emp.employee_code;
  ws.getCell("E6").value = empName;
  ws.getCell("P6").value = ctx.payslipDate;
  ws.getCell("E7").value = emp.positions?.name ?? "-";
  ws.getCell("E8").value = emp.department ?? "-";

  if (emp.start_date) {
    const startDate = new Date(emp.start_date);
    ws.getCell("P7").value = startDate;
    ws.getCell("P8").value = monthsBetween(startDate, ctx.payslipDate);
  }

  // ---- Earnings (G12:G18) ---------------------------------------------------
  // main_salary_idr is basic + position allowance + skill grade combined;
  // position allowance and skill grade are already stored separately, so
  // pure "Gaji Pokok / Basic Salary" is just the remainder — no new column
  // needed.
  const basicOnly =
    entry.main_salary_idr - entry.position_allowance_idr - entry.skill_grade_increase_idr;
  ws.getCell("G12").value = basicOnly;
  ws.getCell("G13").value = entry.position_allowance_idr;
  ws.getCell("G14").value = entry.meal_allowance_idr;
  ws.getCell("G15").value = entry.overtime_pay_idr;
  ws.getCell("G17").value = entry.attendance_reward_idr;
  ws.getCell("G18").value = entry.other_adjustment_positive_idr || undefined;
  // G16 (THR) intentionally left blank — not tracked yet.

  // ---- Deductions (S12:S18) -------------------------------------------------
  ws.getCell("S12").value = entry.unexcused_deduction_idr;
  ws.getCell("S13").value = entry.lateness_deduction_idr;
  ws.getCell("S14").value = entry.tax_idr; // NEW — the actual point of this pass
  ws.getCell("S15").value = entry.bpjs_employee_jht_idr;
  ws.getCell("S16").value = entry.bpjs_employee_jp_idr;
  ws.getCell("S17").value = entry.bpjs_employee_kesehatan_idr || undefined;
  ws.getCell("S18").value = entry.other_adjustment_negative_idr
    ? Math.abs(entry.other_adjustment_negative_idr)
    : undefined;

  // ---- Bold totals — exact stored numbers, not the template's formulas ----
  ws.getCell("E25").value = entry.gross_idr;
  ws.getCell("P25").value = entry.total_deductions_idr;
  ws.getCell("E28").value = entry.salary_to_pay;

  // ---- Bank info ------------------------------------------------------------
  ws.getCell("E31").value = emp.bank ?? "-";
  ws.getCell("E32").value = emp.bank_account ?? "-";
  ws.getCell("E33").value = emp.bank_account_name ?? "-";

  return wb;
}