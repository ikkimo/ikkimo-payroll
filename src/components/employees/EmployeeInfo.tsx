"use client";

import React from "react";
import { BasicEmployeeRow } from "./types";
import { formatIDR } from "@/lib/formatters";

type InfoCardProps = {
  label: string;
  value: React.ReactNode;
  className?: string;
};

function InfoCard({ label, value, className }: InfoCardProps) {
  return (
    <div
      className={`rounded-xl border border-[var(--ikkimo-border)] p-3 ${
        className ?? ""
      }`.trim()}
    >
      <div className="text-xs font-semibold">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}

type DetailsProps = {
  employee: BasicEmployeeRow;
  formatDate: (iso: string | null | undefined) => string;
};

export function EmployeeDetails({ employee, formatDate }: DetailsProps) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <InfoCard label="Department" value={employee.department ?? "-"} />
      <InfoCard
        label="Position"
        value={employee.positions?.name ?? "-"}
      />
      <InfoCard
        label="Seniority grade"
        value={employee.seniority_grades?.grade ?? "-"}
      />
      <InfoCard
        label="Skill grade"
        value={
          employee.skill_grades?.level !== null &&
          employee.skill_grades?.level !== undefined
            ? `L${employee.skill_grades.level}`
            : "-"
        }
      />
      <InfoCard
        label="Base salary (IDR)"
        value={formatIDR(employee.base_salary)}
        className="sm:col-span-2"
      />
      <InfoCard
        label="Start date"
        value={formatDate(employee.start_date)}
        className="sm:col-span-2"
      />
    </div>
  );
}

type ModalProps = {
  employee: BasicEmployeeRow;
  onClose: () => void;
  formatDate: (iso: string | null | undefined) => string;
};

export default function EmployeeModal({
  employee,
  onClose,
  formatDate,
}: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <button className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{employee.employee_name}</div>
            <div className="mt-0.5 text-sm">{employee.preferred_name ?? "-"}</div>
            <div className="mt-1 text-sm">
              No ID Karyawan: <span className="font-medium">{employee.employee_code}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-[var(--ikkimo-border)] px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
          >
            Close
          </button>
        </div>

        <EmployeeDetails employee={employee} formatDate={formatDate} />

        <div className="mt-5 text-xs">
          Tip: press <span className="font-semibold">Esc</span> to close.
        </div>
      </div>
    </div>
  );
}