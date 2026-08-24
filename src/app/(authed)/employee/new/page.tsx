"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatIDR } from "@/lib/formatters";
import type { ThrReligion } from "@/components/employees/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PositionRow = { id: string; name: string };
type SkillGradeRow = {
  id: string;
  position_id: string;
  level: number | null;
  increase_monthly_idr?: number | null;
};
type SeniorityGradeRow = {
  id: string;
  grade: number;
  increase_monthly_idr?: number | null;
};

type NewEmployeeForm = {
  employee_code: string;
  employee_name: string;
  preferred_name: string;
  internal_no: string; // kept as string in the form, parsed on submit

  department: string;
  position_id: string;
  skill_grade_id: string;
  seniority_grade_id: string;

  start_date: string;
  active: boolean;
  probation: boolean;

  basic: string;
  current_salary: string;
  housing_allowance_idr: string;
  cash_loan_balance_idr: string;

  gets_bpjs_jp: boolean;
  gets_bpjs_kesehatan: boolean;
  gets_meal_allowance: boolean;
  gets_attendance_reward: boolean;

  thr_preference: ThrReligion;

  fingerprint_id: string;

  bank: string;
  bank_account: string;
  bank_account_name: string;
};

const EMPTY_FORM: NewEmployeeForm = {
  employee_code: "",
  employee_name: "",
  preferred_name: "",
  internal_no: "",

  department: "",
  position_id: "",
  skill_grade_id: "",
  seniority_grade_id: "",

  start_date: "",
  active: true,
  probation: true,

  basic: "",
  current_salary: "",
  housing_allowance_idr: "0",
  cash_loan_balance_idr: "0",

  gets_bpjs_jp: true,
  gets_bpjs_kesehatan: false,
  gets_meal_allowance: true,
  gets_attendance_reward: true,

  thr_preference: "muslim",

  fingerprint_id: "",

  bank: "",
  bank_account: "",
  bank_account_name: "",
};

const EMPLOYEE_CODE_RE = /^[A-Za-z0-9]{3,12}$/;

function fieldLabel(cls?: string) {
  return `text-xs font-semibold ${cls ?? ""}`.trim();
}

const inputCls =
  "mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]";

export default function NewEmployeePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [skillGrades, setSkillGrades] = useState<SkillGradeRow[]>([]);
  const [seniorityGrades, setSeniorityGrades] = useState<SeniorityGradeRow[]>(
    [],
  );

  const [newPositionName, setNewPositionName] = useState("");
  const [creatingPosition, setCreatingPosition] = useState(false);
  const [positionCreateError, setPositionCreateError] = useState<
    string | null
  >(null);
  const [positionSelectValue, setPositionSelectValue] = useState("");

  const [form, setForm] = useState<NewEmployeeForm>(EMPTY_FORM);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const [posRes, skillRes, seniorRes] = await Promise.all([
        supabase.from("positions").select("id, name").order("name"),
        supabase
          .from("skill_grades")
          .select("id, position_id, level, increase_monthly_idr")
          .order("level"),
        supabase
          .from("seniority_grades")
          .select("id, grade, increase_monthly_idr")
          .order("grade"),
      ]);

      if (!alive) return;

      if (!posRes.error) setPositions((posRes.data as PositionRow[]) ?? []);
      if (!skillRes.error)
        setSkillGrades((skillRes.data as SkillGradeRow[]) ?? []);
      if (!seniorRes.error)
        setSeniorityGrades((seniorRes.data as SeniorityGradeRow[]) ?? []);

      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  function update<K extends keyof NewEmployeeForm>(
    key: K,
    value: NewEmployeeForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function getDefaultSkillGradeId(positionId: string) {
    if (!positionId) return "";
    const level1 = skillGrades.find(
      (g) => g.position_id === positionId && Number(g.level) === 1,
    );
    return level1?.id ?? "";
  }

  async function createPositionAndSelect() {
    const name = newPositionName.trim();
    if (!name) {
      setPositionCreateError("Position name is required.");
      return;
    }

    setCreatingPosition(true);
    setPositionCreateError(null);

    const insertRes = await supabase
      .from("positions")
      .insert({ name })
      .select("id, name")
      .single();

    if (insertRes.error) {
      setPositionCreateError(insertRes.error.message);
      setCreatingPosition(false);
      return;
    }

    const created = insertRes.data as PositionRow;

    const posRes = await supabase
      .from("positions")
      .select("id, name")
      .order("name");
    if (!posRes.error) setPositions((posRes.data as PositionRow[]) ?? []);

    setPositionSelectValue(created.id);
    update("position_id", created.id);
    update("skill_grade_id", getDefaultSkillGradeId(created.id));

    setNewPositionName("");
    setCreatingPosition(false);
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};

    if (!EMPLOYEE_CODE_RE.test(form.employee_code.trim())) {
      errs.employee_code =
        "3-12 letters/numbers only (e.g. EMP001).";
    }
    if (!form.employee_name.trim()) {
      errs.employee_name = "Full name is required.";
    }
    if (!form.preferred_name.trim()) {
      errs.preferred_name = "Preferred name is required.";
    }
    if (!form.position_id) {
      errs.position_id = "Position is required.";
    }
    if (!form.start_date) {
      errs.start_date = "Start date is required.";
    }
    if (form.basic.trim() === "" || Number.isNaN(Number(form.basic))) {
      errs.basic = "Basic salary is required.";
    }
    if (
      form.housing_allowance_idr.trim() === "" ||
      Number.isNaN(Number(form.housing_allowance_idr))
    ) {
      errs.housing_allowance_idr = "Housing allowance is required.";
    }
    if (!form.thr_preference) {
      errs.thr_preference = "THR preference is required.";
    }
    if (!form.fingerprint_id.trim()) {
      errs.fingerprint_id = "Fingerprint ID is required.";
    }
    if (!form.bank.trim()) {
      errs.bank = "Bank is required.";
    }
    if (!form.bank_account.trim()) {
      errs.bank_account = "Bank account number is required.";
    }
    if (!form.bank_account_name.trim()) {
      errs.bank_account_name = "Bank account name is required.";
    } else if (form.bank_account_name !== form.bank_account_name.trim()) {
      errs.bank_account_name = "No leading/trailing spaces.";
    }
    if (
      form.internal_no.trim() !== "" &&
      !Number.isInteger(Number(form.internal_no))
    ) {
      errs.internal_no = "Internal Nº must be a whole number.";
    }

    return errs;
  }

  async function handleSubmit() {
    setError(null);
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);

    const payload: Record<string, unknown> = {
      employee_code: form.employee_code.trim(),
      employee_name: form.employee_name.trim(),
      preferred_name: form.preferred_name.trim() || null,
      internal_no: form.internal_no.trim() ? Number(form.internal_no) : null,

      department: form.department.trim() || null,
      position_id: form.position_id,
      skill_grade_id: form.skill_grade_id || null,
      seniority_grade_id: form.seniority_grade_id || null,

      start_date: form.start_date || null,
      active: form.active,
      probation: form.probation,

      basic: Number(form.basic) || 0,
      current_salary: form.current_salary.trim()
        ? Number(form.current_salary)
        : null,
      housing_allowance_idr: Number(form.housing_allowance_idr) || 0,
      cash_loan_balance_idr: Number(form.cash_loan_balance_idr) || 0,

      gets_bpjs_jp: form.gets_bpjs_jp,
      gets_bpjs_kesehatan: form.gets_bpjs_kesehatan,
      gets_meal_allowance: form.gets_meal_allowance,
      gets_attendance_reward: form.gets_attendance_reward,

      thr_preference: form.thr_preference,

      fingerprint_id: form.fingerprint_id.trim() || null,

      bank: form.bank.trim() || null,
      bank_account: form.bank_account.trim() || null,
      bank_account_name: form.bank_account_name.trim() || null,
    };

    const res = await supabase
      .from("employees")
      .insert(payload)
      .select("uuid")
      .single();

    if (res.error) {
      // Surface common constraint violations in plain language.
      const msg = res.error.message || "Could not create employee.";
      if (msg.includes("employees_employee_id_key")) {
        setFieldErrors((p) => ({
          ...p,
          employee_code: "This employee code is already in use.",
        }));
      } else if (msg.includes("employees_internal_id_key")) {
        setFieldErrors((p) => ({
          ...p,
          internal_no: "This internal Nº is already in use.",
        }));
      } else if (msg.includes("employees_bank_account_unique")) {
        setFieldErrors((p) => ({
          ...p,
          bank_account: "This bank account is already assigned to someone else.",
        }));
      } else if (msg.includes("employee_code_format")) {
        setFieldErrors((p) => ({
          ...p,
          employee_code: "3-12 letters/numbers only (e.g. EMP001).",
        }));
      } else {
        setError(msg);
      }
      setSaving(false);
      return;
    }

    setSaving(false);
    router.replace(`/employee/${res.data.uuid}`);
  }

  const skillOptions = skillGrades.filter(
    (g) => g.position_id === form.position_id,
  );

  return (
    <>
      <div className="mb-4">
        <Link className="text-sm hover:underline" href="/home">
          ← Back to employees
        </Link>
      </div>

      <section className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6">
        <div className="text-lg font-semibold">Add employee</div>
        <div className="mt-0.5 text-sm text-[var(--ikkimo-text-muted,#666)]">
          Fill in the full employee record. You can edit everything later
          from the employee page.
        </div>

        {loading ? (
          <div className="mt-6 text-sm">Loading…</div>
        ) : (
          <>
            {error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {/* ── Identity ── */}
            <div className="mt-6 text-sm font-semibold">Identity</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <div className={fieldLabel()}>Employee code *</div>
                <input
                  className={inputCls}
                  value={form.employee_code}
                  onChange={(e) => update("employee_code", e.target.value)}
                  placeholder="e.g. EMP039"
                />
                {fieldErrors.employee_code ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.employee_code}
                  </div>
                ) : null}
              </label>

              <label className="block">
                <div className={fieldLabel()}>Internal Nº</div>
                <input
                  className={inputCls}
                  value={form.internal_no}
                  onChange={(e) => update("internal_no", e.target.value)}
                  placeholder="Optional, must be unique"
                  inputMode="numeric"
                />
                {fieldErrors.internal_no ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.internal_no}
                  </div>
                ) : null}
              </label>

              <label className="block">
                <div className={fieldLabel()}>Full name *</div>
                <input
                  className={inputCls}
                  value={form.employee_name}
                  onChange={(e) => update("employee_name", e.target.value)}
                />
                {fieldErrors.employee_name ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.employee_name}
                  </div>
                ) : null}
              </label>

              <label className="block">
                <div className={fieldLabel()}>Preferred name</div>
                <input
                  className={inputCls}
                  value={form.preferred_name}
                  onChange={(e) => update("preferred_name", e.target.value)}
                />
              </label>

              <label className="block">
                <div className={fieldLabel()}>Fingerprint ID</div>
                <input
                  className={inputCls}
                  value={form.fingerprint_id}
                  onChange={(e) => update("fingerprint_id", e.target.value)}
                />
              </label>

              <label className="block">
                <div className={fieldLabel()}>Start date</div>
                <input
                  type="date"
                  className={inputCls}
                  value={form.start_date}
                  onChange={(e) => update("start_date", e.target.value)}
                />
              </label>
            </div>

            {/* ── Role ── */}
            <div className="mt-6 text-sm font-semibold">Role</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <div className={fieldLabel()}>Department</div>
                <input
                  className={inputCls}
                  value={form.department}
                  onChange={(e) => update("department", e.target.value)}
                />
              </label>

              <div>
                <div className={fieldLabel()}>Position *</div>
                <select
                  className={inputCls}
                  value={positionSelectValue || form.position_id}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPositionSelectValue(v);
                    setPositionCreateError(null);
                    if (v === "__new__") return;
                    update("position_id", v);
                    update("skill_grade_id", getDefaultSkillGradeId(v));
                  }}
                >
                  <option value="" disabled>
                    Select position
                  </option>
                  {positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value="__new__">+ Create new position…</option>
                </select>
                {fieldErrors.position_id ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.position_id}
                  </div>
                ) : null}

                {positionSelectValue === "__new__" ? (
                  <div className="mt-2 rounded-xl border border-[var(--ikkimo-border)] p-3">
                    <div className="text-xs font-semibold">New position</div>
                    <input
                      className={inputCls}
                      value={newPositionName}
                      onChange={(e) => {
                        setNewPositionName(e.target.value);
                        setPositionCreateError(null);
                      }}
                      placeholder="e.g. Supervisor"
                    />
                    {positionCreateError ? (
                      <div className="mt-2 text-xs text-red-600">
                        {positionCreateError}
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={createPositionAndSelect}
                        disabled={creatingPosition}
                        className="rounded-xl bg-[var(--ikkimo-brand)] px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingPosition ? "Creating…" : "Create"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <label className="block">
                <div className={fieldLabel()}>Skill grade</div>
                <select
                  className={inputCls}
                  value={form.skill_grade_id}
                  onChange={(e) => update("skill_grade_id", e.target.value)}
                  disabled={!form.position_id || skillOptions.length === 0}
                >
                  <option value="">
                    {!form.position_id
                      ? "Select position first"
                      : skillOptions.length === 0
                        ? "No skill grades for this position"
                        : "None"}
                  </option>
                  {skillOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {`L${g.level ?? "?"}`}{" "}
                      {g.increase_monthly_idr
                        ? `(+${formatIDR(g.increase_monthly_idr)})`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <div className={fieldLabel()}>Seniority grade</div>
                <select
                  className={inputCls}
                  value={form.seniority_grade_id}
                  onChange={(e) =>
                    update("seniority_grade_id", e.target.value)
                  }
                >
                  <option value="">None</option>
                  {seniorityGrades.map((g) => (
                    <option key={g.id} value={g.id}>
                      {`Grade ${g.grade}`}{" "}
                      {g.increase_monthly_idr
                        ? `(+${formatIDR(g.increase_monthly_idr)})`
                        : ""}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  Not yet applied to pay (deferred feature) — safe to set now.
                </div>
              </label>
            </div>

            {/* ── Pay ── */}
            <div className="mt-6 text-sm font-semibold">Pay</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <div className={fieldLabel()}>Basic salary (IDR) *</div>
                <input
                  className={inputCls}
                  value={form.basic}
                  onChange={(e) => update("basic", e.target.value)}
                  inputMode="decimal"
                />
                {fieldErrors.basic ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.basic}
                  </div>
                ) : null}
              </label>

              <label className="block">
                <div className={fieldLabel()}>Current salary (IDR)</div>
                <input
                  className={inputCls}
                  value={form.current_salary}
                  onChange={(e) => update("current_salary", e.target.value)}
                  inputMode="decimal"
                  placeholder="Optional reference value"
                />
              </label>

              <label className="block">
                <div className={fieldLabel()}>Housing allowance (IDR)</div>
                <input
                  className={inputCls}
                  value={form.housing_allowance_idr}
                  onChange={(e) =>
                    update("housing_allowance_idr", e.target.value)
                  }
                  inputMode="decimal"
                />
              </label>

              <label className="block">
                <div className={fieldLabel()}>
                  Cash loan opening balance (IDR)
                </div>
                <input
                  className={inputCls}
                  value={form.cash_loan_balance_idr}
                  onChange={(e) =>
                    update("cash_loan_balance_idr", e.target.value)
                  }
                  inputMode="decimal"
                />
                <div className="mt-1 text-xs text-[var(--ikkimo-text-muted,#666)]">
                  Existing loan balance being carried over, if any.
                </div>
              </label>

              <label className="block">
                <div className={fieldLabel()}>THR preference *</div>
                <select
                  className={inputCls}
                  value={form.thr_preference}
                  onChange={(e) =>
                    update("thr_preference", e.target.value as ThrReligion)
                  }
                >
                  <option value="muslim">Muslim</option>
                  <option value="christian">Christian</option>
                  <option value="hindu">Balinese / Hindu</option>
                </select>
              </label>
            </div>

            {/* ── Eligibility ── */}
            <div className="mt-6 text-sm font-semibold">Eligibility & status</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => update("active", e.target.checked)}
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.probation}
                  onChange={(e) => update("probation", e.target.checked)}
                />
                On probation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.gets_bpjs_jp}
                  onChange={(e) => update("gets_bpjs_jp", e.target.checked)}
                />
                Enrolled in BPJS JP
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.gets_bpjs_kesehatan}
                  onChange={(e) => update("gets_bpjs_kesehatan", e.target.checked)}
                />
                Enrolled in BPJS Kesehatan
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.gets_meal_allowance}
                  onChange={(e) =>
                    update("gets_meal_allowance", e.target.checked)
                  }
                />
                Gets meal allowance
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.gets_attendance_reward}
                  onChange={(e) =>
                    update("gets_attendance_reward", e.target.checked)
                  }
                />
                Eligible for attendance reward
              </label>
            </div>

            {/* ── Bank ── */}
            <div className="mt-6 text-sm font-semibold">Bank details</div>
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <div className={fieldLabel()}>Bank</div>
                <input
                  className={inputCls}
                  value={form.bank}
                  onChange={(e) => update("bank", e.target.value)}
                  placeholder="e.g. BCA"
                />
              </label>

              <label className="block">
                <div className={fieldLabel()}>Bank account number</div>
                <input
                  className={inputCls}
                  value={form.bank_account}
                  onChange={(e) => update("bank_account", e.target.value)}
                />
                {fieldErrors.bank_account ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.bank_account}
                  </div>
                ) : null}
              </label>

              <label className="block sm:col-span-2">
                <div className={fieldLabel()}>Bank account name</div>
                <input
                  className={inputCls}
                  value={form.bank_account_name}
                  onChange={(e) =>
                    update("bank_account_name", e.target.value)
                  }
                  placeholder="Name as it appears on the account"
                />
                {fieldErrors.bank_account_name ? (
                  <div className="mt-1 text-xs text-red-600">
                    {fieldErrors.bank_account_name}
                  </div>
                ) : null}
              </label>
            </div>

            {/* ── Actions ── */}
            <div className="mt-8 flex justify-end gap-2">
              <Link
                href="/home"
                className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create employee"}
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}