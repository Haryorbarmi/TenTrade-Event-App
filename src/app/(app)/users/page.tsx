import { NotAllowed } from "@/components/not-allowed";
import { getCurrentProfile } from "@/lib/auth";
import { isSuperAdmin, type Role } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { UsersManager, type UserRow } from "./users-manager";

export const metadata = { title: "Users · TenTrade Lagos Seminar 2026" };

// Super Admin only. No Figma frame: built in the app's existing style.
export default async function UsersPage() {
  const me = await getCurrentProfile();
  if (!isSuperAdmin(me)) return <NotAllowed what="Users" />;

  const admin = createAdminClient();
  const [{ data: profiles }, { data: auth }] = await Promise.all([
    admin.from("profiles").select("id, name, role, active, is_owner, created_at").order("created_at"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);
  const authById = new Map((auth?.users ?? []).map((u) => [u.id, u]));

  const users: UserRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    role: p.role as Role,
    active: p.active,
    isOwner: p.is_owner,
    email: authById.get(p.id)?.email ?? "",
    lastSignIn: authById.get(p.id)?.last_sign_in_at ?? null,
  }));

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex flex-col gap-[8px]">
        <h1 className="font-heading text-[30px] leading-[normal] text-ink">Users</h1>
        <p className="text-[14px] font-light leading-[normal] text-muted">
          Accounts for the event team. There is no public sign-up: only Super Admins add people.
        </p>
      </header>
      <UsersManager users={users} myId={me!.id} />
    </div>
  );
}
