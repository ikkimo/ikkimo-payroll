"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { monthName } from "@/lib/exports/payrollRow";
import type { BasicEmployeeRow } from "@/components/employees/types";

type PeriodRow = {
  id: string;
  year: number;
  month: number;
  locked: boolean;
};

export default function ExportsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [employees, setEmployees] = useState<BasicEmployeeRow[]>([]);

  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());

  const [downloadingSpreadsheet, setDownloadingSpreadsheet] = useState<string | null>(null);
  const [downloadingPayslips, setDownloadingPayslips] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const [periodsRes, employeesRes] = await Promise.all([
        supabase
          .from("payroll_periods")
          .select("id, year, month, locked")
          .eq("locked", true)
          .order("year", { ascending: false })
          .order("month", { ascending: false }),
        supabase
          .from("employees")
          .select(
            "uuid, internal_no, employee_code, preferred_name, employee_name, department, active, basic, cash_loan_balance_idr, gets_bpjs_jp, gets_meal_allowance, position_id, bank, bank_account, bank_account_name",
          )
          .order("internal_no", { ascending: true }),
      ]);

      if (!alive) return;

      if (!periodsRes.error) setPeriods((periodsRes.data ?? []) as unknown as PeriodRow[]);
      if (!employeesRes.error) setEmployees((employeesRes.data ?? []) as unknown as BasicEmployeeRow[]);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  const activeEmployees = useMemo(() => employees.filter((e) => e.active), [employees]);

  function togglePeriodExpanded(periodId: string) {
    if (expandedPeriodId === periodId) {
      setExpandedPeriodId(null);
      return;
    }
    setExpandedPeriodId(periodId);
    setSelectedUuids(new Set(activeEmployees.map((e) => e.uuid)));
  }

  function toggleEmployee(uuid: string) {
    setSelectedUuids((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  }

  function selectAll() {
    setSelectedUuids(new Set(activeEmployees.map((e) => e.uuid)));
  }

  function selectNone() {
    setSelectedUuids(new Set());
  }

  async function downloadSpreadsheet(period: PeriodRow) {
    setErrorMsg(null);
    setDownloadingSpreadsheet(period.id);
    try {
      const res = await fetch(`/api/exports/spreadsheet?period_id=${period.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      triggerDownload(blob, `payroll_${period.year}_${String(period.month).padStart(2, "0")}.xlsx`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloadingSpreadsheet(null);
    }
  }

  async function downloadPayslips(period: PeriodRow) {
    if (selectedUuids.size === 0) {
      setErrorMsg("Select at least one employee for payslips.");
      return;
    }
    setErrorMsg(null);
    setDownloadingPayslips(period.id);
    try {
      const res = await fetch("/api/exports/payslips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period_id: period.id,
          employee_uuids: Array.from(selectedUuids),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      triggerDownload(blob, `payslips_${period.year}_${String(period.month).padStart(2, "0")}.zip`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloadingPayslips(null);
    }
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <h1 className="text-xl font-semibold">Exports</h1>
      <p className="mt-1 text-sm text-[var(--ikkimo-text-muted,#666)]">
        Download payroll data and payslips for submitted periods. Only periods that have been submitted and locked appear here.
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
            return (
              <div
              key={period.id}
              className="rounded-2xl border border-[var(--ikkimo-border)] bg-white"
              >
                <div className="flex items-center justify-between gap-4 px-5 py-4">
                  <div>
                    <div className="text-sm font-semibold">
                      {monthName(period.month)} {period.year}
                    </div>
                    <div className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                      Submitted
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadSpreadsheet(period)}
                      disabled={downloadingSpreadsheet === period.id}
                      className="rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm hover:border-[var(--ikkimo-brand)] disabled:opacity-50"
                      >
                      {downloadingSpreadsheet === period.id ? "Preparing…" : "Full spreadsheet"}
                    </button>
                    <button
                      onClick={() => togglePeriodExpanded(period.id)}
                      className="rounded-xl bg-[var(--ikkimo-brand)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--ikkimo-brand-hover)]"
                      >
                      {expanded ? "Hide payslips" : "Payslips…"}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[var(--ikkimo-border)] px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold">
                        Select employees ({selectedUuids.size} of {activeEmployees.length})
                      </div>
                      <div className="flex gap-2 text-xs">
                        <button onClick={selectAll} className="hover:underline">
                          Select all
                        </button>
                        <span className="text-[var(--ikkimo-text-muted,#ccc)]">|</span>
                        <button onClick={selectNone} className="hover:underline">
                          Select none
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 max-h-72 overflow-y-auto rounded-xl border border-[var(--ikkimo-border)]">
                      {activeEmployees.map((emp) => (
                        <label
                        key={emp.uuid}
                        className="flex cursor-pointer items-center gap-3 border-b border-[var(--ikkimo-border)] px-3 py-2 text-sm last:border-b-0 hover:bg-[var(--ikkimo-surface,#fafafa)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUuids.has(emp.uuid)}
                            onChange={() => toggleEmployee(emp.uuid)}
                            />
                          <span className="font-medium">
                            {emp.preferred_name ?? emp.employee_name}
                          </span>
                          <span className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                            {emp.employee_code}
                          </span>
                        </label>
                      ))}
                    </div>

                    <button
                      onClick={() => downloadPayslips(period)}
                      disabled={downloadingPayslips === period.id || selectedUuids.size === 0}
                      className="mt-4 w-full rounded-xl bg-[var(--ikkimo-brand)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--ikkimo-brand-hover)] disabled:opacity-50"
                      >
                      {downloadingPayslips === period.id
                        ? "Generating payslips…"
                        : `Download ${selectedUuids.size} payslip${selectedUuids.size === 1 ? "" : "s"} (zip)`}
                    </button>
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
