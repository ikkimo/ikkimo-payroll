"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { monthName } from "@/lib/exports/types";

type PeriodRow = {
  id: string;
  year: number;
  month: number;
  locked: boolean;
};

type FileEntry = {
  name: string;
  path: string;
  kind: "spreadsheet" | "payslip-xlsx" | "payslip-pdf";
};

export default function ExportsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [filesByPeriod, setFilesByPeriod] = useState<Record<string, FileEntry[]>>({});
  const [filesLoading, setFilesLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const periodsRes = await supabase
        .from("payroll_periods")
        .select("id, year, month, locked")
        .eq("locked", true)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (!alive) return;

      if (!periodsRes.error) setPeriods((periodsRes.data ?? []) as unknown as PeriodRow[]);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  function folderFor(period: PeriodRow) {
    return `${period.year}-${String(period.month).padStart(2, "0")}`;
  }

  async function loadFiles(period: PeriodRow) {
    setErrorMsg(null);
    setFilesLoading(period.id);
    const folder = folderFor(period);

    try {
      const [rootRes, payslipsRes] = await Promise.all([
        supabase.storage.from("payroll-exports").list(folder),
        supabase.storage.from("payroll-exports").list(`${folder}/payslips`),
      ]);

      const files: FileEntry[] = [];

      for (const f of rootRes.data ?? []) {
        if (f.name === "spreadsheet.xlsx") {
          files.push({ name: "Full spreadsheet (.xlsx)", path: `${folder}/${f.name}`, kind: "spreadsheet" });
        }
      }

      for (const f of payslipsRes.data ?? []) {
        if (f.name.endsWith(".xlsx")) {
          files.push({
            name: `${f.name.replace(/\.xlsx$/, "")} — payslip (.xlsx)`,
            path: `${folder}/payslips/${f.name}`,
            kind: "payslip-xlsx",
          });
        }
      }

      files.sort((a, b) => {
        if (a.kind === "spreadsheet") return -1;
        if (b.kind === "spreadsheet") return 1;
        return a.name.localeCompare(b.name);
      });

      setFilesByPeriod((prev) => ({ ...prev, [period.id]: files }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Could not list files");
    } finally {
      setFilesLoading(null);
    }
  }

  async function togglePeriodExpanded(period: PeriodRow) {
    if (expandedPeriodId === period.id) {
      setExpandedPeriodId(null);
      return;
    }
    setExpandedPeriodId(period.id);
    if (!filesByPeriod[period.id]) {
      await loadFiles(period);
    }
  }

  async function downloadFile(file: FileEntry) {
    setErrorMsg(null);
    setDownloadingPath(file.path);
    try {
      const { data, error } = await supabase.storage
        .from("payroll-exports")
        .createSignedUrl(file.path, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Could not create download link");
      }

      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = file.path.split("/").pop() || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingPath(null);
    }
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Exports</h1>
      <p className="mt-1 text-sm text-[var(--ikkimo-text-muted,#666)]">
        Documents are generated automatically when payroll is submitted. This page only lists and downloads files that already exist — nothing is generated here.
      </p>

      {errorMsg && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-sm">Loading…</div>
        ) : periods.length === 0 ? (
          <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5 text-sm">
            No submitted payroll periods yet. Submit a payroll session first.
          </div>
        ) : (
          periods.map((period) => {
            const expanded = expandedPeriodId === period.id;
            const files = filesByPeriod[period.id];
            return (
              <div
                key={period.id}
                className="rounded-2xl border border-[var(--ikkimo-border)] bg-white"
              >
                <button
                  onClick={() => togglePeriodExpanded(period)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-sm font-semibold">
                      {monthName(period.month)} {period.year}
                    </div>
                    <div className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                      Submitted
                    </div>
                  </div>
                  <span className="text-sm text-[var(--ikkimo-text-muted,#888)]">
                    {expanded ? "Hide" : "View files"}
                  </span>
                </button>

                {expanded && (
                  <div className="border-t border-[var(--ikkimo-border)] px-5 py-4">
                    {filesLoading === period.id ? (
                      <div className="text-sm text-[var(--ikkimo-text-muted,#888)]">
                        Loading files…
                      </div>
                    ) : !files || files.length === 0 ? (
                      <div className="text-sm text-[var(--ikkimo-text-muted,#888)]">
                        No files found for this period yet. If this period was just submitted, document generation may still be in progress — try again in a moment.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {files.map((file) => (
                          <div
                            key={file.path}
                            className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--ikkimo-surface,#fafafa)]"
                          >
                            <span>{file.name}</span>
                            <button
                              onClick={() => downloadFile(file)}
                              disabled={downloadingPath === file.path}
                              className="rounded-lg border border-[var(--ikkimo-border)] px-3 py-1 text-xs hover:border-[var(--ikkimo-brand)] disabled:opacity-50"
                            >
                              {downloadingPath === file.path ? "Preparing…" : "Download"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}
