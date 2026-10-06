"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null; email: string };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password.", email };

  // Fails for disabled accounts, so they are signed straight back out.
  const { error: logError } = await supabase.rpc("log_session_event", { p_action: "sign_in" });
  if (logError) {
    await supabase.auth.signOut();
    return { error: "This account is disabled. Ask a Super Admin.", email };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.rpc("log_session_event", { p_action: "sign_out" });
  await supabase.auth.signOut();
  redirect("/login");
}
