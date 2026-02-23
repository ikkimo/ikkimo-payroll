"use client";

import { BasicEmployeeRow } from "./types";

type Props = {
  loading: boolean;
  employees: BasicEmployeeRow[];
  rows: BasicEmployeeRow[];
  formatDate: (iso: string | null | undefined) => string;
};

export default function EmployeesTable({
  loading,
  employees,
  rows,
  formatDate,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-xs">
          <tr>
            <th className="px-5 py-3">No.</th>
            <th className="px-5 py-3">No. ID Karyawan</th>
            <th className="px-5 py-3">Nama Panggilan</th>
            <th className="px-5 py-3">Nama Lengkap</th>
            <th className="px-5 py-3">Department</th>
            <th className="px-5 py-3">Posisi</th>
            <th className="px-5 py-3">Start date</th>
          </tr>
        </thead>

        <tbody className="border-t border-[var(--ikkimo-border)]">
          {loading ? (
            <tr>
              <td className="px-5 py-4 text-sm" colSpan={7}>
                Loading…
              </td>
            </tr>
          ) : employees.length === 0 ? (
            <tr>
              <td className="px-5 py-4 text-sm" colSpan={7}>
                No employee rows available yet (or blocked by RLS).
              </td>
            </tr>
          ) : (
            rows.map((e) => (
              <tr
                key={e.uuid}
                className="border-t border-[var(--ikkimo-border)] hover:bg-[var(--ikkimo-brand-hover)] cursor-pointer"
                onClick={() => {
                  window.location.href = `/employee/${e.uuid}`;
                }}
              >
                <td className="px-5 py-3">{e.internal_no}</td>
                <td className="px-5 py-3">{e.employee_code}</td>
                <td className="px-5 py-3">{e.preferred_name ?? "-"}</td>
                <td className="px-5 py-3">{e.employee_name}</td>
                <td className="px-5 py-3">{e.department ?? "-"}</td>
                <td className="px-5 py-3">{e.position ?? "-"}</td>
                <td className="px-5 py-3">{formatDate(e.start_date)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}