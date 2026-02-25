"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatIDR } from "@/lib/formatters";
import type { PayrollSettingsRow, PositionRow, SkillGradeRow, SeniorityGradeRow } from "@/components/settings/types";

const SETTINGS_SELECT = [
  "id",
  "standard_working_days",
  "hours_per_day",
  "bpjs_employee_jht",
  "bpjs_employee_jp",
  "bpjs_company_jht",
  "bpjs_company_jkm",
  "bpjs_company_jkk",
  "bpjs_company_jp",
  "overtime1_multiplier",
  "overtime2_multiplier",
  "overtime3_multiplier",
  "thr",
  "created_at",
  "updated_at",
].join(", ");

const POSITIONS_SELECT = ["id", "name", "allowance_idr", "created_at", "updated_at"].join(", ");
const SKILL_GRADES_SELECT = ["id", "position_id", "level", "increase_monthly_idr", "notes", "created_at"].join(", ");
const SENIORITY_GRADES_SELECT = ["id", "grade", "increase_monthly_idr", "created_at"].join(", ");

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}


function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export default function SettingsPage() {
  const router = useRouter();
  // We don't have a generated Supabase `Database` type in this repo yet, so keep the
  // query builder untyped and cast `data` at the edges.
  const settingsTable = supabase.from("payroll_settings");
  const positionsTable = supabase.from("positions");
  const skillGradesTable = supabase.from("skill_grades");
  const seniorityGradesTable = supabase.from("seniority_grades");

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<PayrollSettingsRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  // --- Positions / grades editors ---
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);

  const [skillGrades, setSkillGrades] = useState<SkillGradeRow[]>([]);
  const [skillGradesLoading, setSkillGradesLoading] = useState(false);
  const [skillGradesError, setSkillGradesError] = useState<string | null>(null);

  const [seniorityGrades, setSeniorityGrades] = useState<SeniorityGradeRow[]>([]);
  const [seniorityGradesLoading, setSeniorityGradesLoading] = useState(false);
  const [seniorityGradesError, setSeniorityGradesError] = useState<string | null>(null);

  // Create forms
  const [newPositionName, setNewPositionName] = useState("");
  const [newPositionAllowance, setNewPositionAllowance] = useState(0);

  const [newSkillPositionId, setNewSkillPositionId] = useState<string>("");
  const [newSkillLevel, setNewSkillLevel] = useState(1);
  const [newSkillIncrease, setNewSkillIncrease] = useState(0);

  const [newSeniorityGrade, setNewSeniorityGrade] = useState(0);
  const [newSeniorityIncrease, setNewSeniorityIncrease] = useState(0);

  // Skill grades modal (managed per position)
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillModalPositionId, setSkillModalPositionId] = useState<string | null>(null);

  // Per-row edit buffers
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [positionEditName, setPositionEditName] = useState("");
  const [positionEditAllowance, setPositionEditAllowance] = useState(0);

  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillEditPositionId, setSkillEditPositionId] = useState<string>("");
  const [skillEditLevel, setSkillEditLevel] = useState(1);
  const [skillEditIncrease, setSkillEditIncrease] = useState(0);

  const [editingSeniorityId, setEditingSeniorityId] = useState<string | null>(null);
  const [seniorityEditGrade, setSeniorityEditGrade] = useState(0);
  const [seniorityEditIncrease, setSeniorityEditIncrease] = useState(0);

  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<PayrollSettingsRow | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  // Phrase-based confirmation (kept for later in case you want it):
  // const [confirmPhrase, setConfirmPhrase] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Phrase-based confirmation (kept for later in case you want it):
  // const DANGER_PHRASE = "UPDATE PAYROLL SETTINGS";
  // const phraseOk = confirmPhrase.trim() === DANGER_PHRASE;

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);
      setEditing(false);
      setSnapshot(null);
      setDirty(false);
      setSavedMsg(null);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      if (!alive) return;
      setEmail(session.user.email ?? "");

      // Load positions / grades for settings editors.
      setPositionsLoading(true);
      setSkillGradesLoading(true);
      setSeniorityGradesLoading(true);
      setPositionsError(null);
      setSkillGradesError(null);
      setSeniorityGradesError(null);

      const [posRes, skillRes, senRes] = await Promise.all([
        positionsTable.select(POSITIONS_SELECT).order("name", { ascending: true }),
        skillGradesTable
          .select(SKILL_GRADES_SELECT)
          .order("position_id", { ascending: true })
          .order("level", { ascending: true }),
        seniorityGradesTable.select(SENIORITY_GRADES_SELECT).order("grade", { ascending: true }),
      ]);

      if (!alive) return;

      if (posRes.error) {
        setPositionsError(posRes.error.message);
        setPositions([]);
      } else {
        const list = (posRes.data as unknown as PositionRow[]) ?? [];
        setPositions(list);
        if (list[0] && !newSkillPositionId) setNewSkillPositionId(list[0].id);
      }
      setPositionsLoading(false);

      if (skillRes.error) {
        setSkillGradesError(skillRes.error.message);
        setSkillGrades([]);
      } else {
        setSkillGrades((skillRes.data as unknown as SkillGradeRow[]) ?? []);
      }
      setSkillGradesLoading(false);

      if (senRes.error) {
        setSeniorityGradesError(senRes.error.message);
        setSeniorityGrades([]);
      } else {
        setSeniorityGrades((senRes.data as unknown as SeniorityGradeRow[]) ?? []);
      }
      setSeniorityGradesLoading(false);

      // Fetch existing settings row (treat as singleton).
      const res = await settingsTable
        .select(SETTINGS_SELECT)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      if (res.error) {
        setError(res.error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      // If no row exists, create one with defaults (DB defaults will fill most).
      if (!res.data) {
        const insertRes = await settingsTable
          .insert({})
          .select(SETTINGS_SELECT)
          .single();

        if (insertRes.error) {
          setError(insertRes.error.message);
          setRow(null);
        } else {
          setRow((insertRes.data as unknown as PayrollSettingsRow) ?? null);
          setEditing(false);
          setSnapshot(null);
          setDirty(false);
        }

        setLoading(false);
        return;
      }

      setRow((res.data as unknown as PayrollSettingsRow) ?? null);
      setEditing(false);
      setSnapshot(null);
      setDirty(false);
      setLoading(false);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  function updateField<K extends keyof PayrollSettingsRow>(
    key: K,
    value: PayrollSettingsRow[K]
  ) {
    if (!editing) return;

    setRow((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setDirty(true);
    setSavedMsg(null);
  }

  function startEdit() {
    if (!row) return;
    setSnapshot(row);
    setEditing(true);
    setDirty(false);
    setSavedMsg(null);
    setError(null);
  }

  function cancelEdit() {
    setRow(snapshot);
    setEditing(false);
    setDirty(false);
    setSavedMsg(null);
    setError(null);
    setConfirmOpen(false);
    // setConfirmPhrase("");
    setConfirmPassword("");
    setPasswordVerified(false);
    setConfirmError(null);
  }

  function requestSave() {
    if (!row) return;
    setConfirmOpen(true);
    // setConfirmPhrase("");
    setConfirmPassword("");
    setPasswordVerified(false);
    setConfirmError(null);
  }

  async function verifyPassword(): Promise<boolean> {
    setConfirmError(null);
    setPasswordVerified(false);

    const pwd = confirmPassword;
    if (!pwd) {
      setConfirmError("Enter your password to continue.");
      return false;
    }

    // Works only for email/password accounts.
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: pwd,
    });

    if (authErr) {
      setConfirmError("Password is incorrect.");
      return false;
    }

    setPasswordVerified(true);
    setConfirmPassword("");
    return true;
  }

  async function commitSave() {
    if (!row) return;

    setSaving(true);
    setError(null);
    setSavedMsg(null);

    // Light client-side normalization.
    const nextRow: PayrollSettingsRow = {
      ...row,
      standard_working_days: clamp(Math.trunc(row.standard_working_days), 1, 31),
      hours_per_day: clamp(Math.trunc(row.hours_per_day), 1, 24),
    };

    const res = await settingsTable
      .upsert(nextRow as unknown as Record<string, unknown>, { onConflict: "id" })
      .select(SETTINGS_SELECT)
      .single();

    if (res.error) {
      setError(res.error.message);
      setSaving(false);
      return;
    }

    setRow((res.data as unknown as PayrollSettingsRow) ?? null);
    setDirty(false);
    setEditing(false);
    setSnapshot(null);
    setSaving(false);
    setSavedMsg("Saved.");
  }

  const positionsById = useMemo(() => {
    const m = new Map<string, PositionRow>();
    for (const p of positions) m.set(p.id, p);
    return m;
  }, [positions]);

  const skillCountByPositionId = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of skillGrades) m.set(s.position_id, (m.get(s.position_id) ?? 0) + 1);
    return m;
  }, [skillGrades]);
  function openSkillModal(positionId: string) {
    setSkillModalPositionId(positionId);
    setNewSkillPositionId(positionId);
    cancelEditSkill();
    setSkillGradesError(null);
    setSkillModalOpen(true);
  }

  function closeSkillModal() {
    setSkillModalOpen(false);
    setSkillModalPositionId(null);
    cancelEditSkill();
    setSkillGradesError(null);
  }

  async function refreshPositions() {
    setPositionsLoading(true);
    setPositionsError(null);
    const res = await positionsTable.select(POSITIONS_SELECT).order("name", { ascending: true });
    if (res.error) {
      setPositionsError(res.error.message);
      setPositions([]);
    } else {
      setPositions((res.data as unknown as PositionRow[]) ?? []);
    }
    setPositionsLoading(false);
  }

  async function refreshSkillGrades() {
    setSkillGradesLoading(true);
    setSkillGradesError(null);
    const res = await skillGradesTable
      .select(SKILL_GRADES_SELECT)
      .order("position_id", { ascending: true })
      .order("level", { ascending: true });
    if (res.error) {
      setSkillGradesError(res.error.message);
      setSkillGrades([]);
    } else {
      setSkillGrades((res.data as unknown as SkillGradeRow[]) ?? []);
    }
    setSkillGradesLoading(false);
  }

  async function refreshSeniorityGrades() {
    setSeniorityGradesLoading(true);
    setSeniorityGradesError(null);
    const res = await seniorityGradesTable.select(SENIORITY_GRADES_SELECT).order("grade", { ascending: true });
    if (res.error) {
      setSeniorityGradesError(res.error.message);
      setSeniorityGrades([]);
    } else {
      setSeniorityGrades((res.data as unknown as SeniorityGradeRow[]) ?? []);
    }
    setSeniorityGradesLoading(false);
  }

  // --- Positions ---
  async function addPosition() {
    const name = newPositionName.trim();
    if (!name) {
      setPositionsError("Position name is required.");
      return;
    }
    setPositionsError(null);
    const res = await positionsTable.insert({ name, allowance_idr: newPositionAllowance }).select(POSITIONS_SELECT).single();
    if (res.error) {
      setPositionsError(res.error.message);
      return;
    }
    setNewPositionName("");
    setNewPositionAllowance(0);
    await refreshPositions();
  }

  function startEditPosition(p: PositionRow) {
    setEditingPositionId(p.id);
    setPositionEditName(p.name);
    setPositionEditAllowance(p.allowance_idr);
  }

  function cancelEditPosition() {
    setEditingPositionId(null);
    setPositionEditName("");
    setPositionEditAllowance(0);
  }

  async function saveEditPosition() {
    if (!editingPositionId) return;
    const name = positionEditName.trim();
    if (!name) {
      setPositionsError("Position name is required.");
      return;
    }
    setPositionsError(null);
    const res = await positionsTable
      .update({ name, allowance_idr: positionEditAllowance })
      .eq("id", editingPositionId)
      .select(POSITIONS_SELECT)
      .single();

    if (res.error) {
      setPositionsError(res.error.message);
      return;
    }

    cancelEditPosition();
    await refreshPositions();
  }

  async function deletePosition(id: string) {
    setPositionsError(null);
    const res = await positionsTable.delete().eq("id", id);
    if (res.error) {
      setPositionsError(res.error.message);
      return;
    }
    if (editingPositionId === id) cancelEditPosition();
    await refreshPositions();
    await refreshSkillGrades();
  }

  // --- Skill grades ---
  async function addSkillGrade(positionIdOverride?: string) {
    const pid = positionIdOverride ?? newSkillPositionId;
    if (!pid) {
      setSkillGradesError("Select a position.");
      return;
    }
    const level = clamp(Math.trunc(newSkillLevel), 1, 99);
    setSkillGradesError(null);

    const res = await skillGradesTable
      .insert({ position_id: pid, level, increase_monthly_idr: newSkillIncrease })
      .select(SKILL_GRADES_SELECT)
      .single();

    if (res.error) {
      setSkillGradesError(res.error.message);
      return;
    }

    setNewSkillLevel(1);
    setNewSkillIncrease(0);
    await refreshSkillGrades();
  }

  function startEditSkill(s: SkillGradeRow) {
    setEditingSkillId(s.id);
    setSkillEditPositionId(s.position_id);
    setSkillEditLevel(s.level);
    setSkillEditIncrease(s.increase_monthly_idr);
  }

  function cancelEditSkill() {
    setEditingSkillId(null);
    setSkillEditPositionId("");
    setSkillEditLevel(1);
    setSkillEditIncrease(0);
  }

  async function saveEditSkill() {
    if (!editingSkillId) return;
    if (!skillEditPositionId) {
      setSkillGradesError("Select a position.");
      return;
    }
    const level = clamp(Math.trunc(skillEditLevel), 1, 99);
    setSkillGradesError(null);

    const res = await skillGradesTable
      .update({ position_id: skillEditPositionId, level, increase_monthly_idr: skillEditIncrease })
      .eq("id", editingSkillId)
      .select(SKILL_GRADES_SELECT)
      .single();

    if (res.error) {
      setSkillGradesError(res.error.message);
      return;
    }

    cancelEditSkill();
    await refreshSkillGrades();
  }

  async function deleteSkill(id: string) {
    setSkillGradesError(null);
    const res = await skillGradesTable.delete().eq("id", id);
    if (res.error) {
      setSkillGradesError(res.error.message);
      return;
    }
    if (editingSkillId === id) cancelEditSkill();
    await refreshSkillGrades();
  }

  // --- Seniority grades ---
  async function addSeniorityGrade() {
    const grade = clamp(Math.trunc(newSeniorityGrade), 0, 999);
    setSeniorityGradesError(null);

    const res = await seniorityGradesTable
      .insert({ grade, increase_monthly_idr: newSeniorityIncrease })
      .select(SENIORITY_GRADES_SELECT)
      .single();

    if (res.error) {
      setSeniorityGradesError(res.error.message);
      return;
    }

    setNewSeniorityGrade(0);
    setNewSeniorityIncrease(0);
    await refreshSeniorityGrades();
  }

  function startEditSeniority(s: SeniorityGradeRow) {
    setEditingSeniorityId(s.id);
    setSeniorityEditGrade(s.grade);
    setSeniorityEditIncrease(s.increase_monthly_idr);
  }

  function cancelEditSeniority() {
    setEditingSeniorityId(null);
    setSeniorityEditGrade(0);
    setSeniorityEditIncrease(0);
  }

  async function saveEditSeniority() {
    if (!editingSeniorityId) return;
    const grade = clamp(Math.trunc(seniorityEditGrade), 0, 999);
    setSeniorityGradesError(null);

    const res = await seniorityGradesTable
      .update({ grade, increase_monthly_idr: seniorityEditIncrease })
      .eq("id", editingSeniorityId)
      .select(SENIORITY_GRADES_SELECT)
      .single();

    if (res.error) {
      setSeniorityGradesError(res.error.message);
      return;
    }

    cancelEditSeniority();
    await refreshSeniorityGrades();
  }

  async function deleteSeniority(id: string) {
    setSeniorityGradesError(null);
    const res = await seniorityGradesTable.delete().eq("id", id);
    if (res.error) {
      setSeniorityGradesError(res.error.message);
      return;
    }
    if (editingSeniorityId === id) cancelEditSeniority();
    await refreshSeniorityGrades();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-lg font-semibold">Settings</div>
            <div className="text-xs">{email}</div>
          </div>

          <div className="flex items-center gap-3">
            {savedMsg ? <div className="text-xs">{savedMsg}</div> : null}

            {!editing ? (
              <button
                onClick={startEdit}
                disabled={loading || !row}
                className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Edit
              </button>
            ) : (
              <>
                <button
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  onClick={requestSave}
                  disabled={loading || saving || !row || !dirty}
                  className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm">Loading…</div>
        ) : error ? (
          <div className="mt-4 text-sm">
            Error: <span className="font-medium">{error}</span>
          </div>
        ) : !row ? (
          <div className="mt-4 text-sm">No settings row available.</div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Working time */}
            <Section title="Working time">
              <NumberField
                label="Standard working days"
                value={row.standard_working_days}
                step={1}
                min={1}
                max={31}
                onChange={(v) => updateField("standard_working_days", v)}
                disabled={!editing}
              />
              <NumberField
                label="Hours per day"
                value={row.hours_per_day}
                step={1}
                min={1}
                max={24}
                onChange={(v) => updateField("hours_per_day", v)}
                disabled={!editing}
              />
            </Section>

            {/* Overtime + THR */}
            <Section title="Overtime + THR multipliers">
              <NumberField
                label="Overtime 1 multiplier"
                value={row.overtime1_multiplier}
                step={0.001}
                onChange={(v) => updateField("overtime1_multiplier", v)}
                disabled={!editing}
              />
              <NumberField
                label="Overtime 2 multiplier"
                value={row.overtime2_multiplier}
                step={0.001}
                onChange={(v) => updateField("overtime2_multiplier", v)}
                disabled={!editing}
              />
              <NumberField
                label="Overtime 3 multiplier"
                value={row.overtime3_multiplier}
                step={0.001}
                onChange={(v) => updateField("overtime3_multiplier", v)}
                disabled={!editing}
              />
              <NumberField
                label="THR multiplier"
                value={row.thr}
                step={0.001}
                onChange={(v) => updateField("thr", v)}
                disabled={!editing}
              />
              <HelperText>
                Store as multipliers (e.g. 1.5, 2.0).
              </HelperText>
            </Section>

            {/* BPJS Employee */}
            <Section title="BPJS (employee deductions)">
              <NumberField
                label="JHT (employee)"
                value={row.bpjs_employee_jht}
                step={0.000001}
                onChange={(v) => updateField("bpjs_employee_jht", v)}
                disabled={!editing}
              />
              <NumberField
                label="JP (employee)"
                value={row.bpjs_employee_jp}
                step={0.000001}
                onChange={(v) => updateField("bpjs_employee_jp", v)}
                disabled={!editing}
              />
              <HelperText>Example: 2% = 0.02</HelperText>
            </Section>

            {/* BPJS Company */}
            <Section title="BPJS (company payout)">
              <NumberField
                label="JHT (company)"
                value={row.bpjs_company_jht}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jht", v)}
                disabled={!editing}
              />
              <NumberField
                label="JKM (company)"
                value={row.bpjs_company_jkm}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jkm", v)}
                disabled={!editing}
              />
              <NumberField
                label="JKK (company)"
                value={row.bpjs_company_jkk}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jkk", v)}
                disabled={!editing}
              />
              <NumberField
                label="JP (company)"
                value={row.bpjs_company_jp}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jp", v)}
                disabled={!editing}
              />
              <HelperText>Example: 3.7% = 0.037</HelperText>
            </Section>
          </div>
        )}
      </div>

            {/* --- Positions / grades editors --- */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Positions (top-left) */}
        <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6">
          <div className="text-sm font-semibold">Positions</div>
          <div className="mt-1 text-xs text-[var(--ikkimo-text-muted,#666)]">
            Fixed monthly allowance per position.
          </div>

          {positionsLoading ? (
            <div className="mt-4 text-sm">Loading…</div>
          ) : positionsError ? (
            <div className="mt-4 text-sm">
              Error: <span className="font-medium">{positionsError}</span>
            </div>
          ) : (
            <>
              {/* Create new */}
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="sm:col-span-2">
                  <div className="text-xs font-semibold">Position name</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    value={newPositionName}
                    onChange={(e) => setNewPositionName(e.target.value)}
                    placeholder="e.g. Supervisor"
                  />
                </label>
                <label>
                  <div className="text-xs font-semibold">Allowance (IDR)</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    type="number"
                    value={String(newPositionAllowance)}
                    onChange={(e) => setNewPositionAllowance(toNumber(e.target.value, 0))}
                  />
                </label>
              </div>

              <button
                onClick={addPosition}
                className="mt-3 rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white"
              >
                Add position
              </button>

              {/* List */}
              <div className="mt-5 space-y-2 max-h-[25vh] overflow-y-auto">
                {positions.length === 0 ? (
                  <div className="text-sm">No positions yet.</div>
                ) : (
                  positions.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--ikkimo-border)] p-3 hover:bg-[var(--ikkimo-brand-hover)]"
                    >
                      {editingPositionId === p.id ? (
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                          <label className="flex-1">
                            <div className="text-xs font-semibold">Name</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                              value={positionEditName}
                              onChange={(e) => setPositionEditName(e.target.value)}
                            />
                          </label>
                          <label className="sm:w-44">
                            <div className="text-xs font-semibold">Allowance</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                              type="number"
                              value={String(positionEditAllowance)}
                              onChange={(e) => setPositionEditAllowance(toNumber(e.target.value, 0))}
                            />
                          </label>
                          <div className="flex gap-2 sm:pb-[2px]">
                            <button
                              onClick={saveEditPosition}
                              className="rounded-xl bg-[var(--ikkimo-brand)] px-3 py-2 text-sm font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditPosition}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{p.name}</div>
                            <div className="mt-1 text-xs text-[var(--ikkimo-text-muted,#666)]">
                              Allowance: {formatIDR(p.allowance_idr)}
                            </div>
                            <div className="text-xs text-[var(--ikkimo-text-muted,#666)]">
                              Skill grades: {skillCountByPositionId.get(p.id) ?? 0}
                            </div>
                          </div>

                          <div className="ml-3 flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openSkillModal(p.id)}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                              title="View / edit skill grades"
                            >
                              Skills
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditPosition(p)}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                              title="Edit position name / allowance"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePosition(p.id)}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Seniority (top-right) */}
        <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6">
          <div className="text-sm font-semibold">Seniority grades</div>
          <div className="mt-1 text-xs text-[var(--ikkimo-text-muted,#666)]">
            Monthly increase for each grade.
          </div>

          {seniorityGradesLoading ? (
            <div className="mt-4 text-sm">Loading…</div>
          ) : seniorityGradesError ? (
            <div className="mt-4 text-sm">
              Error: <span className="font-medium">{seniorityGradesError}</span>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="sm:col-span-2">
                  <div className="text-xs font-semibold">Grade</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    type="number"
                    value={String(newSeniorityGrade)}
                    onChange={(e) => setNewSeniorityGrade(toNumber(e.target.value, 0))}
                    min={0}
                    placeholder="e.g. 0"
                  />
                </label>
                <label>
                  <div className="text-xs font-semibold">Increase (IDR)</div>
                  <input
                    className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                    type="number"
                    value={String(newSeniorityIncrease)}
                    onChange={(e) => setNewSeniorityIncrease(toNumber(e.target.value, 0))}
                  />
                </label>
              </div>

              <button
                onClick={addSeniorityGrade}
                className="mt-3 rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white"
              >
                Add grade
              </button>

              <div className="mt-5 space-y-2 max-h-[25vh] overflow-y-auto">
                {seniorityGrades.length === 0 ? (
                  <div className="text-sm">No grades yet.</div>
                ) : (
                  seniorityGrades.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-[var(--ikkimo-border)] p-3"
                    >
                      {editingSeniorityId === s.id ? (
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                          <label className="flex-1">
                            <div className="text-xs font-semibold">Grade</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                              type="number"
                              value={String(seniorityEditGrade)}
                              onChange={(e) => setSeniorityEditGrade(toNumber(e.target.value, 0))}
                              min={0}
                            />
                          </label>
                          <label className="sm:w-44">
                            <div className="text-xs font-semibold">Increase</div>
                            <input
                              className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                              type="number"
                              value={String(seniorityEditIncrease)}
                              onChange={(e) => setSeniorityEditIncrease(toNumber(e.target.value, 0))}
                            />
                          </label>
                          <div className="flex gap-2 sm:pb-[2px]">
                            <button
                              onClick={saveEditSeniority}
                              className="rounded-xl bg-[var(--ikkimo-brand)] px-3 py-2 text-sm font-semibold text-white"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditSeniority}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="text-sm font-medium">{s.grade}</div>
                            <div className="text-xs text-[var(--ikkimo-text-muted,#666)]">
                              Increase: {formatIDR(s.increase_monthly_idr)}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditSeniority(s)}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSeniority(s.id)}
                              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

      {skillModalOpen && skillModalPositionId ? (
        <SkillGradesModal
          position={positionsById.get(skillModalPositionId) ?? null}
          positions={positions}
          grades={skillGrades.filter((g) => g.position_id === skillModalPositionId)}
          allGrades={skillGrades}
          positionsById={positionsById}
          editingSkillId={editingSkillId}
          skillEditPositionId={skillEditPositionId}
          skillEditLevel={skillEditLevel}
          skillEditIncrease={skillEditIncrease}
          setSkillEditPositionId={setSkillEditPositionId}
          setSkillEditLevel={setSkillEditLevel}
          setSkillEditIncrease={setSkillEditIncrease}
          startEditSkill={startEditSkill}
          cancelEditSkill={cancelEditSkill}
          saveEditSkill={saveEditSkill}
          deleteSkill={deleteSkill}
          newSkillLevel={newSkillLevel}
          newSkillIncrease={newSkillIncrease}
          setNewSkillLevel={setNewSkillLevel}
          setNewSkillIncrease={setNewSkillIncrease}
          addSkillGrade={() => addSkillGrade(skillModalPositionId)}
          loading={skillGradesLoading}
          error={skillGradesError}
          onClose={closeSkillModal}
          formatIDR={formatIDR}
        />
      ) : null}
      </div>

      {confirmOpen ? (
        <ConfirmSaveModal
          password={confirmPassword}
          setPassword={(v) => {
            setConfirmPassword(v);
            setPasswordVerified(false);
            setConfirmError(null);
          }}
          passwordVerified={passwordVerified}
          error={confirmError}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmPassword("");
            setPasswordVerified(false);
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
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--ikkimo-border)] p-5">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function HelperText({ children }: { children: React.ReactNode }) {
  return <div className="pt-1 text-xs text-[var(--ikkimo-text-muted, #666)]">{children}</div>;
}

function NumberField(props: {
  label: string;
  value: number;
  step: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  const { label, value, step, min, max, disabled, onChange } = props;

  return (
    <label className="block">
      <div className="text-xs font-semibold">{label}</div>
      <input
        className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)] disabled:cursor-not-allowed disabled:opacity-60"
        type="number"
        value={Number.isFinite(value) ? String(value) : "0"}
        step={step}
        min={min}
        max={max}
        disabled={disabled}
        onChange={(e) => onChange(toNumber(e.target.value, value))}
      />
    </label>
  );
}

function ConfirmSaveModal(props: {
  password: string;
  setPassword: (v: string) => void;
  passwordVerified: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const {
    password,
    setPassword,
    passwordVerified,
    error,
    onCancel,
    onConfirm,
  } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <button className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onCancel} />

      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
        <div className="text-lg font-semibold">Confirm changes</div>
        <div className="mt-2 text-sm">
          These settings affect payroll calculations. Only continue if you are sure.
        </div>

        <div className="mt-5 space-y-4">
          {/*
          <div className="rounded-xl border border-[var(--ikkimo-border)] p-4">
            <div className="text-xs font-semibold">Option A: type the confirmation phrase</div>
            <div className="mt-2 text-xs">Type: <span className="font-semibold">UPDATE PAYROLL SETTINGS</span></div>
            <input
              className="mt-2 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="UPDATE PAYROLL SETTINGS"
            />
            {phraseOk ? <div className="mt-2 text-xs">Phrase confirmed.</div> : null}
          </div>
          */}

          <div className="rounded-xl border border-[var(--ikkimo-border)] p-4">
            <div className="text-xs font-semibold">Confirm with your password</div>
            <div className="mt-2 text-xs">Enter your password, then click <span className="font-semibold">Confirm save</span>.</div>
            <input
              className="mt-2 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
            {passwordVerified ? <div className="mt-2 text-xs">Password verified.</div> : null}
          </div>

          {error ? (
            <div className="text-sm">
              Error: <span className="font-medium">{error}</span>
            </div>
          ) : null}
        </div>

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


function SkillGradesModal(props: {
  position: PositionRow | null;
  positions: PositionRow[];
  grades: SkillGradeRow[];
  allGrades: SkillGradeRow[];
  positionsById: Map<string, PositionRow>;
  editingSkillId: string | null;
  skillEditPositionId: string;
  skillEditLevel: number;
  skillEditIncrease: number;
  setSkillEditPositionId: (v: string) => void;
  setSkillEditLevel: (v: number) => void;
  setSkillEditIncrease: (v: number) => void;
  startEditSkill: (s: SkillGradeRow) => void;
  cancelEditSkill: () => void;
  saveEditSkill: () => Promise<void>;
  deleteSkill: (id: string) => Promise<void>;
  newSkillLevel: number;
  newSkillIncrease: number;
  setNewSkillLevel: (v: number) => void;
  setNewSkillIncrease: (v: number) => void;
  addSkillGrade: () => Promise<void>;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  formatIDR: (n: number | null | undefined) => string;
}) {
  const {
    position,
    positions,
    grades,
    positionsById,
    editingSkillId,
    skillEditPositionId,
    skillEditLevel,
    skillEditIncrease,
    setSkillEditPositionId,
    setSkillEditLevel,
    setSkillEditIncrease,
    startEditSkill,
    cancelEditSkill,
    saveEditSkill,
    deleteSkill,
    newSkillLevel,
    newSkillIncrease,
    setNewSkillLevel,
    setNewSkillIncrease,
    addSkillGrade,
    loading,
    error,
    onClose,
    formatIDR,
  } = props;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <button className="absolute inset-0 bg-black/30" aria-label="Close" onClick={onClose} />

      <div className="relative w-full max-w-3xl rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Skill grades</div>
            <div className="mt-1 text-sm">
              Position: <span className="font-medium">{position?.name ?? "Unknown position"}</span>
            </div>
          </div>

          <button
            onClick={() => {
              cancelEditSkill();
              onClose();
            }}
            className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
          >
            Close
          </button>
        </div>

        <div className="mt-5">
          <div className="text-sm font-semibold">Add new skill grade</div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label>
              <div className="text-xs font-semibold">Level</div>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                type="number"
                value={String(newSkillLevel)}
                onChange={(e) => setNewSkillLevel(toNumber(e.target.value, 1))}
                min={1}
              />
            </label>
            <label>
              <div className="text-xs font-semibold">Increase (IDR)</div>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                type="number"
                value={String(newSkillIncrease)}
                onChange={(e) => setNewSkillIncrease(toNumber(e.target.value, 0))}
              />
            </label>
            <div className="flex items-end">
              <button
                onClick={addSkillGrade}
                className="w-full rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white"
                disabled={!position}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Existing grades</div>
            <div className="text-xs text-[var(--ikkimo-text-muted,#666)]">{grades.length} total</div>
          </div>

          {loading ? (
            <div className="mt-3 text-sm">Loading…</div>
          ) : error ? (
            <div className="mt-3 text-sm">
              Error: <span className="font-medium">{error}</span>
            </div>
          ) : grades.length === 0 ? (
            <div className="mt-3 text-sm">No skill grades yet.</div>
          ) : (
            <div className="mt-3 space-y-2 max-h-[55vh] overflow-y-auto">
              {grades.map((s) => {
                const posName = positionsById.get(s.position_id)?.name ?? "Unknown position";
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl border border-[var(--ikkimo-border)] p-3"
                  >
                    {editingSkillId === s.id ? (
                      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                        <label className="flex-1">
                          <div className="text-xs font-semibold">Position</div>
                          <select
                            className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                            value={skillEditPositionId}
                            onChange={(e) => setSkillEditPositionId(e.target.value)}
                          >
                            {positions.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="sm:w-28">
                          <div className="text-xs font-semibold">Level</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                            type="number"
                            value={String(skillEditLevel)}
                            onChange={(e) => setSkillEditLevel(toNumber(e.target.value, 1))}
                            min={1}
                          />
                        </label>
                        <label className="sm:w-44">
                          <div className="text-xs font-semibold">Increase</div>
                          <input
                            className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                            type="number"
                            value={String(skillEditIncrease)}
                            onChange={(e) => setSkillEditIncrease(toNumber(e.target.value, 0))}
                          />
                        </label>
                        <div className="flex gap-2 sm:pb-[2px]">
                          <button
                            onClick={saveEditSkill}
                            className="rounded-xl bg-[var(--ikkimo-brand)] px-3 py-2 text-sm font-semibold text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditSkill}
                            className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <div className="text-sm font-medium">
                            {posName} — L{s.level}
                          </div>
                          <div className="text-xs text-[var(--ikkimo-text-muted,#666)]">
                            Increase: {formatIDR(s.increase_monthly_idr)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEditSkill(s)}
                            className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteSkill(s.id)}
                            className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-1.5 text-sm hover:border-[var(--ikkimo-brand)]"
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}