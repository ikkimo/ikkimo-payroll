"use client";

import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <button
      onClick={logout}
      className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
    >
      Logout
    </button>
  );
}