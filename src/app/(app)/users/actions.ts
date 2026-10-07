"use server";

import { requireSuperAdmin } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import { createAdminClient, logActivity } from "@/lib/supabase/admin";
import { checkPasswordReset, checkUserChange, generatePassword, validateNewUser, type ManagedUser, type UserChange } from "@/lib/users";

type Result<T = null> = { ok: true; value: T } | { ok: false; error: string };

// Every action re-checks the role on the server. Passwords are returned once
// to the Super Admin's screen and never logged.

async function everyone(): Promise<ManagedUser[]> {
  const { data } = await createAdminClient().from("profiles").select("id, role, active, is_owner");
  return (data ?? []).map((p) => ({ id: p.id, role: p.role, active: p.active, isOwner: p.is_owner })) as ManagedUser[];
}

export async function createUser(input: { name: string; email: string; role: string }): Promise<Result<{ password: string }>> {
  const me = await requireSuperAdmin();
  const valid = validateNewUser(input);
  if (!valid.ok) return valid;
  const { name, email, role } = valid.value;

  const admin = createAdminClient();
  const password = generatePassword();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
    app_metadata: { role },
  });
  if (error || !data.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? "");
    return { ok: false, error: taken ? `${email} already has an account.` : "Could not create the account. Try again." };
  }
  // The profile is created by a database trigger as a registrar; set the real role.
  await admin.from("profiles").update({ role, name }).eq("id", data.user.id);

  await logActivity(me.id, "user_created", { user_id: data.user.id, role });
  return { ok: true, value: { password } };
}

export async function resetPassword(userId: string): Promise<Result<{ password: string }>> {
  const me = await requireSuperAdmin();
  const target = (await everyone()).find((u) => u.id === userId);
  if (!target) return { ok: false, error: "User not found." };
  const refused = checkPasswordReset(me.id, target);
  if (refused) return { ok: false, error: refused };

  const password = generatePassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { ok: false, error: "Could not reset the password. Try again." };
  await logActivity(me.id, "password_reset", { user_id: userId });
  return { ok: true, value: { password } };
}

export async function changeUser(userId: string, change: UserChange): Promise<Result> {
  const me = await requireSuperAdmin();
  const all = await everyone();
  const target = all.find((u) => u.id === userId);
  if (!target) return { ok: false, error: "User not found." };
  const refused = checkUserChange(me.id, target, change, all);
  if (refused) return { ok: false, error: refused };

  const admin = createAdminClient();
  if (change.kind === "role") {
    const role: Role = change.role;
    const { error } = await admin.from("profiles").update({ role }).eq("id", userId);
    if (error) return { ok: false, error: "Could not change the role. Try again." };
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role } });
    await logActivity(me.id, "user_role_changed", { user_id: userId, role });
  } else {
    const active = change.kind === "enable";
    const { error } = await admin.from("profiles").update({ active }).eq("id", userId);
    if (error) return { ok: false, error: "Could not update the account. Try again." };
    // RLS blocks a disabled user at once; the ban also stops new sign-ins and session refresh.
    await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
    await logActivity(me.id, active ? "user_enabled" : "user_disabled", { user_id: userId });
  }
  return { ok: true, value: null };
}
