"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { verifyCurrentUserPassword } from "@/lib/auth";
import { formatIDR } from "@/lib/formatters";
import type { BasicEmployeeRow } from "@/components/employees/types";
import type { PayrollSettingsRow } from "@/components/settings/types";

type PositionRow = {
  id: string;
  name: string;
};

type SkillGradeRow = {
  id: string;
  position_id: string;
  level: number | null;
  increase_monthly_idr?: number | null;
};

type EditableEmployee = BasicEmployeeRow & {
  basic?: number | null;
  position_id?: string | null;
  skill_grade_id?: string | null;
  gets_bpjs_jp?: boolean;
  gets_bpjs_kesehatan?: boolean;
  gets_meal_allowance?: boolean;
  meal_allowance_override_idr?: number | null;
  gets_attendance_reward?: boolean;
  end_date?: string | null;
  employment_status?: "active" | "resigned" | "terminated" | null;
};

const formatDateEn = (iso: string | null | undefined): string => {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
};

function parseYMDLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const formatThrPayoutDate = (
  preference: "muslim" | "christian" | "hindu" | null | undefined,
  settings: PayrollSettingsRow | null,
): string => {
  if (!preference || !settings) return "-";

  const sourceDate =
    preference === "muslim"
      ? settings.thr_muslim_date
      : preference === "christian"
        ? settings.thr_christian_date
        : settings.thr_hindu_date;

  if (!sourceDate) return "-";

  const d = parseYMDLocal(sourceDate);
  d.setDate(d.getDate() - 7);
  return formatDateEn(d.toISOString().slice(0, 10));
};

export default function EmployeePage() {
  const router = useRouter();
  const { uuid } = useParams<{ uuid: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<EditableEmployee | null>(null);

  const [email, setEmail] = useState<string>("");

  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<EditableEmployee | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [probationSaving, setProbationSaving] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmProbationOpen, setConfirmProbationOpen] = useState(false);

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState<"resigned" | "terminated">("resigned");
  const [leaveEndDate, setLeaveEndDate] = useState(""); // no default — must be chosen
  const [leavePassword, setLeavePassword] = useState("");
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSaving, setLeaveSaving] = useState(false);

  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [skillGrades, setSkillGrades] = useState<SkillGradeRow[]>([]);

  const [newPositionName, setNewPositionName] = useState("");
  const [creatingPosition, setCreatingPosition] = useState(false);
  const [positionCreateError, setPositionCreateError] = useState<string | null>(
    null,
  );
  const [positionSelectValue, setPositionSelectValue] = useState<string>("");

  const [payrollSettings, setPayrollSettings] =
    useState<PayrollSettingsRow | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      setEmail(session.user.email ?? "");

      if (!alive) return;

      const [empRes, posRes, skillRes, settingsRes] = await Promise.all([
        supabase
          .from("employees")
          .select(
            "uuid, internal_no, employee_code, preferred_name, employee_name, department, start_date, active, probation, basic, fingerprint_id, skill_grade_id, position_id, gets_bpjs_jp, gets_bpjs_kesehatan, gets_meal_allowance, meal_allowance_override_idr, gets_attendance_reward, thr_preference, cash_loan_balance_idr, housing_allowance_idr, seniority_grades(id, grade, increase_monthly_idr), skill_grades(id, position_id, level, increase_monthly_idr), positions(id, name), end_date, employment_status",
          )          
          .eq("uuid", uuid)
          .maybeSingle(),
        supabase
          .from("positions")
          .select("id, name")
          .order("name", { ascending: true }),
        supabase
          .from("skill_grades")
          .select("id, position_id, level, increase_monthly_idr")
          .order("position_id", { ascending: true })
          .order("level", { ascending: true }),
        supabase
          .from("payroll_settings")
          .select("thr_hindu_date, thr_christian_date, thr_muslim_date")
          .limit(1)
          .maybeSingle(),
      ]);

      if (!alive) return;

      if (empRes.error) {
        setError(empRes.error.message);
        setEmployee(null);
      } else {
        setEmployee(
          (empRes.data as unknown as EditableEmployee | null) ?? null,
        );
        setEditing(false);
        setSnapshot(null);
        setDirty(false);
        setSavedMsg(null);
      }

      if (posRes.error) setPositions([]);
      else setPositions((posRes.data as unknown as PositionRow[]) ?? []);

      if (skillRes.error) setSkillGrades([]);
      else setSkillGrades((skillRes.data as unknown as SkillGradeRow[]) ?? []);

      if (settingsRes.error) setPayrollSettings(null);
      else
        setPayrollSettings(
          settingsRes.data as unknown as PayrollSettingsRow | null,
        );

      // Initialize position select value when employee loads
      const emp = empRes.data as unknown as
        | (EditableEmployee & { positions?: { id?: string } | null })
        | null;

      const pid = emp?.position_id ?? emp?.positions?.id ?? "";
      setPositionSelectValue(typeof pid === "string" ? pid : "");
      setNewPositionName("");
      setPositionCreateError(null);

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

  function getDefaultSkillGradeId(positionId: string | null | undefined) {
    if (!positionId) return null;
    const level1 = skillGrades.find(
      (g) => g.position_id === positionId && Number(g.level) === 1,
    );
    return level1?.id ?? null;
  }

  function startEdit() {
    if (!employee) return;
    setSnapshot(employee);
    setEditing(true);
    setDirty(false);
    setSavedMsg(null);
    setError(null);
  }

  function cancelEdit() {
    setEmployee(snapshot);
    setEditing(false);
    setDirty(false);
    setSavedMsg(null);
    setError(null);
    setConfirmOpen(false);
    setConfirmPassword("");
    setConfirmError(null);
  }

  function requestSave() {
    if (!employee) return;
    setConfirmOpen(true);
    setConfirmPassword("");
    setConfirmError(null);
  }

  async function verifyPassword(): Promise<boolean> {
    setConfirmError(null);

    const result = await verifyCurrentUserPassword(confirmPassword);
    if (!result.ok) {
      setConfirmError(result.error);
      return false;
    }

    setConfirmPassword("");
    return true;
  }

  function handleProbationClick() {
    setConfirmProbationOpen(true);
  }

  async function confirmEndProbation() {
    setConfirmProbationOpen(false);
    await toggleProbation();
  }

  async function commitSave() {
    if (!employee) return;

    setSaving(true);
    setError(null);
    setSavedMsg(null);

    // Only update fields that live on the employees row.
    const payload: Record<string, unknown> = {
      internal_no: employee.internal_no ?? null,
      employee_code: employee.employee_code,
      employee_name: employee.employee_name,
      preferred_name: employee.preferred_name ?? null,
      department: employee.department ?? null,
      start_date: employee.start_date ?? null,
      active: employee.active,
      basic: employee.basic ?? 0,
      position_id: employee.position_id ?? employee.positions?.id ?? null,
      skill_grade_id:
        employee.skill_grade_id ?? employee.skill_grades?.id ?? null,
      gets_bpjs_jp: employee.gets_bpjs_jp,
      gets_bpjs_kesehatan: employee.gets_bpjs_kesehatan,
      gets_meal_allowance: employee.gets_meal_allowance,
      meal_allowance_override_idr: employee.meal_allowance_override_idr ?? null,
      gets_attendance_reward: employee.gets_attendance_reward,
      housing_allowance_idr: employee.housing_allowance_idr ?? 0,
      // Do NOT update probation here!
    };

    const res = await supabase
      .from("employees")
      .update(payload)
      .eq("uuid", employee.uuid)
      .select(
              "uuid, internal_no, employee_code, preferred_name, employee_name, department, start_date, active, probation, basic, fingerprint_id, skill_grade_id, position_id, housing_allowance_idr, seniority_grades(id, grade, increase_monthly_idr), skill_grades(id, position_id, level, increase_monthly_idr), positions(id, name), gets_bpjs_jp, gets_bpjs_kesehatan, gets_meal_allowance, meal_allowance_override_idr, gets_attendance_reward, end_date, employment_status",
      )
      .maybeSingle();

    if (res.error) {
      setError(res.error.message);
      setSaving(false);
      return;
    }

    setEmployee((res.data as unknown as EditableEmployee | null) ?? null);
    setEditing(false);
    setSnapshot(null);
    setDirty(false);
    setSaving(false);
    setSavedMsg("Saved.");
  }

  function openLeaveModal() {
    setLeaveOpen(true);
    setLeaveStatus("resigned");
    setLeaveEndDate("");
    setLeavePassword("");
    setLeaveError(null);
  }

  async function confirmMarkAsLeft() {
    if (!employee) return;
    setLeaveError(null);

    if (!leaveEndDate) {
      setLeaveError("Last working day is required.");
      return;
    }

    setLeaveSaving(true);

    const result = await verifyCurrentUserPassword(leavePassword);
    if (!result.ok) {
      setLeaveError(result.error);
      setLeaveSaving(false);
      return;
    }

    const res = await supabase
      .from("employees")
      .update({
        active: false,
        employment_status: leaveStatus,
        end_date: leaveEndDate,
      })
      .eq("uuid", employee.uuid)
      .select("uuid, active, employment_status, end_date")
      .maybeSingle();

    setLeaveSaving(false);

    if (res.error) {
      setLeaveError(res.error.message);
      return;
    }

    setLeaveOpen(false);
    setLeavePassword("");
    router.replace("/home");
  }

  async function toggleProbation() {
    if (!employee) return;

    console.log("PARAM UUID:", uuid);
    console.log("EMPLOYEE UUID:", employee.uuid);

    setProbationSaving(true);
    setError(null);
    setSavedMsg(null);

    const next = !(employee.probation ?? false);

    // Optimistically update UI so the button disappears immediately when probation becomes false.
    setEmployee((prev) => (prev ? { ...prev, probation: next } : prev));

    const res = await supabase
      .from("employees")
      .update({ probation: next })
      .eq("uuid", employee.uuid)
      // Keep return payload minimal to avoid RLS/join issues causing null data.
      .select("uuid, probation")
      .maybeSingle();

    if (res.error) {
      // Roll back optimistic update on error.
      setEmployee((prev) => (prev ? { ...prev, probation: !next } : prev));
      setError(res.error.message);
      setProbationSaving(false);
      return;
    }

    // If Supabase returns a row, apply it; if not, keep optimistic state.
    if (res.data) {
      const p = (res.data as { probation?: boolean | null }).probation;
      setEmployee((prev) => (prev ? { ...prev, probation: p ?? next } : prev));
    }

    setProbationSaving(false);
    setSavedMsg("Saved.");
  }

  function updateEmployee<K extends keyof EditableEmployee>(
    key: K,
    value: EditableEmployee[K],
  ) {
    if (!editing) return;

    setEmployee((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });

    setDirty(true);
    setSavedMsg(null);
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

    const created = insertRes.data as unknown as PositionRow;

    const posRes = await supabase
      .from("positions")
      .select("id, name")
      .order("name", { ascending: true });

    if (!posRes.error) {
      setPositions((posRes.data as unknown as PositionRow[]) ?? []);
    }

    setPositionSelectValue(created.id);
    updateEmployee("position_id", created.id);

    const defaultSkillGradeId = getDefaultSkillGradeId(created.id);
    updateEmployee("skill_grade_id", defaultSkillGradeId);

    setNewPositionName("");
    setCreatingPosition(false);
  }

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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                {!editing ? (
                  <>
                    <div className="text-lg font-semibold">
                      {employee.employee_name}
                    </div>
                    <div className="mt-0.5 text-sm">
                      {employee.preferred_name ?? "-"}
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-semibold">Full name</div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                        value={employee.employee_name}
                        onChange={(e) =>
                          updateEmployee("employee_name", e.target.value)
                        }
                      />
                    </label>

                    <label className="block">
                      <div className="text-xs font-semibold">
                        Preferred name
                      </div>
                      <input
                        className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                        value={employee.preferred_name ?? ""}
                        onChange={(e) =>
                          updateEmployee(
                            "preferred_name",
                            e.target.value || null,
                          )
                        }
                      />
                    </label>
                  </div>
                )}

                <div className="mt-1 text-sm">
                  Nº ID Karyawan:{" "}
                  <span className="font-medium">{employee.employee_code}</span>
                </div>
                <div className="mt-1 text-sm">
                  Fingerprint ID:{" "}
                  <span className="font-medium">
                    {employee.fingerprint_id ?? "-"}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  THR: {capitalizeFirst(employee.thr_preference) ?? "missing"} |
                  Date to pay:{" "}
                  {formatThrPayoutDate(
                    employee.thr_preference,
                    payrollSettings,
                  ) ?? "missing"}
                </div>
                {!employee.active && (
                  <div className="mt-1 text-xs text-red-600">
                    {capitalizeFirst(employee.employment_status)} — last day{" "}
                    {formatDateEn(employee.end_date)}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {savedMsg ? <div className="text-xs">{savedMsg}</div> : null}

                {!editing ? (
                  <>
                    {employee.active ? (
                      <button
                        onClick={openLeaveModal}
                        className="rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:border-red-400"
                        title="End this employee's employment"
                      >
                        End employment
                      </button>
                    ) : null}

                    {employee.probation ? (
                      <>
                        
                        <button
                          onClick={handleProbationClick}
                          disabled={probationSaving}
                          className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)] disabled:cursor-not-allowed disabled:opacity-60"
                          title="Mark employee as not on probation"
                        >
                          {probationSaving ? "Saving…" : "End probation"}
                        </button>

                        {confirmProbationOpen && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center px-4"
                            role="dialog"
                          >
                            <button
                              className="absolute inset-0 bg-black/30"
                              aria-label="Close"
                              onClick={() => setConfirmProbationOpen(false)}
                            />
                            <div className="relative w-full max-w-md rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
                              <div className="text-lg font-semibold">
                                End Probation?
                              </div>
                              <div className="mt-2 text-sm">
                                Are you sure you want to end this
                                employee&apos;s probation? This action cannot be
                                undone.
                              </div>
                              <div className="mt-6 flex justify-end gap-3">
                                <button
                                  onClick={() => setConfirmProbationOpen(false)}
                                  className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={confirmEndProbation}
                                  className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white"
                                >
                                  Confirm
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    ) : null}
                    <button
                      onClick={startEdit}
                      className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                    >
                      Edit
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={cancelEdit}
                      disabled={saving}
                      className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={requestSave}
                      disabled={saving || !dirty}
                      className="rounded-xl bg-[var(--ikkimo-brand)] px-3 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Start date */}
              <div>
                <div className="text-xs font-semibold">Start date</div>
                <div className="mt-1 text-sm">
                  {formatDateEn(employee.start_date)}
                </div>
              </div>

              {/* Seniority (read-only) */}
              {/* <div>
                <div className="text-xs font-semibold">Seniority</div>
                <div className="mt-1 text-sm">
                  {employee.seniority_grades?.grade ?? "-"}
                </div>
              </div> */}

              {/* Position */}
              <div>
                <div className="text-xs font-semibold">Position</div>
                {!editing ? (
                  <div className="mt-1 text-sm">
                    {employee.positions?.name ?? "-"}
                  </div>
                ) : (
                  <div className="mt-1 space-y-2">
                    <select
                      className="w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                      value={positionSelectValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPositionSelectValue(v);
                        setPositionCreateError(null);

                        if (v === "__new__") {
                          updateEmployee(
                            "position_id",
                            employee.position_id ??
                              employee.positions?.id ??
                              "",
                          );
                          return;
                        }

                        if (!v) return;

                        updateEmployee("position_id", v);

                        const defaultSkillGradeId = getDefaultSkillGradeId(v);
                        updateEmployee("skill_grade_id", defaultSkillGradeId);
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

                    {positionSelectValue === "__new__" ? (
                      <div className="rounded-xl border border-[var(--ikkimo-border)] p-3">
                        <div className="text-xs font-semibold">
                          New position
                        </div>
                        <input
                          className="mt-2 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                          value={newPositionName}
                          onChange={(e) => {
                            setNewPositionName(e.target.value);
                            setPositionCreateError(null);
                          }}
                          placeholder="e.g. Supervisor"
                        />

                        {positionCreateError ? (
                          <div className="mt-2 text-xs">
                            Error:{" "}
                            <span className="font-medium">
                              {positionCreateError}
                            </span>
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
                )}
              </div>

              {/* Skill grade */}
              <div>
                <div className="text-xs font-semibold">Skill grade</div>
                {!editing ? (
                  <div className="mt-1 text-sm">
                    {employee.skill_grades?.level !== null &&
                    employee.skill_grades?.level !== undefined
                      ? `L${employee.skill_grades.level}`
                      : "-"}
                  </div>
                ) : (
                  (() => {
                    const pid =
                      employee.position_id ?? employee.positions?.id ?? "";
                    const options = skillGrades.filter(
                      (g) => g.position_id === pid,
                    );
                    const current =
                      employee.skill_grade_id ??
                      employee.skill_grades?.id ??
                      getDefaultSkillGradeId(pid) ??
                      "";

                    return (
                      <select
                        className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                        value={current}
                        onChange={(e) =>
                          updateEmployee("skill_grade_id", e.target.value)
                        }
                        disabled={!pid || options.length === 0}
                      >
                        {!pid ? (
                          <option value="">Select position first</option>
                        ) : null}
                        {pid && options.length === 0 ? (
                          <option value="">
                            No skill grades for this position
                          </option>
                        ) : null}

                        {options.map((g) => (
                          <option key={g.id} value={g.id}>
                            {`L${g.level ?? "?"}`}{" "}
                            {g.increase_monthly_idr
                              ? `(+${formatIDR(g.increase_monthly_idr)})`
                              : ""}
                          </option>
                        ))}
                      </select>
                    );
                  })()
                )}
              </div>

              {/* Department */}
              <div>
                <div className="text-xs font-semibold">Department</div>
                {!editing ? (
                  <div className="mt-1 text-sm">
                    {employee.department ?? "-"}
                  </div>
                ) : (
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    value={employee.department ?? ""}
                    onChange={(e) =>
                      updateEmployee("department", e.target.value || null)
                    }
                  />
                )}
              </div>

              {/* Basic */}
              <div>
                <div className="text-xs font-semibold">Basic (IDR)</div>
                {!editing ? (
                  <div className="mt-1 text-sm">
                    {formatIDR(employee.basic ?? 0)}
                  </div>
                ) : (
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    type="number"
                    value={String(employee.basic ?? 0)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      updateEmployee("basic", Number.isFinite(n) ? n : 0);
                    }}
                  />
                )}
              </div>

              {/* Housing allowance */}
              <div>
                <div className="text-xs font-semibold">
                  Housing allowance (IDR)
                </div>
                {!editing ? (
                  <div className="mt-1 text-sm">
                    {formatIDR(employee.housing_allowance_idr ?? 0)}
                  </div>
                ) : (
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    type="number"
                    value={String(employee.housing_allowance_idr ?? 0)}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      updateEmployee(
                        "housing_allowance_idr",
                        Number.isFinite(n) ? n : 0,
                      );
                    }}
                  />
                )}
              </div>

              {/* Receives Pension */}
              <div>
                <div className="text-xs font-semibold">
                  Receives BPJS - JP
                </div>
                {!editing ? (
                  <div className="mt-1 text-sm text-gray-500">
                    {employee.gets_bpjs_jp ? "Yes" : "No"}
                  </div>
                ) : (
                  <label className="mt-1 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={employee.gets_bpjs_jp ?? false}
                      onChange={(e) =>
                        updateEmployee("gets_bpjs_jp", e.target.checked)
                      }
                      className="rounded border-[var(--ikkimo-border)] bg-white text-[var(--ikkimo-brand)]"
                    />
                    <span className="text-sm">
                      {employee.gets_bpjs_jp ? "Yes" : "No"}
                    </span>
                  </label>
                )}
              </div>

              {/* BPJS Kesehatan */}
              <div>
                <div className="text-xs font-semibold">
                  Receives BPJS Kesehatan
                </div>
                {!editing ? (
                  <div className="mt-1 text-sm text-gray-500">
                    {employee.gets_bpjs_kesehatan ? "Yes" : "No"}
                  </div>
                ) : (
                  <label className="mt-1 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={employee.gets_bpjs_kesehatan ?? false}
                      onChange={(e) =>
                        updateEmployee("gets_bpjs_kesehatan", e.target.checked)
                      }
                      className="rounded border-[var(--ikkimo-border)] bg-white text-[var(--ikkimo-brand)]"
                    />
                    <span className="text-sm">
                      {employee.gets_bpjs_kesehatan ? "Yes" : "No"}
                    </span>
                  </label>
                )}
              </div>

              {/* Meal Allowance */}
              <div>
                <div className="text-xs font-semibold">
                  Meal allowance
                </div>
                {!editing ? (
                  <div className="mt-1 text-sm text-gray-500">
                    {employee.gets_meal_allowance ? "Yes" : "No"}
                  </div>
                ) : (
                  <label className="mt-1 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={employee.gets_meal_allowance ?? false}
                      onChange={(e) =>
                        updateEmployee("gets_meal_allowance", e.target.checked)
                      }
                      className="rounded border-[var(--ikkimo-border)] bg-white text-[var(--ikkimo-brand)]"
                    />
                    <span className="text-sm">
                      {employee.gets_meal_allowance ? "Yes" : "No"}
                    </span>
                  </label>
                )}
              </div>

              {/* Fixed meal allowance override */}
              <div>
                <div className="text-xs font-semibold">
                  Fixed meal allowance (IDR / month)
                </div>
                {!editing ? (
                  <div className="mt-1 text-sm text-gray-500">
                    {employee.meal_allowance_override_idr != null
                      ? `${formatIDR(employee.meal_allowance_override_idr)} — overrides normal calculation`
                      : "Not set — uses normal per-day calculation"}
                  </div>
                ) : (
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      className="w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                      type="number"
                      placeholder="Leave blank for normal calculation"
                      value={
                        employee.meal_allowance_override_idr != null
                          ? String(employee.meal_allowance_override_idr)
                          : ""
                      }
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          updateEmployee("meal_allowance_override_idr", null);
                          return;
                        }
                        const n = Number(raw);
                        updateEmployee(
                          "meal_allowance_override_idr",
                          Number.isFinite(n) ? n : null,
                        );
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Attendance Reward */}
              <div>
                <div className="text-xs font-semibold">
                  Attendance reward
                </div>
                {!editing ? (
                  <div className="mt-1 text-sm text-gray-500">
                    {employee.gets_attendance_reward ? "Yes" : "No"}
                  </div>
                ) : (
                  <label className="mt-1 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={employee.gets_attendance_reward ?? false}
                      onChange={(e) =>
                        updateEmployee("gets_attendance_reward", e.target.checked)
                      }
                      className="rounded border-[var(--ikkimo-border)] bg-white text-[var(--ikkimo-brand)]"
                    />
                    <span className="text-sm">
                      {employee.gets_attendance_reward ? "Yes" : "No"}
                    </span>
                  </label>
                )}
              </div>

              {/* Cash Loan Balance */}
              {employee.cash_loan_balance_idr > 0 && (
                <div>
                  <div className="text-xs font-semibold">
                    Cash loan balance (IDR)
                  </div>
                  <div className="mt-1 text-sm text-red-600 font-medium">
                    {formatIDR(employee.cash_loan_balance_idr)}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
      {confirmOpen ? (
        <ConfirmSaveModal
          password={confirmPassword}
          setPassword={(v) => {
            setConfirmPassword(v);
            setConfirmError(null);
          }}
          error={confirmError}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmPassword("");
            setConfirmError(null);
          }}
          onConfirm={async () => {
            const ok = await verifyPassword();
            if (!ok) return;
            setConfirmOpen(false);
            await commitSave();
          }}
        />
      ) : null}
      {leaveOpen ? (
        <MarkAsLeftModal
          status={leaveStatus}
          setStatus={setLeaveStatus}
          endDate={leaveEndDate}
          setEndDate={(v) => {
            setLeaveEndDate(v);
            setLeaveError(null);
          }}
          password={leavePassword}
          setPassword={(v) => {
            setLeavePassword(v);
            setLeaveError(null);
          }}
          error={leaveError}
          saving={leaveSaving}
          onCancel={() => {
            setLeaveOpen(false);
            setLeavePassword("");
            setLeaveError(null);
          }}
          onConfirm={confirmMarkAsLeft}
        />
      ) : null}
    </>
  );
}

function MarkAsLeftModal(props: {
  status: "resigned" | "terminated";
  setStatus: (v: "resigned" | "terminated") => void;
  endDate: string;
  setEndDate: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { status, setStatus, endDate, setEndDate, password, setPassword, error, saving, onCancel, onConfirm } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <button className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onCancel} />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
        <div className="text-lg font-semibold text-red-600">End employment</div>
        <div className="mt-2 text-sm">
          This employee will be hidden from the main list. They&apos;ll still be
          available for payroll in their leaving month and the month after,
          for any residual pay, then no longer appear in payroll sessions.
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <div className="text-xs font-semibold">Reason</div>
            <select
              className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              value={status}
              onChange={(e) => setStatus(e.target.value as "resigned" | "terminated")}
            >
              <option value="resigned">Resigned</option>
              <option value="terminated">Terminated</option>
            </select>
          </label>

          <label className="block">
            <div className="text-xs font-semibold">Last working day *</div>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-[var(--ikkimo-border)] p-4">
          <div className="text-xs font-semibold">Confirm with your password</div>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
        </div>

        {error ? (
          <div className="mt-4 text-sm">
            Error: <span className="font-medium">{error}</span>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmSaveModal(props: {
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { password, setPassword, error, onCancel, onConfirm } = props;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
    >
      <button
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
        <div className="text-lg font-semibold">Confirm changes</div>
        <div className="mt-2 text-sm">
          These changes can affect payroll calculations. Only continue if you
          are sure.
        </div>

        <div className="mt-5 rounded-xl border border-[var(--ikkimo-border)] p-4">
          <div className="text-xs font-semibold">
            Confirm with your password
          </div>
          <div className="mt-2 text-xs">
            Enter your password, then click{" "}
            <span className="font-semibold">Confirm save</span>.
          </div>
          <input
            className="mt-2 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
          />
        </div>

        {error ? (
          <div className="mt-4 text-sm">
            Error: <span className="font-medium">{error}</span>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white"
          >
            Confirm save
          </button>
        </div>
      </div>
    </div>
  );
}
function capitalizeFirst(value: string | null | undefined) {
  if (!value) return "-";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
