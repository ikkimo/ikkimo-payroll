"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { BasicEmployeeRow } from "@/components/employees/types";
import { EmployeeDetails } from "@/components/employees/EmployeeInfo";

const formatDateEn = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
};

const formatIDR = (value: number | null | undefined): string =>
  new Intl.NumberFormat("id-ID").format(value ?? 0);

export default function EmployeePage() {
  const router = useRouter();
  const params = useParams<{ uuid: string }>();
  const uuid = params.uuid;

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<BasicEmployeeRow | null>(null);

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

      const res = await supabase
        .from("employees")
        .select(
          "uuid, internal_no, employee_code, preferred_name, employee_name, department, position, start_date, active, base_salary, current_salary, seniority_grades(grade, increase_monthly_idr), skill_grades(position, level, increase_monthly_idr)"
        )
        .eq("uuid", uuid)
        .maybeSingle();

      if (!alive) return;

      if (res.error) {
        setError(res.error.message);
        setEmployee(null);
      } else {
        setEmployee((res.data as BasicEmployeeRow | null) ?? null);
      }

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router, uuid]);

  // async function logout() {
  //   await supabase.auth.signOut();
  //   router.replace("/login");
  // }

  return (
    <>
      <div className="mb-4">
        <Link className="text-sm hover:underline" href="/home">
          ← Back to employees
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6">
        {loading ? (
          <div className="text-sm">Loading…</div>
        ) : error ? (
          <div className="text-sm">Error: {error}</div>
        ) : !employee ? (
          <div className="text-sm">Employee not found.</div>
        ) : (
          <>
            <div>
              <div className="text-lg font-semibold">{employee.employee_name}</div>
              <div className="mt-0.5 text-sm">{employee.preferred_name ?? "-"}</div>
              <div className="mt-1 text-sm">
                No ID Karyawan: <span className="font-medium">{employee.employee_code}</span>
              </div>
            </div>

            <EmployeeDetails employee={employee} formatDate={formatDateEn} formatIDR={formatIDR} />
          </>
        )}
      </section>
    </>
  );
}