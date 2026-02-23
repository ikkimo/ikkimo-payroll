"use client";

// export const dynamic = "force-dynamic";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  BasicEmployeeRow,
  EmployeeSortKey,
} from "@/components/employees/types";
import EmployeesHeaderControls from "@/components/employees/EmployeesHeaderControls";
import EmployeesTable from "@/components/employees/EmployeesTable";

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

const formatDateEn = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
};


export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [employees, setEmployees] = useState<BasicEmployeeRow[]>([]);

  const [sortBy, setSortBy] = useState<EmployeeSortKey>("internal_no");

  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();

    return employees.filter((e) => {
      if (departmentFilter !== "all") {
        if ((e.department ?? "").trim() !== departmentFilter) return false;
      }

      if (!q) return true;

      const hay = [
        e.employee_name,
        e.preferred_name ?? "",
        e.employee_code,
        String(e.internal_no ?? ""),
        e.department ?? "",
        e.position ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [employees, departmentFilter, search]);

  const sortedEmployees = useMemo(() => {
    const list = [...filteredEmployees];
    const safeStr = (v: string | null | undefined) => (v ?? "").trim();
    list.sort((a, b) => {
      switch (sortBy) {
        case "internal_no": {
          const ai = a.internal_no && a.internal_no > 0 ? a.internal_no : Number.POSITIVE_INFINITY;
          const bi = b.internal_no && b.internal_no > 0 ? b.internal_no : Number.POSITIVE_INFINITY;
          return ai - bi;
        }
        case "employee_code":
          return safeStr(a.employee_code).localeCompare(safeStr(b.employee_code), "en", {
            numeric: true,
            sensitivity: "base",
          });
        case "employee_name":
          return safeStr(a.employee_name).localeCompare(safeStr(b.employee_name), "en", {
            sensitivity: "base",
          });
        case "department":
          return safeStr(a.department).localeCompare(safeStr(b.department), "en", {
            sensitivity: "base",
          });
        case "position":
          return safeStr(a.position).localeCompare(safeStr(b.position), "en", {
            sensitivity: "base",
          });
        case "start_date": {
          const ta = a.start_date ? new Date(a.start_date).getTime() : Number.POSITIVE_INFINITY;
          const tb = b.start_date ? new Date(b.start_date).getTime() : Number.POSITIVE_INFINITY;
          return ta - tb;
        }
        default:
          return 0;
      }
    });
    return list;
  }, [filteredEmployees, sortBy]);

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
        .select(
          "uuid, internal_no, employee_code, preferred_name, employee_name, department, position, start_date, active, base_salary, current_salary, seniority_grades(grade, increase_monthly_idr), skill_grades(position, level, increase_monthly_idr)"
        )
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
          <EmployeesHeaderControls
            employees={employees}
            search={search}
            setSearch={setSearch}
            departmentFilter={departmentFilter}
            setDepartmentFilter={setDepartmentFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
          />
          <EmployeesTable
            loading={loading}
            employees={employees}
            rows={sortedEmployees}
            formatDate={formatDateEn}
          />
        </section>
      </main>
    </div>
  );
}