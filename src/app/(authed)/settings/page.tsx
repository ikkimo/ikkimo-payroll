"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type PayrollSettingsRow = {
  id: string;
  standard_working_days: number;
  hours_per_day: number;

  bpjs_employee_jht: number;
  bpjs_employee_jp: number;

  bpjs_company_jht: number;
  bpjs_company_jkm: number;
  bpjs_company_jkk: number;
  bpjs_company_jp: number;

  overtime1_multiplier: number;
  overtime2_multiplier: number;
  overtime3_multiplier: number;

  thr: number;

  created_at?: string;
  updated_at?: string;
};

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

  const [email, setEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [row, setRow] = useState<PayrollSettingsRow | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError(null);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      if (!alive) return;
      setEmail(session.user.email ?? "");

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
        }

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
    value: PayrollSettingsRow[K]
  ) {
    setRow((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: value };
    });
    setDirty(true);
    setSavedMsg(null);
  }

  async function save() {
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
    setSaving(false);
    setSavedMsg("Saved.");
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
            <button
              onClick={save}
              disabled={loading || saving || !row || !dirty}
              className="rounded-xl bg-[var(--ikkimo-brand)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
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
              />
              <NumberField
                label="Hours per day"
                value={row.hours_per_day}
                step={1}
                min={1}
                max={24}
                onChange={(v) => updateField("hours_per_day", v)}
              />
            </Section>

            {/* Overtime + THR */}
            <Section title="Overtime + THR multipliers">
              <NumberField
                label="Overtime 1 multiplier"
                value={row.overtime1_multiplier}
                step={0.001}
                onChange={(v) => updateField("overtime1_multiplier", v)}
              />
              <NumberField
                label="Overtime 2 multiplier"
                value={row.overtime2_multiplier}
                step={0.001}
                onChange={(v) => updateField("overtime2_multiplier", v)}
              />
              <NumberField
                label="Overtime 3 multiplier"
                value={row.overtime3_multiplier}
                step={0.001}
                onChange={(v) => updateField("overtime3_multiplier", v)}
              />
              <NumberField
                label="THR multiplier"
                value={row.thr}
                step={0.001}
                onChange={(v) => updateField("thr", v)}
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
              />
              <NumberField
                label="JP (employee)"
                value={row.bpjs_employee_jp}
                step={0.000001}
                onChange={(v) => updateField("bpjs_employee_jp", v)}
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
              />
              <NumberField
                label="JKM (company)"
                value={row.bpjs_company_jkm}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jkm", v)}
              />
              <NumberField
                label="JKK (company)"
                value={row.bpjs_company_jkk}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jkk", v)}
              />
              <NumberField
                label="JP (company)"
                value={row.bpjs_company_jp}
                step={0.000001}
                onChange={(v) => updateField("bpjs_company_jp", v)}
              />
              <HelperText>Example: 3.7% = 0.037</HelperText>
            </Section>
          </div>
        )}
      </div>
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
  onChange: (v: number) => void;
}) {
  const { label, value, step, min, max, onChange } = props;

  return (
    <label className="block">
      <div className="text-xs font-semibold">{label}</div>
      <input
        className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
        type="number"
        value={Number.isFinite(value) ? String(value) : "0"}
        step={step}
        min={min}
        max={max}
        onChange={(e) => onChange(toNumber(e.target.value, value))}
      />
    </label>
  );
}

// function toNumber(value: string, fallback: number) {
//   const n = Number(value);
//   return Number.isFinite(n) ? n : fallback;
// }