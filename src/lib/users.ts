// User management rules (CLAUDE.md section 4: Super Admins create users,
// disable them and reset passwords).

import { randomInt } from "node:crypto";
import type { Role } from "./roles";

// Easy to read aloud and type: no look-alike characters (0/O, 1/l/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

// e.g. "Kp7mQ-x3RtA-9vZqe": 15 random characters from a 56-character alphabet.
export function generatePassword(random: (max: number) => number = randomInt): string {
  const group = () => Array.from({ length: 5 }, () => ALPHABET[random(ALPHABET.length)]).join("");
  return [group(), group(), group()].join("-");
}

// isOwner marks the one head account that no other Super Admin can touch.
export type ManagedUser = { id: string; role: Role; active: boolean; isOwner?: boolean };

export type UserChange = { kind: "disable" } | { kind: "enable" } | { kind: "role"; role: Role };

const OWNER_PROTECTED = "This is the Owner account. Only the Owner can change it.";

// Only the Owner can reset the Owner's password; otherwise another Super Admin could sign in as them.
export function checkPasswordReset(actorId: string, target: ManagedUser): string | null {
  return target.isOwner && target.id !== actorId ? OWNER_PROTECTED : null;
}

// Refuses changes that could lock everyone out. Returns an error message, or null if allowed.
export function checkUserChange(actorId: string, target: ManagedUser, change: UserChange, everyone: ManagedUser[]): string | null {
  const self = target.id === actorId;
  if (target.isOwner && !self) return OWNER_PROTECTED;
  if (change.kind === "enable") return null;
  if (change.kind === "role" && change.role === target.role) return null;
  if (change.kind === "role" && change.role === "super_admin") return null;

  // From here: disabling someone, or demoting a Super Admin.
  if (self) return change.kind === "disable" ? "You cannot disable your own account." : "You cannot remove your own Super Admin role.";
  if (target.role === "super_admin" && target.active) {
    const others = everyone.filter((u) => u.id !== target.id && u.role === "super_admin" && u.active);
    if (others.length === 0) return "This is the last active Super Admin. Make someone else a Super Admin first.";
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateNewUser(input: { name: string; email: string; role: string }):
  | { ok: true; value: { name: string; email: string; role: Role } }
  | { ok: false; error: string } {
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  if (!name) return { ok: false, error: "Enter the person's full name." };
  if (name.length > 100) return { ok: false, error: "Name is too long." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email, like name@tentrade.com." };
  if (input.role !== "registrar" && input.role !== "super_admin") return { ok: false, error: "Choose a role." };
  return { ok: true, value: { name, email, role: input.role } };
}
