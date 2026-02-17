"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
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

    router.push("/home");
  }

  return (
    <main className="min-h-screen w-full bg-[var(--ikkimo-bg)] text-[var(--ikkimo-text)] overflow-hidden">
      <div className="min-h-screen w-full flex flex-col items-center justify-center px-6">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/ikkimo_logo.png"
            alt="iKKim’O logo"
            width={64}
            height={64}
            priority
          />
        </div>

        <form
          onSubmit={onSubmit}
          className="w-full max-w-md rounded-2xl border border-[var(--ikkimo-border)] bg-white p-6"
        >
          <h1 className="text-lg font-semibold">iKKim’O Payroll</h1>
          <p className="mt-2 text-sm opacity-75">
            Sign in to access the internal payroll calculator.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium">Email</label>
              <input
                className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
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
                className="mt-1 w-full rounded-xl border border-[var(--ikkimo-border)] px-3 py-2 text-sm outline-none focus:border-[var(--ikkimo-brand)]"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {msg ? (
              <div className="rounded-xl border border-[color:var(--ikkimo-brand)]/30 bg-[color:var(--ikkimo-brand)]/10 px-3 py-2 text-sm">
                {msg}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-4 w-full rounded-xl bg-[color:var(--ikkimo-brand)] py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}