// ---------------------------------------------------------------------------
// Downloads every document for a payroll period (the full spreadsheet +
// every employee's payslip) as a single .zip, with the same naming
// convention as individual downloads. Used by both the Exports page and
// the post-submit link on the Payroll page — one implementation, two
// entry points.
// ---------------------------------------------------------------------------

import JSZip from "jszip";
import { supabase } from "@/lib/supabaseClient";
import { payslipFileName, payrollOverviewFileName } from "./types";

const BUCKET = "payroll-exports";

export async function downloadAllForPeriod(year: number, month: number): Promise<void> {
  const folder = `${year}-${String(month).padStart(2, "0")}`;

  const [rootRes, payslipsRes] = await Promise.all([
    supabase.storage.from(BUCKET).list(folder),
    supabase.storage.from(BUCKET).list(`${folder}/payslips`),
  ]);

  if (rootRes.error) throw new Error(rootRes.error.message);
  if (payslipsRes.error) throw new Error(payslipsRes.error.message);

  const zip = new JSZip();
  let fileCount = 0;

  const hasSpreadsheet = (rootRes.data ?? []).some((f) => f.name === "spreadsheet.xlsx");
  if (hasSpreadsheet) {
    const { data, error } = await supabase.storage.from(BUCKET).download(`${folder}/spreadsheet.xlsx`);
    if (error || !data) throw new Error(error?.message || "Could not download the spreadsheet");
    zip.file(payrollOverviewFileName(year, month), data);
    fileCount++;
  }

  for (const f of payslipsRes.data ?? []) {
    if (!f.name.endsWith(".xlsx")) continue;
    const employeeCode = f.name.replace(/\.xlsx$/, "");
    const { data, error } = await supabase.storage.from(BUCKET).download(`${folder}/payslips/${f.name}`);
    if (error || !data) throw new Error(error?.message || `Could not download ${f.name}`);
    zip.file(payslipFileName(year, month, employeeCode), data);
    fileCount++;
  }

  if (fileCount === 0) {
    throw new Error("No files found for this period yet");
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${folder}-payroll-documents.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}