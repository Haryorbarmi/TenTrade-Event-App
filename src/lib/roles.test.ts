import { describe, expect, it } from "vitest";
import {
  canAccessRaffle,
  canEditAttendee,
  canExportAttendees,
  canManageUsers,
  canUseApp,
  type Profile,
} from "./roles";

const admin: Profile = { id: "a", name: "Admin", role: "super_admin", active: true };
const registrar: Profile = { id: "r", name: "Desk 1", role: "registrar", active: true };
const disabledAdmin: Profile = { ...admin, active: false };
const disabledRegistrar: Profile = { ...registrar, active: false };

describe("role rules", () => {
  it("only active Super Admins reach the Raffle, export and user management", () => {
    for (const check of [canAccessRaffle, canExportAttendees, canManageUsers]) {
      expect(check(admin)).toBe(true);
      expect(check(registrar)).toBe(false);
      expect(check(disabledAdmin)).toBe(false);
      expect(check(null)).toBe(false);
    }
  });

  it("disabled or signed-out users cannot use the app", () => {
    expect(canUseApp(admin)).toBe(true);
    expect(canUseApp(registrar)).toBe(true);
    expect(canUseApp(disabledRegistrar)).toBe(false);
    expect(canUseApp(null)).toBe(false);
  });

  it("only active Super Admins can edit attendee entries", () => {
    expect(canEditAttendee(admin)).toBe(true);
    expect(canEditAttendee(registrar)).toBe(false);
    expect(canEditAttendee(disabledAdmin)).toBe(false);
    expect(canEditAttendee(disabledRegistrar)).toBe(false);
    expect(canEditAttendee(null)).toBe(false);
  });
});
