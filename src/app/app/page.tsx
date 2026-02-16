"use client";

import { JSX, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AppPage(): JSX.Element {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/login");
      setEmail(data.session.user.email ?? "");
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Payroll (MVP)</h1>
      <p className="mt-2 text-sm text-ikkimo-text/75">Signed in as: {email}</p>
      <button
        onClick={signOut}
        className="mt-6 rounded-xl border border-ikkimo-border bg-white px-4 py-2 text-sm hover:border-ikkimo-brand"
      >
        Sign out
      </button>
    </main>
  );
}