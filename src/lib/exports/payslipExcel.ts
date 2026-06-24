// ---------------------------------------------------------------------------
// Generates a single-employee payslip as an .xlsx workbook (ExcelJS).
//
// Instead of recreating the company's payslip layout cell-by-cell in code,
// this loads the actual template asset (public/templates/Payslip_Template.xlsx
// — the official Payslip_Template_1.xlsx with the dead historical sheets and
// broken VLOOKUPs removed) and writes values straight into its named cells.
// All fonts/borders/merges/page setup/logo come from the template file
// itself, so visual fidelity is guaranteed -- nothing to keep in sync here.
//
// Reads only from the stored payroll_entries breakdown — performs no pay
// calculation.
//
// Known gaps, intentionally left blank/zero (per product decision):
//   - PPh21 income tax (S14)      — not tracked yet, to be wired up later.
//   - THR (G16)                   — paid once a year, 0 most periods.
//   - AL / DP table (I30:L31)     — always blank. Filled in by hand. Not
//                                    related to the loan columns at all.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import fs from "node:fs";
import path from "node:path";
import type { ExportRow } from "./types";

export type CompanyInfo = {
  name: string;
  logoPngBase64?: string | null; // unused now -- the logo is baked into the template image itself
};

export type PayslipContext = {
  company: CompanyInfo;
  year: number;
  month: number;
  payslipDate: Date;
};

const TEMPLATE_PATH = path.join(process.cwd(), "public", "templates", "Payslip_Template.xlsx");

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
  ws.getCell("E7").value = emp.positions?.name ?? "-";
  ws.getCell("E8").value = emp.department ?? "-";
  ws.getCell("P6").value = ctx.payslipDate;

  if (emp.start_date) {
    const start = new Date(emp.start_date);
    ws.getCell("P7").value = start;
    ws.getCell("P8").value = monthsBetween(start, ctx.payslipDate);
  }

  // ---- Earnings -------------------------------------------------------------
  // main_salary_idr = basic + position_allowance + skill_grade_increase
  // (see computeRow in payroll/page.tsx). Position allowance gets its own
  // line below, so back it out of "Basic Salary" here -- otherwise it would
  // be counted twice and inflate Gross Salary.
  const basicLine = entry.main_salary_idr - entry.position_allowance_idr;

  const otherAdj = entry.other_adjustment_idr || 0;
  const thr = 0; // paid once a year, not tracked per-period yet
  const pph21 = 0; // TODO: wire up once income tax is added

  ws.getCell("G12").value = basicLine;
  ws.getCell("G13").value = entry.position_allowance_idr;
  ws.getCell("G14").value = entry.meal_allowance_idr;
  ws.getCell("G15").value = entry.overtime_pay_idr;
  ws.getCell("G16").value = thr;
  ws.getCell("G17").value = entry.attendance_reward_idr;
  ws.getCell("G18").value = entry.housing_allowance_idr + Math.max(otherAdj, 0);

  // ---- Deductions -------------------------------------------------------------
  ws.getCell("S12").value = entry.unexcused_deduction_idr;
  ws.getCell("S13").value = entry.lateness_deduction_idr;
  ws.getCell("S14").value = pph21;
  ws.getCell("S15").value = entry.bpjs_employee_jht_idr;
  ws.getCell("S16").value = entry.bpjs_employee_jp_idr;
  ws.getCell("S17").value = 0; // BPJS Kesehatan -- not deducted from employee
  ws.getCell("S18").value = Math.max(-otherAdj, 0) + entry.loan_repayment_idr;

  // ---- Notes (free text, only filled if there's something to show) -----------
  if (entry.other_adjustment_note) ws.getCell("C20").value = entry.other_adjustment_note;

  // ---- Bank transfer block ---------------------------------------------------
  ws.getCell("E31").value = emp.bank ?? "-";
  ws.getCell("E32").value = emp.bank_account ?? "-";
  ws.getCell("E33").value = emp.bank_account_name ?? "-";

  // ---- Signature date ---------------------------------------------------------
  ws.getCell("Q28").value = ctx.payslipDate;

  // AL / DP (I30:L31) intentionally left untouched -- always blank, filled
  // in by hand, has nothing to do with the loan columns.

  // Totals (E25, P25, E28) are formulas baked into the template -- nothing
  // to set here, they recalculate from the cells above when the file opens.

  return wb;
}