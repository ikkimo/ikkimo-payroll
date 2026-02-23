"use client";

import { useMemo } from "react";
import { BasicEmployeeRow, EmployeeSortKey, SORT_OPTIONS } from "./types";

type Props = {
  employees: BasicEmployeeRow[];
  search: string;
  setSearch: (v: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (v: string) => void;
  sortBy: EmployeeSortKey;
  setSortBy: (v: EmployeeSortKey) => void;
};

export default function EmployeesHeaderControls({
  employees,
  search,
  setSearch,
  departmentFilter,
  setDepartmentFilter,
  sortBy,
  setSortBy,
}: Props) {
  const departmentOptions = useMemo(() => {
    return [...new Set(
      employees
        .map((e) => (e.department ?? "").trim())
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
  }, [employees]);

  const showReset =
    departmentFilter !== "all" || search.trim() || sortBy !== "internal_no";

  return (
    <div className="border-b border-[var(--ikkimo-border)] px-5 py-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="text-sm font-semibold">Employees</div>

        <div className="flex w-full flex-col items-stretch sm:w-auto sm:items-end">
          <label className="flex w-full items-center gap-2 text-xs sm:w-auto">
            <span className="hidden sm:inline">Search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full min-w-0 sm:w-56 rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-[var(--ikkimo-brand)]"
            />
          </label>

          <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
            <label className="flex items-center gap-2 text-xs">
              <span>Filter</span>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-[var(--ikkimo-brand)]"
              >
                <option value="all">All</option>
                {departmentOptions.map((dep) => (
                  <option key={dep} value={dep}>
                    {dep}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <span>Sort</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as EmployeeSortKey)}
                className="rounded-md border border-[var(--ikkimo-border)] bg-white px-2 py-1 text-[11px] outline-none focus:border-[var(--ikkimo-brand)]"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            {showReset && (
              <button
                type="button"
                className="text-[11px] underline underline-offset-4 opacity-70 hover:opacity-100"
                onClick={() => {
                  setDepartmentFilter("all");
                  setSearch("");
                  setSortBy("internal_no");
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}