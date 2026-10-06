import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canUseApp, isSuperAdmin, type Profile } from "@/lib/roles";

// The signed-in user's profile, or null. getClaims verifies the login token's
// signature and expiry locally (the project uses asymmetric ES256 keys), so no
// round trip to Supabase Auth on every click. The profile is still read fresh
// every time, so a disabled user (active = false) is blocked straight away,
// and RLS checks the same thing in the database.
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, name, role, active")
    .eq("id", userId)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export async function requireUser(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!canUseApp(profile)) redirect(profile ? "/login?disabled=1" : "/login");
  return profile!;
}

// For server actions and route handlers that must never run for a registrar.
// Throws instead of redirecting so a direct API call gets an error.
export async function requireSuperAdmin(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile)) throw new Error("Not allowed: Super Admin only.");
  return profile!;
}
