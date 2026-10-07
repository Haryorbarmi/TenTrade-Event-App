// Role rules from CLAUDE.md section 4. Pure functions so they can be tested and
// reused by both server checks and UI. The database enforces the same rules with RLS.

export type Role = "super_admin" | "registrar";

export type Profile = {
  id: string;
  name: string;
  role: Role;
  active: boolean;
};

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  registrar: "Registrar",
};

export function isSuperAdmin(profile: Profile | null): boolean {
  return !!profile && profile.active && profile.role === "super_admin";
}

export function canUseApp(profile: Profile | null): boolean {
  return !!profile && profile.active;
}

export function canAccessRaffle(profile: Profile | null): boolean {
  return isSuperAdmin(profile);
}

export function canExportAttendees(profile: Profile | null): boolean {
  return isSuperAdmin(profile);
}

export function canManageUsers(profile: Profile | null): boolean {
  return isSuperAdmin(profile);
}

// Only Super Admins edit attendee entries (registrars can add, not change).
export function canEditAttendee(profile: Profile | null): boolean {
  return isSuperAdmin(profile);
}
