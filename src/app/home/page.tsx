"use client";

export const dynamic = "force-dynamic";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function nowYearMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function isMissingColumnError(error: unknown, column: string): boolean {
  if (!error || typeof error !== "object") return false;
  const msg = "message" in error && typeof (error as { message: unknown }).message === "string"
    ? (error as { message: string }).message
    : "";
  const lower = msg.toLowerCase();
  return lower.includes(column.toLowerCase()) && (lower.includes("does not exist") || lower.includes("column"));
}

type BasicEmployeeRow = {
  uuid: string;
  internal_no: number;
  employee_code: string;
  employee_name: string;
  department: string | null;
  position: string | null;
  start_date: string | null;
  active: boolean;
};

type PayrollPeriod = {
  id: string;
  year?: number | null;
  month?: number | null;
  working_days?: number | null;
  red_days?: number | null;
};

function monthName(m?: number | null) {
  if (!m || m < 1 || m > 12) return "";
  return [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ][m - 1];
}

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [employees, setEmployees] = useState<BasicEmployeeRow[]>([]);

  const [period, setPeriod] = useState<PayrollPeriod | null>(null);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [periodLoading, setPeriodLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      if (!alive) return;

      setEmail(session.user.email ?? "");

      const employeesPromise = supabase
        .from("employees")
        .select("uuid, internal_no, employee_code, employee_name, department, position, start_date, active")
        .eq("active", true)
        .order("internal_no", { ascending: true })
        .limit(500);

      const { year, month } = nowYearMonth();

      const empRes = await employeesPromise;

      if (!alive) return;

      if (empRes.error) {
        console.error(empRes.error);
        setEmployees([]);
      } else {
        setEmployees(empRes.data ?? []);
      }

      // Payroll period: prefer current year/month; fall back to latest.
      let periodRow: PayrollPeriod | null = null;
      let periodErr: string | null = null;

      // 1) Try current month (with red_days)
      const thisRes = await supabase
        .from("payroll_periods")
        .select("id, year, month, working_days, red_days")
        .eq("year", year)
        .eq("month", month)
        .maybeSingle();

      if (thisRes.error) {
        // If red_days column doesn't exist yet, retry without it.
        if (isMissingColumnError(thisRes.error, "red_days")) {
          const thisNoRed = await supabase
            .from("payroll_periods")
            .select("id, year, month, working_days")
            .eq("year", year)
            .eq("month", month)
            .maybeSingle();

          if (thisNoRed.error) {
            periodErr = thisNoRed.error.message;
          } else {
            periodRow = (thisNoRed.data as PayrollPeriod | null) ?? null;
          }
        } else {
          periodErr = thisRes.error.message;
        }
      } else {
        periodRow = (thisRes.data as PayrollPeriod | null) ?? null;
      }

      // 2) Fallback: latest by year/month
      if (!periodRow) {
        const latestRes = await supabase
          .from("payroll_periods")
          .select("id, year, month, working_days, red_days")
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(1);

        if (latestRes.error) {
          if (isMissingColumnError(latestRes.error, "red_days")) {
            const latestNoRed = await supabase
              .from("payroll_periods")
              .select("id, year, month, working_days")
              .order("year", { ascending: false })
              .order("month", { ascending: false })
              .limit(1);

            if (latestNoRed.error) {
              periodErr = latestNoRed.error.message;
            } else {
              periodRow = (latestNoRed.data?.[0] as PayrollPeriod | null) ?? null;
            }
          } else {
            periodErr = latestRes.error.message;
          }
        } else {
          periodRow = (latestRes.data?.[0] as PayrollPeriod | null) ?? null;
        }
      }

      setPeriod(periodRow);
      setPeriodError(periodErr);
      if (periodErr) console.error("payroll_periods error:", periodErr);
      setPeriodLoading(false);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[var(--ikkimo-bg)] text-[var(--ikkimo-text)]">
      <header className="border-b border-[var(--ikkimo-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/ikkimo_logo.png"
              alt="iKKim’O"
              width={36}
              height={36}
              priority
            />
            <div>
              <div className="text-sm font-semibold">iKKim’O Payroll</div>
              <div className="text-xs">{email}</div>
            </div>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
          <section className="flex-1 rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5">
            <div className="text-sm font-semibold">Current period</div>
            <div className="mt-2 text-sm">
              {periodLoading ? (
                "Loading…"
              ) : periodError ? (
                <div className="text-sm">
                  Could not load payroll period: <span className="font-medium">{periodError}</span>
                </div>
              ) : !period ? (
                "No payroll period found yet. Create one in payroll_periods."
              ) : (
                <div className="space-y-1">
                  <div className="text-lg font-semibold">
                    {`${monthName(period.month)} ${period.year ?? ""}`.trim()}
                  </div>
                  <div className="text-sm">
                    Working days: <span className="font-medium">{period.working_days ?? "—"}</span>
                  </div>
                  <div className="text-sm">
                    Red days: <span className="font-medium">{period.red_days ?? "—"}</span>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="flex-1 rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5">
            <div className="text-sm font-semibold">Monthly session</div>
            <div className="mt-2 text-sm">
              Create a monthly input run for the selected payroll period.
            </div>

            <button
              disabled
              className="mt-4 w-full rounded-xl bg-[var(--ikkimo-brand)] py-2.5 text-sm font-semibold text-white disabled:opacity-100 disabled:cursor-not-allowed"
              title="We’ll enable this once periods + input table are wired."
            >
              Start payroll session
            </button>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-[var(--ikkimo-border)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--ikkimo-border)] px-5 py-4">
            <div>
              <div className="text-sm font-semibold">Employees</div>
            </div>

            {/* Later: search/filter/sort */}
            <div className="text-xs">{employees.length} rows</div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs">
                <tr>
                  <th className="px-5 py-3">No.</th>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Dept</th>
                  <th className="px-5 py-3">Position</th>
                  <th className="px-5 py-3">Start date</th>
                </tr>
              </thead>

              <tbody className="border-t border-[var(--ikkimo-border)]">
                {loading ? (
                  <tr>
                    <td className="px-5 py-4 text-sm" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td className="px-5 py-4 text-sm" colSpan={6}>
                      No employee rows available yet (or blocked by RLS).
                    </td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.uuid} className="border-t border-[var(--ikkimo-border)]">
                      <td className="px-5 py-3">{e.internal_no}</td>
                      <td className="px-5 py-3">{e.employee_code}</td>
                      <td className="px-5 py-3">{e.employee_name}</td>
                      <td className="px-5 py-3">{e.department ?? "-"}</td>
                      <td className="px-5 py-3">{e.position ?? "-"}</td>
                      <td className="px-5 py-3">
                        {e.start_date
                          ? new Date(e.start_date)
                              .toLocaleDateString("en-GB")
                              .replace(/\//g, "-")
                          : "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}