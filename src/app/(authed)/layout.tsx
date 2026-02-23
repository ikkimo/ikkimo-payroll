import type { ReactNode } from "react";

import Image from "next/image";
import Link from "next/link";
import LogoutButton from "@/components/auth/LogoutButton";

export default function AuthedLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--ikkimo-bg)] text-[var(--ikkimo-text)]">
      <header className="border-b border-[var(--ikkimo-border)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/home" className="flex items-center gap-3">
            <Image src="/ikkimo_logo.png" alt="iKKim’O" width={36} height={36} priority />
            <div className="text-sm font-semibold">iKKim’O Payroll</div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/settings"
              className="rounded-xl border border-[var(--ikkimo-border)] bg-white px-4 py-2 text-sm hover:border-[var(--ikkimo-brand)]"
            >
              Settings
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}