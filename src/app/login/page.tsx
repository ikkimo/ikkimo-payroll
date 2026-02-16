"use client";

import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) return setMsg(error.message);

    router.push("/app");
  }

  return (
    <main className="min-h-screen grid place-items-center bg-ikkimo-bg px-6 text-ikkimo-text">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-ikkimo-border bg-white p-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-ikkimo-brand" />
          <h1 className="text-lg font-semibold">iKKim’O Payroll</h1>
        </div>

        <p className="mt-2 text-sm text-ikkimo-text/75">
          Sign in to access the internal payroll calculator.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <label className="text-xs font-medium">Email</label>
            <input
              className="mt-1 w-full rounded-xl border border-ikkimo-border px-3 py-2 text-sm outline-none focus:border-ikkimo-brand"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium">Password</label>
            <input
              className="mt-1 w-full rounded-xl border border-ikkimo-border px-3 py-2 text-sm outline-none focus:border-ikkimo-brand"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {msg ? (
            <div className="rounded-xl border border-ikkimo-brand/30 bg-ikkimo-brand/10 px-3 py-2 text-sm">
              {msg}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-ikkimo-brand py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? "…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}