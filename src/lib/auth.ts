import { supabase } from "@/lib/supabaseClient";

/**
 * Re-confirms the currently signed-in user's identity by re-authenticating
 * with the password they just typed. Used to gate destructive or
 * payroll-affecting actions behind a fresh password check.
 *
 * Always reads the *current* session's email via getUser() rather than
 * trusting a value passed in, so callers can't accidentally check against
 * a stale or wrong email.
 */
export async function verifyCurrentUserPassword(
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!password) {
    return { ok: false, error: "Enter your password to continue." };
  }

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  const email = userData?.user?.email;

  if (userErr || !email) {
    return { ok: false, error: "Could not verify current session." };
  }

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr) {
    return { ok: false, error: "Password is incorrect." };
  }

  return { ok: true };
}