// ---------------------------------------------------------------------------
// A5 payslip PDF, built with @react-pdf/renderer.
// Reads only from the stored payroll_entries breakdown — no calculation.
// ---------------------------------------------------------------------------

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ExportRow } from "./types";
import { monthName, monthNameId } from "./types";
import type { CompanyInfo } from "./payslipExcel";

const A5_WIDTH_PT = 419.53;
const A5_HEIGHT_PT = 595.28;

const styles = StyleSheet.create({
  page: {
    width: A5_WIDTH_PT,
    height: A5_HEIGHT_PT,
    padding: 24,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1.5,
    borderBottomColor: "#1a1a1a",
    paddingBottom: 10,
    marginBottom: 10,
  },
  logo: { width: 32, height: 32, marginRight: 8 },
  companyName: { fontSize: 13, fontWeight: 700 },
  companySubtitle: { fontSize: 8, color: "#555", marginTop: 2 },
  badge: {
    marginLeft: "auto",
    backgroundColor: "#E7E6E6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  badgeText: { fontSize: 10, fontWeight: 700 },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
    paddingBottom: 8,
    marginBottom: 8,
  },
  infoCell: { width: "50%", marginBottom: 4 },
  infoLabel: { fontSize: 8, color: "#666" },
  infoValue: { fontSize: 9.5, fontWeight: 700, marginTop: 1 },
  columns: { flexDirection: "row", flex: 1 },
  column: { width: "50%", paddingRight: 6 },
  sectionTitle: { fontSize: 9, fontWeight: 700, marginBottom: 5, textTransform: "uppercase" },
  lineRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  lineLabel: { fontSize: 8.5, color: "#444" },
  lineValue: { fontSize: 8.5 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#999",
    marginTop: 4,
    paddingTop: 4,
  },
  totalLabel: { fontSize: 9, fontWeight: 700 },
  totalValue: { fontSize: 9, fontWeight: 700 },
  netPayBox: {
    marginTop: 10,
    backgroundColor: "#F2F2F2",
    borderRadius: 4,
    padding: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  netPayLabel: { fontSize: 9.5, fontWeight: 700 },
  netPayValue: { fontSize: 15, fontWeight: 700 },
  bankRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    fontSize: 7.5,
    color: "#666",
  },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16 },
  signatureCol: { width: "45%" },
  signatureLabel: { fontSize: 8, fontWeight: 700, marginBottom: 24 },
  signatureLine: { fontSize: 8, marginBottom: 2 },
  signatureSub: { fontSize: 7, color: "#888" },
  footer: {
    marginTop: "auto",
    borderTopWidth: 0.5,
    borderTopColor: "#ccc",
    paddingTop: 6,
    fontSize: 6.5,
    color: "#999",
    textAlign: "center",
  },
});

function fmtIDR(n: number): string {
  return Math.round(n || 0).toLocaleString("id-ID");
}

export type PayslipPdfProps = {
  row: ExportRow;
  company: CompanyInfo;
  year: number;
  month: number;
  payslipDate: Date;
  logoDataUri?: string | null;
};

export function PayslipDocument({ row, company, year, month, payslipDate, logoDataUri }: PayslipPdfProps) {
  const emp = row.employee;
  const entry = row.entry;
  const empName = emp.preferred_name ?? emp.employee_name;

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

  const totalDeductions =
    entry.unexcused_deduction_idr +
    entry.lateness_deduction_idr +
    entry.bpjs_employee_jht_idr +
    entry.bpjs_employee_jp_idr +
    entry.loan_repayment_idr +
    (entry.other_adjustment_idr < 0 ? Math.abs(entry.other_adjustment_idr) : 0);

  return (
    <Document>
      <Page size={{ width: A5_WIDTH_PT, height: A5_HEIGHT_PT }} style={styles.page}>
        <View style={styles.headerRow}>
          {logoDataUri ? <Image src={logoDataUri} style={styles.logo} /> : null}
          <View>
            <Text style={styles.companyName}>{company.name}</Text>
            <Text style={styles.companySubtitle}>Slip gaji karyawan / Employee payslip</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PAYSLIP</Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Nama / Name</Text>
            <Text style={styles.infoValue}>{empName}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Periode / Period</Text>
            <Text style={styles.infoValue}>{monthNameId(month)} / {monthName(month)} {year}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Nº ID / Employee code</Text>
            <Text style={styles.infoValue}>{emp.employee_code}</Text>
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.infoLabel}>Jabatan / Position</Text>
            <Text style={styles.infoValue}>{emp.positions?.name ?? "-"}</Text>
          </View>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Penerimaan / Earnings</Text>
            {earnings.map(([label, value]) => (
              <View style={styles.lineRow} key={label}>
                <Text style={styles.lineLabel}>{label}</Text>
                <Text style={styles.lineValue}>{fmtIDR(value)}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Kotor / Gross</Text>
              <Text style={styles.totalValue}>{fmtIDR(entry.gross_idr)}</Text>
            </View>
          </View>

          <View style={styles.column}>
            <Text style={styles.sectionTitle}>Potongan / Deductions</Text>
            {deductions.map(([label, value]) => (
              <View style={styles.lineRow} key={label}>
                <Text style={styles.lineLabel}>{label}</Text>
                <Text style={styles.lineValue}>{value !== null ? fmtIDR(value) : ""}</Text>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total potongan / Total ded.</Text>
              <Text style={styles.totalValue}>{fmtIDR(totalDeductions)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>Gaji bersih / Net pay</Text>
          <Text style={styles.netPayValue}>Rp {fmtIDR(entry.salary_to_pay)}</Text>
        </View>

        <View style={styles.bankRow}>
          <Text>{emp.bank ?? "-"} • {emp.bank_account ?? "-"}</Text>
          <Text>Dibuat / Generated: {payslipDate.toLocaleDateString("en-GB")}</Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Dibuat oleh / Prepared by,</Text>
            <Text style={styles.signatureLine}>(_____________________)</Text>
            <Text style={styles.signatureSub}>Administrasi</Text>
          </View>
          <View style={styles.signatureCol}>
            <Text style={styles.signatureLabel}>Diterima oleh / Received by,</Text>
            <Text style={styles.signatureLine}>(_____________________)</Text>
            <Text style={styles.signatureSub}>{empName}</Text>
          </View>
        </View>

        <Text style={styles.footer}>Dokumen ini dibuat otomatis / This is a system-generated document</Text>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdfBuffer(props: PayslipPdfProps): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument {...props} />);
}
