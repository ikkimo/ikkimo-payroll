// ---------------------------------------------------------------------------
// Generates a single-employee payslip as an .xlsx workbook (ExcelJS),
// laid out to match the company's existing "Payslip_Template.xlsx" —
// same field order, same bilingual labels, same bank/signature block —
// but populated live from computed PayrollRow data instead of brittle
// cross-sheet VLOOKUPs.
//
// A5 paper size is set via worksheet.pageSetup so the file prints correctly
// even though Excel itself is not a fixed-page-size medium like the PDF.
// ---------------------------------------------------------------------------

import ExcelJS from "exceljs";
import type { PayrollRow } from "./payrollRow";
import { monthName, monthNameId } from "./payrollRow";

export type CompanyInfo = {
  name: string;
  logoPngBase64?: string | null; // raw base64, no data: prefix
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

/**
 * Builds one payslip worksheet inside the given workbook for a single
 * employee/period. Call this once per employee when building a multi-sheet
 * workbook, or use buildSinglePayslipWorkbook for one file per employee.
 */
export async function addPayslipSheet(
  wb: ExcelJS.Workbook,
  row: PayrollRow,
  ctx: PayslipContext,
  sheetName: string,
): Promise<ExcelJS.Worksheet> {
  const ws = wb.addWorksheet(sheetName, {
    pageSetup: {
      paperSize: 9, // ISO A4; ExcelJS has no native A5 enum, so we scale via fitToPage below
      orientation: "portrait",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.4,
        right: 0.4,
        top: 0.4,
        bottom: 0.4,
        header: 0,
        footer: 0,
      },
    },
  });

  ws.columns = [
    { width: 2.4 }, // A
    { width: 1.1 }, // B
    { width: 20 }, // C
    { width: 1.6 }, // D
    { width: 24 }, // E
    { width: 2 }, // F
    { width: 14 }, // G
    { width: 2 }, // H
    { width: 16 }, // I
    { width: 2 }, // J
    { width: 12 }, // K
    { width: 1.6 }, // L
    { width: 16 }, // M
  ];

  const emp = row.employee;
  const empName = emp.preferred_name ?? emp.employee_name;

  // --- Header -------------------------------------------------------------
  ws.mergeCells("C2:G3");
  const companyCell = ws.getCell("C2");
  companyCell.value = ctx.company.name;
  companyCell.font = { name: "Arial", size: 16, bold: true };
  companyCell.alignment = { vertical: "middle" };

  if (ctx.company.logoPngBase64) {
    const imageId = wb.addImage({
      base64: ctx.company.logoPngBase64,
      extension: "png",
    });
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

  // --- Identity block -------------------------------------------------------
  let r = 5;
  setLabelValue(ws, r, "C", "Nama / Name", "E", empName);
  setLabelValue(ws, r, "I", "Periode / Period", "K", `${monthNameId(ctx.month)} / ${monthName(ctx.month)} ${ctx.year}`);
  r++;
  setLabelValue(ws, r, "C", "Jabatan / Position", "E", emp.positions?.name ?? "-");
  setLabelValue(ws, r, "I", "Tgl slip / Payslip date", "K", ctx.payslipDate.toLocaleDateString("en-GB"));
  r++;
  setLabelValue(ws, r, "C", "Nº ID / Employee code", "E", emp.employee_code);
  setLabelValue(ws, r, "I", "Divisi / Department", "K", emp.department ?? "-");
  r++;
  setLabelValue(ws, r, "C", "Mulai kerja / Start date", "E", emp.start_date ?? "-");

  r += 2;

  // --- Earnings / deductions headers --------------------------------------
  const sectionRow = r;
  ws.getCell(`C${sectionRow}`).value = "PENERIMAAN / Earnings";
  ws.getCell(`C${sectionRow}`).font = { name: "Arial", size: 12, bold: true };
  ws.getCell(`I${sectionRow}`).value = "POTONGAN / Deductions";
  ws.getCell(`I${sectionRow}`).font = { name: "Arial", size: 12, bold: true };
  r += 1;

  const earnings: Array<[string, number]> = [
    ["Gaji pokok / Basic salary", row.basic],
    ["Tunjangan jabatan / Position allowance", row.position_allowance],
  ];
  if (row.skill_grade_increase > 0) earnings.push(["Tunjangan keahlian / Skill grade", row.skill_grade_increase]);
  if (row.housing_allowance > 0) earnings.push(["Tunjangan perumahan / Housing", row.housing_allowance]);
  if (row.meal_allowance > 0) earnings.push([`Uang makan / Meal (${row.meal_eligible_days}d)`, row.meal_allowance]);
  if (row.overtime_pay > 0) earnings.push(["Lembur / Overtime", row.overtime_pay]);
  if (row.attendance_reward > 0) earnings.push(["Bonus kehadiran / Attendance reward", row.attendance_reward]);
  if (row.other_adjustment > 0) earnings.push(["Lainnya / Other adjustment", row.other_adjustment]);

  const deductions: Array<[string, number | null]> = [
    ["Tanpa keterangan / Unexcused absence", row.unexcused_deduction || null],
    ["Keterlambatan / Lateness", row.lateness_deduction || null],
    ["Pajak penghasilan (PPh21) / Income tax", null],
    ["BPJS Kesehatan / Health insurance", null],
    ["BPJS JHT", row.bpjs_employee_jht || null],
    ["BPJS JP", row.bpjs_employee_jp || null],
    ["Cicilan pinjaman / Loan repayment", row.loan_repayment || null],
  ];
  if (row.other_adjustment < 0) deductions.push(["Lainnya / Other adjustment", Math.abs(row.other_adjustment)]);

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

  // --- Totals ---------------------------------------------------------------
  const totalDeductions =
    row.unexcused_deduction +
    row.lateness_deduction +
    row.bpjs_employee_jht +
    row.bpjs_employee_jp +
    row.loan_repayment +
    (row.other_adjustment < 0 ? Math.abs(row.other_adjustment) : 0);

  ws.getCell(`C${r}`).value = "Gaji kotor / Gross salary";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 11, bold: true };
  ws.getCell(`E${r}`).value = row.gross;
  ws.getCell(`E${r}`).numFmt = "#,##0";
  ws.getCell(`E${r}`).font = { name: "Arial", size: 11, bold: true };
  ws.getCell(`E${r}`).alignment = { horizontal: "right" };
  ws.getCell(`E${r}`).border = { top: THIN };
  ws.getCell(`C${r}`).border = { top: THIN };

  ws.getCell(`I${r}`).value = "Total potongan / Total deductions";
  ws.getCell(`I${r}`).font = { name: "Arial", size: 11, bold: true };
  ws.getCell(`K${r}`).value = totalDeductions;
  ws.getCell(`K${r}`).numFmt = "#,##0";
  ws.getCell(`K${r}`).font = { name: "Arial", size: 11, bold: true };
  ws.getCell(`K${r}`).alignment = { horizontal: "right" };
  ws.getCell(`K${r}`).border = { top: THIN };
  ws.getCell(`I${r}`).border = { top: THIN };

  r += 2;

  // --- Take home pay --------------------------------------------------------
  ws.mergeCells(`C${r}:G${r}`);
  const thpLabel = ws.getCell(`C${r}`);
  thpLabel.value = "GAJI BERSIH / TAKE HOME PAY";
  thpLabel.font = { name: "Arial", size: 12, bold: true };
  thpLabel.fill = HEADER_FILL;
  thpLabel.alignment = { vertical: "middle" };

  ws.mergeCells(`I${r}:K${r}`);
  const thpValue = ws.getCell(`I${r}`);
  thpValue.value = row.net_pay;
  thpValue.numFmt = '"Rp"#,##0';
  thpValue.font = { name: "Arial", size: 14, bold: true };
  thpValue.fill = HEADER_FILL;
  thpValue.alignment = { horizontal: "right", vertical: "middle" };

  r += 2;

  // --- Bank details -----------------------------------------------------
  setLabelValue(ws, r, "C", "Bank", "E", emp.bank ?? "-");
  r++;
  setLabelValue(ws, r, "C", "Nº rekening / Account no.", "E", emp.bank_account ?? "-");
  r++;
  setLabelValue(ws, r, "C", "Nama penerima / Beneficiary", "E", emp.bank_account_name ?? "-");

  r += 3;

  // --- Signatures -----------------------------------------------------------
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
  ws.getCell(`C${r}`).value =
    "Dokumen ini dibuat otomatis oleh sistem / This is a system-generated document.";
  ws.getCell(`C${r}`).font = { name: "Arial", size: 8, italic: true, color: { argb: "FF888888" } };

  return ws;
}

/** Convenience: one workbook containing exactly one payslip sheet. */
export async function buildSinglePayslipWorkbook(
  row: PayrollRow,
  ctx: PayslipContext,
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = ctx.company.name;
  wb.created = new Date();
  await addPayslipSheet(wb, row, ctx, "Payslip");
  return wb;
}
