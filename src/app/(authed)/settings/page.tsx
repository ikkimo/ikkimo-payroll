"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { formatIDR } from "@/lib/formatters";
import type {
  PayrollSettingsRow,
  PositionRow,
  SkillGradeRow,
  SeniorityGradeRow,
} from "@/components/settings/types";

const SETTINGS_SELECT = [
  "id",
  "standard_working_days",
  "hours_per_day",
  "payroll_end_date",
  "meal_allowance_per_day_idr",
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
  "thr_muslim_date",
  "thr_christian_date",
  "thr_balinese_date",
  "lateness_base_deduction_idr",
  "lateness_base_minutes",
  "lateness_increment_idr",
  "lateness_increment_minutes",
  "created_at",
  "updated_at",
].join(", ");

const POSITIONS_SELECT = [
  "id",
  "name",
  "allowance_idr",
  "created_at",
  "updated_at",
].join(", ");
const SKILL_GRADES_SELECT = [
  "id",
  "position_id",
  "level",
  "increase_monthly_idr",
  "notes",
  "created_at",
].join(", ");
const SENIORITY_GRADES_SELECT = [
  "id",
  "grade",
  "increase_monthly_idr",
  "created_at",
].join(", ");

function toNumber(value: string, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parseYMDLocal(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isPastYMD(s: string) {
  const input = parseYMDLocal(s);
  const today = new Date();
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return input < now;
}

type SettingsTab = "payroll" | "bpjs" | "positions";

export default function SettingsPage() {
  const router = useRouter();
  const settingsTable = supabase.from("payroll_settings");
  const positionsTable = supabase.from("positions");
  const skillGradesTable = supabase.from("skill_grades");
  const seniorityGradesTable = supabase.from("seniority_grades");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<PayrollSettingsRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [tab, setTab] = useState<SettingsTab>("payroll");

  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [positionSearch, setPositionSearch] = useState("");

  const [skillGrades, setSkillGrades] = useState<SkillGradeRow[]>([]);
  const [skillGradesLoading, setSkillGradesLoading] = useState(false);
  const [skillGradesError, setSkillGradesError] = useState<string | null>(null);

  const [seniorityGrades, setSeniorityGrades] = useState<SeniorityGradeRow[]>(
    [],
  );

  const [newPositionName, setNewPositionName] = useState("");
  const [newSkillPositionId, setNewSkillPositionId] = useState("");
  const [newSkillLevel, setNewSkillLevel] = useState("");
  const [newSkillIncrease, setNewSkillIncrease] = useState("");

  // Position edit/delete modal
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [positionModalTarget, setPositionModalTarget] =
    useState<PositionRow | null>(null);
  const [positionModalName, setPositionModalName] = useState("");
  const [positionModalAllowance, setPositionModalAllowance] = useState("");

  // Skill grades modal
  const [skillModalOpen, setSkillModalOpen] = useState(false);
  const [skillModalPositionId, setSkillModalPositionId] = useState<
    string | null
  >(null);
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null);
  const [skillEditLevel, setSkillEditLevel] = useState(1);
  const [skillEditIncrease, setSkillEditIncrease] = useState(0);

  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<PayrollSettingsRow | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    "payroll-save" | "position-save" | "position-delete" | null
  >(null);

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

      setPositionsLoading(true);
      setSkillGradesLoading(true);

      const [posRes, skillRes, senRes] = await Promise.all([
        positionsTable
          .select(POSITIONS_SELECT)
          .order("name", { ascending: true }),
        skillGradesTable
          .select(SKILL_GRADES_SELECT)
          .order("position_id", { ascending: true })
          .order("level", { ascending: true }),
        seniorityGradesTable
          .select(SENIORITY_GRADES_SELECT)
          .order("grade", { ascending: true }),
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
      } else
        setSkillGrades((skillRes.data as unknown as SkillGradeRow[]) ?? []);
      setSkillGradesLoading(false);

      if (!senRes.error)
        setSeniorityGrades(
          (senRes.data as unknown as SeniorityGradeRow[]) ?? [],
        );

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

      if (!res.data) {
        const insertRes = await settingsTable
          .insert({})
          .select(SETTINGS_SELECT)
          .single();
        if (insertRes.error) {
          setError(insertRes.error.message);
          setRow(null);
        } else
          setRow((insertRes.data as unknown as PayrollSettingsRow) ?? null);
        setLoading(false);
        return;
      }

      setRow((res.data as unknown as PayrollSettingsRow) ?? null);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  function updateField<K extends keyof PayrollSettingsRow>(
    key: K,
    value: PayrollSettingsRow[K],
  ) {
    if (!editing) return;
    setRow((prev) => (prev ? { ...prev, [key]: value } : prev));
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
    setConfirmPassword("");
    setPasswordVerified(false);
    setConfirmError(null);
    setConfirmAction(null);
  }

  function requestSave() {
    if (!row) return;
    setConfirmAction("payroll-save");
    setConfirmOpen(true);
    setConfirmPassword("");
    setPasswordVerified(false);
    setConfirmError(null);
  }

  async function verifyPassword(): Promise<boolean> {
    setConfirmError(null);
    setPasswordVerified(false);
    if (!confirmPassword) {
      setConfirmError("Enter your password to continue.");
      return false;
    }
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email,
      password: confirmPassword,
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
    if (confirmAction === "position-save") {
      await savePositionModal();
      setConfirmAction(null);
      return;
    }

    if (confirmAction === "position-delete") {
      await deletePositionModal();
      setConfirmAction(null);
      return;
    }

    if (confirmAction === "payroll-save") {
      if (!row) return;
      setSaving(true);
      setError(null);
      setSavedMsg(null);
      const nextRow: PayrollSettingsRow = {
        ...row,
        standard_working_days: clamp(
          Math.trunc(row.standard_working_days),
          1,
          31,
        ),
        hours_per_day: clamp(Math.trunc(row.hours_per_day), 1, 24),
      };
      const res = await settingsTable
        .upsert(nextRow as unknown as Record<string, unknown>, {
          onConflict: "id",
        })
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
      setConfirmAction(null);
    }
  }

  const positionsById = useMemo(() => {
    const m = new Map<string, PositionRow>();
    for (const p of positions) m.set(p.id, p);
    return m;
  }, [positions]);

  const skillsByPosition = useMemo(() => {
    const m = new Map<string, SkillGradeRow[]>();
    for (const s of skillGrades) {
      const arr = m.get(s.position_id) ?? [];
      arr.push(s);
      m.set(s.position_id, arr);
    }
    return m;
  }, [skillGrades]);

  const filteredPositions = useMemo(() => {
    const q = positionSearch.trim().toLowerCase();
    if (!q) return positions;
    return positions.filter((p) => p.name.toLowerCase().includes(q));
  }, [positions, positionSearch]);

  // ── Position modal ──
  function openPositionModal(p: PositionRow) {
    setPositionModalTarget(p);
    setPositionModalName(p.name);
    setPositionModalAllowance(String(p.allowance_idr ?? 0));
    setPositionModalOpen(true);
  }
  function closePositionModal() {
    setPositionModalOpen(false);
    setPositionModalTarget(null);
    setPositionModalName("");
    setPositionModalAllowance(String(0));
    setPositionsError(null);
  }
  async function savePositionModal() {
    if (!positionModalTarget) return;
    const name = positionModalName.trim();
    const allowance = Number(positionModalAllowance || 0);
    if (!name) {
      setPositionsError("Name is required.");
      return;
    }
    setPositionsError(null);
    const res = await positionsTable
      .update({ name, allowance_idr: allowance })
      .eq("id", positionModalTarget.id)
      .select(POSITIONS_SELECT)
      .single();
    if (res.error) {
      setPositionsError(res.error.message);
      return;
    }
    closePositionModal();
    await refreshPositions();
  }
  async function deletePositionModal() {
    if (!positionModalTarget) return;

    setPositionsError(null);

    const employeeCheck = await supabase
      .from("employees")
      .select("uuid", { count: "exact", head: true })
      .eq("position_id", positionModalTarget.id);

    if (employeeCheck.error) {
      setPositionsError(employeeCheck.error.message);
      return;
    }

    if ((employeeCheck.count ?? 0) > 0) {
      setPositionsError(
        "Can't delete this position because employees are still assigned to it.",
      );
      return;
    }

    const skillDelete = await skillGradesTable
      .delete()
      .eq("position_id", positionModalTarget.id);

    if (skillDelete.error) {
      setPositionsError(skillDelete.error.message);
      return;
    }

    const positionDelete = await positionsTable
      .delete()
      .eq("id", positionModalTarget.id);

    if (positionDelete.error) {
      setPositionsError(positionDelete.error.message);
      return;
    }

    closePositionModal();
    await Promise.all([refreshPositions(), refreshSkillGrades()]);
  }

  function requestPositionSave() {
    if (!positionModalTarget) return;
    setConfirmAction("position-save");
    setConfirmOpen(true);
    setConfirmPassword("");
    setPasswordVerified(false);
    setConfirmError(null);
  }

  function requestPositionDelete() {
    if (!positionModalTarget) return;
    setConfirmAction("position-delete");
    setConfirmOpen(true);
    setConfirmPassword("");
    setPasswordVerified(false);
    setConfirmError(null);
  }

  // ── Skill modal ──
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
    const res = await positionsTable
      .select(POSITIONS_SELECT)
      .order("name", { ascending: true });
    if (res.error) {
      setPositionsError(res.error.message);
      setPositions([]);
    } else setPositions((res.data as unknown as PositionRow[]) ?? []);
    setPositionsLoading(false);
  }
  async function refreshSkillGrades() {
    setSkillGradesLoading(true);
    const res = await skillGradesTable
      .select(SKILL_GRADES_SELECT)
      .order("position_id", { ascending: true })
      .order("level", { ascending: true });
    if (res.error) {
      setSkillGradesError(res.error.message);
      setSkillGrades([]);
    } else setSkillGrades((res.data as unknown as SkillGradeRow[]) ?? []);
    setSkillGradesLoading(false);
  }

  async function addPosition() {
    const name = newPositionName.trim();
    if (!name) {
      setPositionsError("Position name is required.");
      return;
    }
    setPositionsError(null);
    const res = await positionsTable
      .insert({ name })
      .select(POSITIONS_SELECT)
      .single();
    if (res.error) {
      setPositionsError(res.error.message);
      return;
    }
    setNewPositionName("");
    const newPos = res.data as unknown as PositionRow;
    await skillGradesTable.insert({
      position_id: newPos.id,
      level: 1,
      increase_monthly_idr: 0,
    });
    await Promise.all([refreshPositions(), refreshSkillGrades()]);
  }

  async function addSkillGrade(positionIdOverride?: string) {
    const pid = positionIdOverride ?? newSkillPositionId;
    if (!pid) {
      setSkillGradesError("Select a position.");
      return;
    }

    const parsedLevel = Number(newSkillLevel);
    if (!Number.isFinite(parsedLevel)) {
      setSkillGradesError("Enter a level.");
      return;
    }

    const level = clamp(Math.trunc(parsedLevel), 1, 99);
    const increase = Number(newSkillIncrease || 0);

    setSkillGradesError(null);

    const res = await skillGradesTable
      .insert({
        position_id: pid,
        level,
        increase_monthly_idr: increase,
      })
      .select(SKILL_GRADES_SELECT)
      .single();

    if (res.error) {
      setSkillGradesError(res.error.message);
      return;
    }

    setNewSkillLevel("");
    setNewSkillIncrease("");
    await refreshSkillGrades();
  }

  function startEditSkill(s: SkillGradeRow) {
    setEditingSkillId(s.id);
    setSkillEditLevel(s.level);
    setSkillEditIncrease(s.increase_monthly_idr);
  }
  function cancelEditSkill() {
    setEditingSkillId(null);
    setSkillEditLevel(1);
    setSkillEditIncrease(0);
  }
  async function saveEditSkill() {
    if (!editingSkillId || !skillModalPositionId) return;
    const level = clamp(Math.trunc(skillEditLevel), 1, 99);
    setSkillGradesError(null);
    const res = await skillGradesTable
      .update({ level, increase_monthly_idr: skillEditIncrease })
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

  const TAB_LABELS: Record<SettingsTab, string> = {
    payroll: "Payroll",
    bpjs: "BPJS",
    positions: "Positions & Skills",
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Settings</div>
            <div className="mt-0.5 text-sm text-[var(--ikkimo-text-muted,#666)]">
              {email}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedMsg && (
              <span className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                {savedMsg}
              </span>
            )}
            {!editing ? (
              <Btn onClick={startEdit}>Edit</Btn>
            ) : (
              <>
                <Btn onClick={cancelEdit}>Cancel</Btn>
                <Btn primary onClick={requestSave} disabled={saving || !dirty}>
                  {saving ? "Saving…" : "Save"}
                </Btn>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 flex gap-1 border-t border-[var(--ikkimo-border)] pt-3">
          {(["payroll", "bpjs", "positions"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-[var(--ikkimo-brand)] text-white"
                  : "text-[var(--ikkimo-text-muted,#666)] hover:bg-[var(--ikkimo-surface,#f5f5f5)]"
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Body ── */}
      {loading ? (
        <Card>
          <p className="text-sm text-[var(--ikkimo-text-muted,#888)]">
            Loading…
          </p>
        </Card>
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">Error: {error}</p>
        </Card>
      ) : !row ? (
        <Card>
          <p className="text-sm text-[var(--ikkimo-text-muted,#888)]">
            No settings row available.
          </p>
        </Card>
      ) : (
        <>
          {/* ── PAYROLL ── */}
          {tab === "payroll" && (
            <div className="space-y-4">
              <Card>
                <SectionLabel>Working time</SectionLabel>
                <FieldRows>
                  <FieldRow label="Standard working days">
                    <NumIn
                      value={row.standard_working_days}
                      step={1}
                      min={1}
                      max={31}
                      disabled={!editing}
                      onChange={(v) => updateField("standard_working_days", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Hours per day">
                    <NumIn
                      value={row.hours_per_day}
                      step={1}
                      min={1}
                      max={24}
                      disabled={!editing}
                      onChange={(v) => updateField("hours_per_day", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Payroll cut-off date">
                    <NumIn
                      value={row.payroll_end_date}
                      step={1}
                      min={1}
                      max={31}
                      disabled={!editing}
                      onChange={(v) => updateField("payroll_end_date", v)}
                    />
                  </FieldRow>
                </FieldRows>
              </Card>

              <Card>
                <SectionLabel>Meal allowance</SectionLabel>
                <FieldRows>
                  <FieldRow label="Per day (IDR)">
                    <NumIn
                      value={row.meal_allowance_per_day_idr ?? 0}
                      step={1000}
                      min={0}
                      disabled={!editing}
                      onChange={(v) =>
                        updateField("meal_allowance_per_day_idr", v)
                      }
                    />
                  </FieldRow>
                </FieldRows>
              </Card>

              <Card>
                <SectionLabel>Lateness deductions</SectionLabel>
                <FieldRows>
                  <FieldRow label="Base deduction (IDR)">
                    <NumIn
                      value={row.lateness_base_deduction_idr ?? 25000}
                      step={1000}
                      min={0}
                      disabled={!editing}
                      onChange={(v) =>
                        updateField("lateness_base_deduction_idr", v)
                      }
                    />
                  </FieldRow>
                  <FieldRow label="Base threshold (minutes)">
                    <NumIn
                      value={row.lateness_base_minutes ?? 5}
                      step={1}
                      min={1}
                      disabled={!editing}
                      onChange={(v) => updateField("lateness_base_minutes", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Increment per bracket (IDR)">
                    <NumIn
                      value={row.lateness_increment_idr ?? 10000}
                      step={1000}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("lateness_increment_idr", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Bracket size (minutes)">
                    <NumIn
                      value={row.lateness_increment_minutes ?? 5}
                      step={1}
                      min={1}
                      disabled={!editing}
                      onChange={(v) =>
                        updateField("lateness_increment_minutes", v)
                      }
                    />
                  </FieldRow>
                </FieldRows>
                <p className="mt-3 text-xs text-[var(--ikkimo-text-muted,#888)]">
                  Example: 6 mins late →{" "}
                  {formatIDR(row.lateness_base_deduction_idr ?? 25000)} base + 1
                  × {formatIDR(row.lateness_increment_idr ?? 10000)} ={" "}
                  {formatIDR(
                    (row.lateness_base_deduction_idr ?? 25000) +
                      (row.lateness_increment_idr ?? 10000),
                  )}
                </p>
              </Card>

              <Card>
                <SectionLabel>Overtime</SectionLabel>
                <FieldRows>
                  <FieldRow label="Overtime rate 1">
                    <NumIn
                      value={row.overtime1_multiplier}
                      step={0.5}
                      min={1}
                      disabled={!editing}
                      onChange={(v) => updateField("overtime1_multiplier", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Overtime rate 2">
                    <NumIn
                      value={row.overtime2_multiplier}
                      step={0.5}
                      min={1}
                      disabled={!editing}
                      onChange={(v) => updateField("overtime2_multiplier", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Overtime rate 3">
                    <NumIn
                      value={row.overtime3_multiplier}
                      step={0.5}
                      min={1}
                      disabled={!editing}
                      onChange={(v) => updateField("overtime3_multiplier", v)}
                    />
                  </FieldRow>
                </FieldRows>
              </Card>

              <Card>
                <SectionLabel>THR dates &amp; multiplier</SectionLabel>
                <FieldRows>
                  <FieldRow label="Muslim">
                    <DateIn
                      value={row.thr_muslim_date ?? null}
                      disabled={!editing}
                      onChange={(v) => updateField("thr_muslim_date", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Christian">
                    <DateIn
                      value={row.thr_christian_date ?? null}
                      disabled={!editing}
                      onChange={(v) => updateField("thr_christian_date", v)}
                    />
                  </FieldRow>
                  <FieldRow label="Balinese">
                    <DateIn
                      value={row.thr_balinese_date ?? null}
                      disabled={!editing}
                      onChange={(v) => updateField("thr_balinese_date", v)}
                    />
                  </FieldRow>
                  <FieldRow label="THR multiplier">
                    <NumIn
                      value={row.thr}
                      step={0.1}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("thr", v)}
                    />
                  </FieldRow>
                </FieldRows>
              </Card>
            </div>
          )}

          {/* ── BPJS ── */}
          {tab === "bpjs" && (
            <div className="space-y-4">
              <Card>
                <SectionLabel>Employee contributions</SectionLabel>
                <FieldRows>
                  <FieldRow label="JHT">
                    <NumIn
                      value={row.bpjs_employee_jht}
                      step={0.001}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("bpjs_employee_jht", v)}
                    />
                  </FieldRow>
                  <FieldRow label="JP">
                    <NumIn
                      value={row.bpjs_employee_jp}
                      step={0.001}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("bpjs_employee_jp", v)}
                    />
                  </FieldRow>
                </FieldRows>
                <p className="mt-3 text-xs text-[var(--ikkimo-text-muted,#888)]">
                  Enter as decimals — 2% = 0.02
                </p>
              </Card>
              <Card>
                <SectionLabel>Company contributions</SectionLabel>
                <FieldRows>
                  <FieldRow label="JHT">
                    <NumIn
                      value={row.bpjs_company_jht}
                      step={0.001}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("bpjs_company_jht", v)}
                    />
                  </FieldRow>
                  <FieldRow label="JKM">
                    <NumIn
                      value={row.bpjs_company_jkm}
                      step={0.001}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("bpjs_company_jkm", v)}
                    />
                  </FieldRow>
                  <FieldRow label="JKK">
                    <NumIn
                      value={row.bpjs_company_jkk}
                      step={0.001}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("bpjs_company_jkk", v)}
                    />
                  </FieldRow>
                  <FieldRow label="JP">
                    <NumIn
                      value={row.bpjs_company_jp}
                      step={0.001}
                      min={0}
                      disabled={!editing}
                      onChange={(v) => updateField("bpjs_company_jp", v)}
                    />
                  </FieldRow>
                </FieldRows>
                <p className="mt-3 text-xs text-[var(--ikkimo-text-muted,#888)]">
                  Enter as decimals — 3.7% = 0.037
                </p>
              </Card>
            </div>
          )}

          {/* ── POSITIONS ── */}
          {tab === "positions" && (
            <Card>
              {positionsError && (
                <p className="mb-3 text-xs text-red-600">{positionsError}</p>
              )}

              {/* toolbar */}
              <div className="mb-4 flex gap-2">
                <div className="relative flex-1">
                  <svg
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ikkimo-text-muted,#bbb)]"
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    value={positionSearch}
                    onChange={(e) => setPositionSearch(e.target.value)}
                    placeholder="Search…"
                    className="h-9 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white pl-8 pr-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                  />
                </div>
                <input
                  value={newPositionName}
                  onChange={(e) => setNewPositionName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addPosition();
                  }}
                  placeholder="New position name"
                  className="h-9 flex-1 rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                />
                <Btn primary onClick={addPosition}>
                  Add
                </Btn>
              </div>

              {positionsLoading ? (
                <p className="text-sm text-[var(--ikkimo-text-muted,#888)]">
                  Loading…
                </p>
              ) : filteredPositions.length === 0 ? (
                <p className="text-sm text-[var(--ikkimo-text-muted,#888)]">
                  {positionSearch ? "No matches." : "No positions yet."}
                </p>
              ) : (
                <div className="divide-y divide-[var(--ikkimo-border)] rounded-xl border border-[var(--ikkimo-border)]">
                  {filteredPositions.map((p) => {
                    const grades = skillsByPosition.get(p.id) ?? [];
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-4 px-4 py-3"
                      >
                        {/* left: name + skill summary */}
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">{p.name}</div>
                          {Number(p.allowance_idr ?? 0) !== 0 ? (
                            <div className="text-xs text-[var(--ikkimo-text-muted)]">
                              Allowance:{" "}
                              {formatIDR(Number(p.allowance_idr ?? 0))}
                            </div>
                          ) : null}
                        </div>
                        {/* right: single edit button */}
                        <button
                          onClick={() => openPositionModal(p)}
                          className="flex-shrink-0 rounded-lg border border-[var(--ikkimo-border)] px-3 py-1.5 text-xs font-medium text-[var(--ikkimo-text-muted,#555)] transition-colors hover:border-[var(--ikkimo-brand)] hover:text-[var(--ikkimo-brand)]"
                        >
                          Edit
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── Position modal ── */}
      {positionModalOpen && positionModalTarget && (
        <Modal onClose={closePositionModal}>
          <div className="mb-5 flex items-start justify-between">
            <div>
              <div className="text-base font-semibold">Edit position</div>
              <div className="mt-0.5 text-sm text-[var(--ikkimo-text-muted,#666)]">
                {positionModalTarget.name}
              </div>
            </div>
            <CloseBtn onClick={closePositionModal} />
          </div>

          {positionsError && (
            <p className="mb-3 text-xs text-red-600">{positionsError}</p>
          )}

          <label className="mb-1 block text-xs font-medium text-[var(--ikkimo-text-muted,#555)]">
            Position name
          </label>
          <input
            value={positionModalName}
            onChange={(e) => setPositionModalName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") requestPositionSave();
            }}
            autoFocus
            className="h-9 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
          />
          <div className="space-y-1">
            <label className="text-xs font-medium text-[var(--ikkimo-text-muted)]">
              Position allowance
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={positionModalAllowance}
              onChange={(e) => setPositionModalAllowance(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
            />
            {Number(positionModalAllowance || 0) > 0 ? (
              <div className="text-xs text-[var(--ikkimo-text-muted)]">
                Allowance: {formatIDR(Number(positionModalAllowance || 0))}
              </div>
            ) : null}
          </div>

          <div className="mt-4 mb-1 text-xs font-medium text-[var(--ikkimo-text-muted,#555)]">
            Skill grades
          </div>
          {(() => {
            const grades = skillsByPosition.get(positionModalTarget.id) ?? [];
            return grades.length === 0 ? (
              <p className="text-xs text-[var(--ikkimo-text-muted,#aaa)]">
                No skill grades yet.
              </p>
            ) : (
              <div className="rounded-xl border border-[var(--ikkimo-border)] divide-y divide-[var(--ikkimo-border)]">
                {grades.map((g) => (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-4 px-3 py-2"
                  >
                    {editingSkillId === g.id ? (
                      <>
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="number"
                            value={skillEditLevel}
                            onChange={(e) =>
                              setSkillEditLevel(toNumber(e.target.value, 1))
                            }
                            min={1}
                            className="h-8 w-16 rounded-lg border border-[var(--ikkimo-brand)] px-2 text-sm outline-none tabular-nums"
                          />
                          <input
                            type="number"
                            value={skillEditIncrease}
                            onChange={(e) =>
                              setSkillEditIncrease(toNumber(e.target.value, 0))
                            }
                            min={0}
                            className="h-8 flex-1 rounded-lg border border-[var(--ikkimo-brand)] px-2 text-sm outline-none tabular-nums"
                            placeholder="IDR / month"
                          />
                        </div>
                        <div className="flex gap-1.5">
                          <Btn small primary onClick={saveEditSkill}>
                            Save
                          </Btn>
                          <Btn small onClick={cancelEditSkill}>
                            Cancel
                          </Btn>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <span className="text-sm tabular-nums">
                            Level {g.level}
                          </span>
                          {g.level === 1 && (
                            <span className="ml-1.5 text-xs text-[var(--ikkimo-text-muted,#aaa)]">
                              base
                            </span>
                          )}
                          <div className="text-xs text-[var(--ikkimo-text-muted,#888)]">
                            {formatIDR(g.increase_monthly_idr)} / month
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <Btn small onClick={() => startEditSkill(g)}>
                            Edit
                          </Btn>
                          <Btn small danger onClick={() => deleteSkill(g.id)}>
                            Delete
                          </Btn>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Add skill grade */}
          <div className="mt-3 flex gap-2">
            <input
              type="number"
              value={newSkillLevel}
              onChange={(e) => setNewSkillLevel(e.target.value)}
              min={1}
              placeholder="Level"
              className="h-9 w-20 rounded-xl border border-[var(--ikkimo-border)] px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
            />
            <input
              type="number"
              value={newSkillIncrease}
              onChange={(e) => setNewSkillIncrease(e.target.value)}
              min={0}
              placeholder="IDR / month"
              className="h-9 flex-1 rounded-xl border border-[var(--ikkimo-border)] px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
            />
            <Btn primary onClick={() => addSkillGrade(positionModalTarget.id)}>
              Add grade
            </Btn>
          </div>

          {skillGradesError && (
            <p className="mt-2 text-xs text-red-600">{skillGradesError}</p>
          )}

          <div className="mt-6 flex items-center justify-between border-t border-[var(--ikkimo-border)] pt-4">
            <Btn danger onClick={requestPositionDelete}>
              Delete position
            </Btn>
            <Btn primary onClick={requestPositionSave}>
              Save
            </Btn>
          </div>
        </Modal>
      )}

      {/* ── Confirm save modal ── */}
      {confirmOpen && (
        <Modal
          onClose={() => {
            setConfirmOpen(false);
            setConfirmPassword("");
            setPasswordVerified(false);
            setConfirmError(null);
            setConfirmAction(null);
          }}
        >
          <div className="mb-4 flex items-start justify-between">
            <div className="text-base font-semibold">Confirm changes</div>
            <CloseBtn
              onClick={() => {
                setConfirmOpen(false);
                setConfirmPassword("");
                setPasswordVerified(false);
                setConfirmError(null);
                setConfirmAction(null);
              }}
            />
          </div>
          <p className="mb-4 text-sm text-[var(--ikkimo-text-muted,#666)]">
            These settings affect payroll calculations. Confirm with your
            password to continue.
          </p>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setPasswordVerified(false);
              setConfirmError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                verifyPassword().then((ok) => {
                  if (ok) {
                    setConfirmOpen(false);
                    commitSave();
                  }
                });
              }
            }}
            placeholder="Password"
            autoComplete="current-password"
            className="h-9 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
          />
          {passwordVerified && (
            <p className="mt-1 text-xs text-green-600">Password verified.</p>
          )}
          {confirmError && (
            <p className="mt-1 text-xs text-red-600">{confirmError}</p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Btn
              onClick={() => {
                setConfirmOpen(false);
                setConfirmPassword("");
                setPasswordVerified(false);
                setConfirmError(null);
                setConfirmAction(null);
              }}
            >
              Cancel
            </Btn>
            <Btn
              primary
              onClick={async () => {
                const ok = await verifyPassword();
                if (!ok) return;
                setConfirmOpen(false);
                await commitSave();
              }}
            >
              {confirmAction === "position-delete"
                ? "Confirm delete"
                : "Confirm"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Layout primitives ────────────────────────────────────────────────────────

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--ikkimo-border)] bg-white p-5">
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--ikkimo-text-muted,#999)]">
      {children}
    </div>
  );
}

function FieldRows({ children }: { children: React.ReactNode }) {
  return (
    <div className="divide-y divide-[var(--ikkimo-border)]">{children}</div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-sm text-[var(--ikkimo-text,#111)]">{label}</span>
      {children}
    </div>
  );
}

// ── Inputs ───────────────────────────────────────────────────────────────────

function NumIn({
  value,
  step,
  min,
  max,
  disabled,
  onChange,
}: {
  value: number;
  step: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={String(value)}
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      onChange={(e) => onChange(toNumber(e.target.value, value))}
      className="h-8 w-32 rounded-lg border border-[var(--ikkimo-border)] bg-white px-2.5 text-right text-sm tabular-nums outline-none focus:border-[var(--ikkimo-brand)] disabled:bg-[var(--ikkimo-surface,#f7f7f7)] disabled:text-[var(--ikkimo-text-muted,#aaa)] disabled:cursor-default"
    />
  );
}

function DateIn({
  value,
  disabled,
  onChange,
}: {
  value: string | null;
  disabled: boolean;
  onChange: (v: string | null) => void;
}) {
  const isExpired = value && isPastYMD(value);
  return (
    <div className="flex items-center gap-2">
      {isExpired && <span className="text-xs text-amber-500">Expired</span>}
      <input
        type="date"
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value || null)}
        className="h-8 w-32 rounded-lg border border-[var(--ikkimo-border)] bg-white px-2.5 text-sm outline-none focus:border-[var(--ikkimo-brand)] disabled:bg-[var(--ikkimo-surface,#f7f7f7)] disabled:text-[var(--ikkimo-text-muted,#aaa)] disabled:cursor-default"
      />
    </div>
  );
}

// ── Buttons ──────────────────────────────────────────────────────────────────

function Btn({
  children,
  onClick,
  primary,
  danger,
  disabled,
  small,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  const h = small ? "h-7 px-3 text-xs" : "h-9 px-4 text-sm";
  const style = primary
    ? "bg-[var(--ikkimo-brand)] text-white hover:opacity-90"
    : danger
      ? "border border-red-200 text-red-600 hover:bg-red-50"
      : "border border-[var(--ikkimo-border)] text-[var(--ikkimo-text,#111)] hover:border-[var(--ikkimo-brand)]";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${h} ${style}`}
    >
      {children}
    </button>
  );
}

// ── Modal shell ──────────────────────────────────────────────────────────────

function Modal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
    >
      <button
        className="absolute inset-0 bg-black/30"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6 shadow-xl">
        {children}
      </div>
    </div>
  );
}

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-4 flex-shrink-0 rounded-lg p-1 text-[var(--ikkimo-text-muted,#aaa)] hover:text-[var(--ikkimo-text,#111)]"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
