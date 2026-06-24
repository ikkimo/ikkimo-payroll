// ---------------------------------------------------------------------------
// Generates a single-employee payslip as an .xlsx workbook (ExcelJS).
// Reads only from the stored payroll_entries breakdown — performs no pay
// calculation. Mirrors the company's existing Payslip_Template.xlsx layout.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import type { ExportRow } from "./types";
import { monthName, monthNameId } from "./types";

export type CompanyInfo = {
  name: string;
  logoPngBase64?: string | null;
};

export type PayslipContext = {
  company: CompanyInfo;
  year: number;
  month: number;
  payslipDate: Date;
};

const THIN = { style: "thin" as const, color: { argb: "FFBFBFBF" } };
const HEADER_FILL: ExcelJS.Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFE7E6E6" },
};

function setLabelValue(
  ws: ExcelJS.Worksheet,
  row: number,
  labelCol: string,
  label: string,
  valueCol: string,
  value: string | number,
  opts?: { bold?: boolean; numFmt?: string },
) {
  const labelCell = ws.getCell(`${labelCol}${row}`);
  labelCell.value = label;
  labelCell.font = { name: "Arial", size: 11, bold: !!opts?.bold };

  const valueCell = ws.getCell(`${valueCol}${row}`);
  valueCell.value = value;
  valueCell.font = { name: "Arial", size: 11, bold: !!opts?.bold };
  if (opts?.numFmt) valueCell.numFmt = opts.numFmt;
  valueCell.alignment = { horizontal: "right" };
}

export async function addPayslipSheet(
  wb: ExcelJS.Workbook,
  row: ExportRow,
  ctx: PayslipContext,
  sheetName: string,
): Promise<ExcelJS.Worksheet> {
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9,
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0, footer: 0 },
    },
  });

  ws.columns = [
    { width: 2.4 }, { width: 1.1 }, { width: 20 }, { width: 1.6 },
    { width: 24 }, { width: 2 }, { width: 14 }, { width: 2 },
    { width: 16 }, { width: 2 }, { width: 12 }, { width: 1.6 }, { width: 16 },
  ];

  const emp = row.employee;
  const entry = row.entry;
  const empName = emp.preferred_name ?? emp.employee_name;

  ws.mergeCells("C2:G3");
  const companyCell = ws.getCell("C2");
  companyCell.value = ctx.company.name;
  companyCell.font = { name: "Arial", size: 16, bold: true };
  companyCell.alignment = { vertical: "middle" };

  if (ctx.company.logoPngBase64) {
    const imageId = wb.addImage({ base64: ctx.company.logoPngBase64, extension: "png" });
    ws.addImage(imageId, { tl: { col: 8, row: 1 }, ext: { width: 40, height: 40 } });
  }

  ws.mergeCells("I2:K2");
  const titleCell = ws.getCell("I2");
  titleCell.value = "PAYSLIP";
  titleCell.font = { name: "Arial", size: 12, bold: true };
  titleCell.fill = HEADER_FILL;
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("I3:K3");
  const subtitleCell = ws.getCell("I3");
  subtitleCell.value = "Slip gaji / Employee payslip";
  subtitleCell.font = { name: "Arial", size: 9, italic: true };
  subtitleCell.alignment = { horizontal: "center" };

  let r = 5;
  setLabelValue(ws, r, "C", "Nama / Name", "E", empName);
  setLabelValue(ws, r, "I", "Periode / Period", "K", `${monthNameId(ctx.month)} / ${monthName(ctx.month)} ${ctx.year}`);
  r++;
  setLabelValue(ws, r, "C", "Jabatan / Position", "E", emp.positions?.name ?? "-");
  setLabelValue(ws, r, "I", "Tgl slip / Payslip date", "K", ctx.payslipDate.toLocaleDateString("en-GB"));
  r++;
  setLabelValue(ws, r, "C", "Nº ID / Employee code", "E", emp.employee_code);
  setLabelValue(ws, r, "I", "Divisi / Department", "K", emp.department ?? "-");

  r += 2;

  const sectionRow = r;
  ws.getCell(`C${sectionRow}`).value = "PENERIMAAN / Earnings";
  ws.getCell(`C${sectionRow}`).font = { name: "Arial", size: 12, bold: true };
  ws.getCell(`I${sectionRow}`).value = "POTONGAN / Deductions";
  ws.getCell(`I${sectionRow}`).font = { name: "Arial", size: 12, bold: true };
  r += 1;

  const earnings: Array<[string, number]> = [
    ["Gaji pokok & tunjangan / Basic + allowances", entry.main_salary_idr],
  ];
  if (entry.housing_allowance_idr > 0) earnings.push(["Tunjangan perumahan / Housing", entry.housing_allowance_idr]);
  if (entry.meal_allowance_idr > 0) earnings.push([`Uang makan / Meal (${entry.meal_eligible_days}d)`, entry.meal_allowance_idr]);
  if (entry.overtime_pay_idr > 0) earnings.push(["Lembur / Overtime", entry.overtime_pay_idr]);
  if (entry.attendance_reward_idr > 0) earnings.push(["Bonus kehadiran / Attendance reward", entry.attendance_reward_idr]);
  if (entry.other_adjustment_idr > 0) earnings.push(["Lainnya / Other adjustment", entry.other_adjustment_idr]);

  const deductions: Array<[string, number | null]> = [
    ["Tanpa keterangan / Unexcused absence", entry.unexcused_deduction_idr || null],
    ["Keterlambatan / Lateness", entry.lateness_deduction_idr || null],
    ["Pajak penghasilan (PPh21) / Income tax", null],
    ["BPJS Kesehatan / Health insurance", null],
    ["BPJS JHT", entry.bpjs_employee_jht_idr || null],
    ["BPJS JP", entry.bpjs_employee_jp_idr || null],
    ["Cicilan pinjaman / Loan repayment", entry.loan_repayment_idr || null],
  ];
  if (entry.other_adjustment_idr < 0) deductions.push(["Lainnya / Other adjustment", Math.abs(entry.other_adjustment_idr)]);

  const earningsStartRow = r;
  const linesCount = Math.max(earnings.length, deductions.length);

  for (let i = 0; i < linesCount; i++) {
    const lr = r + i;
    if (earnings[i]) {
      ws.getCell(`C${lr}`).value = earnings[i][0];
      ws.getCell(`C${lr}`).font = { name: "Arial", size: 10 };
      const v = ws.getCell(`E${lr}`);
      v.value = earnings[i][1];
      v.numFmt = "#,##0";
      v.font = { name: "Arial", size: 10 };
      v.alignment = { horizontal: "right" };
    }
    if (deductions[i]) {
      ws.getCell(`I${lr}`).value = deductions[i][0];
      ws.getCell(`I${lr}`).font = { name: "Arial", size: 10 };
      const v = ws.getCell(`K${lr}`);
      v.value = deductions[i][1] ?? "";
      if (deductions[i][1] !== null) v.numFmt = "#,##0";
      v.font = { name: "Arial", size: 10 };
      v.alignment = { horizontal: "right" };
    }
  }

  r = earningsStartRow + linesCount + 1;

  const totalDeductions =
    entry.unexcused_deduction_idr +
    entry.lateness_deduction_idr +
    entry.bpjs_employee_jht_idr +
    entry.bpjs_employee_jp_idr +
    entry.loan_repayment_idr +
    (entry.other_adjustment_idr < 0 ? Math.abs(entry.other_adjustment_idr) : 0);

  ws.getCell(`C${r}`).value = "Gaji kotor / Gross salary";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 11, bold: true };
  ws.getCell(`C${r}`).border = { top: THIN };
  const grossCell = ws.getCell(`E${r}`);
  grossCell.value = entry.gross_idr;
  grossCell.numFmt = "#,##0";
  grossCell.font = { name: "Arial", size: 11, bold: true };
  grossCell.alignment = { horizontal: "right" };
  grossCell.border = { top: THIN };

  ws.getCell(`I${r}`).value = "Total potongan / Total deductions";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 11, bold: true };
  ws.getCell(`I${r}`).border = { top: THIN };
  const dedCell = ws.getCell(`K${r}`);
  dedCell.value = totalDeductions;
  dedCell.numFmt = "#,##0";
  dedCell.font = { name: "Arial", size: 11, bold: true };
  dedCell.alignment = { horizontal: "right" };
  dedCell.border = { top: THIN };

  r += 2;

  ws.mergeCells(`C${r}:G${r}`);
  const thpLabel = ws.getCell(`C${r}`);
  thpLabel.value = "GAJI BERSIH / TAKE HOME PAY";
  thpLabel.font = { name: "Arial", size: 12, bold: true };
  thpLabel.fill = HEADER_FILL;
  thpLabel.alignment = { vertical: "middle" };

  ws.mergeCells(`I${r}:K${r}`);
  const thpValue = ws.getCell(`I${r}`);
  thpValue.value = entry.salary_to_pay;
  thpValue.numFmt = '"Rp"#,##0';
  thpValue.font = { name: "Arial", size: 14, bold: true };
  thpValue.fill = HEADER_FILL;
  thpValue.alignment = { horizontal: "right", vertical: "middle" };

  r += 2;

  setLabelValue(ws, r, "C", "Bank", "E", emp.bank ?? "-");
  r++;
  setLabelValue(ws, r, "C", "Nº rekening / Account no.", "E", emp.bank_account ?? "-");
  r++;
  setLabelValue(ws, r, "C", "Nama penerima / Beneficiary", "E", emp.bank_account_name ?? "-");

  r += 3;

  ws.getCell(`C${r}`).value = "Dibuat oleh / Prepared by,";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 10, bold: true };
  ws.getCell(`I${r}`).value = "Diterima oleh / Received by,";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 10, bold: true };

  r += 4;
  ws.getCell(`C${r}`).value = "(_____________________)";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 10 };
  ws.getCell(`I${r}`).value = "(_____________________)";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 10 };

  r += 1;
  ws.getCell(`C${r}`).value = "Administrasi";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 9, italic: true };
  ws.getCell(`I${r}`).value = empName;
  ws.getCell(`I${r}`).font = { name: "Arial", size: 9, italic: true };

  r += 3;
  ws.getCell(`C${r}`).value = "Dokumen ini dibuat otomatis oleh sistem / This is a system-generated document.";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 8, italic: true, color: { argb: "FF888888" } };

  return ws;
}

export async function buildSinglePayslipWorkbook(
  row: ExportRow,
  ctx: PayslipContext,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = ctx.company.name;
  wb.created = new Date();
  await addPayslipSheet(wb, row, ctx, "Payslip");
  return wb;
}
