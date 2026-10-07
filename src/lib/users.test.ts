import { describe, expect, it } from "vitest";
import { checkPasswordReset, checkUserChange, generatePassword, validateNewUser, type ManagedUser } from "./users";

describe("generatePassword", () => {
  it("makes three groups of five readable characters", () => {
    for (let i = 0; i < 50; i++) expect(generatePassword()).toMatch(/^[A-HJ-NP-Za-km-z2-9]{5}-[A-HJ-NP-Za-km-z2-9]{5}-[A-HJ-NP-Za-km-z2-9]{5}$/);
  });
  it("is different every time", () => {
    expect(new Set(Array.from({ length: 100 }, () => generatePassword())).size).toBe(100);
  });
});

describe("checkUserChange", () => {
  const me: ManagedUser = { id: "me", role: "super_admin", active: true };
  const tolu: ManagedUser = { id: "tolu", role: "super_admin", active: true };
  const desk: ManagedUser = { id: "desk", role: "registrar", active: true };
  const everyone = [me, tolu, desk];

  it("blocks disabling or demoting yourself", () => {
    expect(checkUserChange("me", me, { kind: "disable" }, everyone)).toMatch(/your own account/);
    expect(checkUserChange("me", me, { kind: "role", role: "registrar" }, everyone)).toMatch(/your own Super Admin/);
  });

  it("allows disabling or demoting another Super Admin while one remains", () => {
    expect(checkUserChange("me", tolu, { kind: "disable" }, everyone)).toBeNull();
    expect(checkUserChange("me", tolu, { kind: "role", role: "registrar" }, everyone)).toBeNull();
  });

  it("never leaves the app without an active Super Admin", () => {
    const meDisabled = { ...me, active: false };
    // Acting as a (theoretically) different admin on the last active one.
    expect(checkUserChange("someone", tolu, { kind: "disable" }, [meDisabled, tolu, desk])).toMatch(/last active Super Admin/);
  });

  it("protects the Owner from every other Super Admin", () => {
    const owner: ManagedUser = { id: "owner", role: "super_admin", active: true, isOwner: true };
    const all = [owner, me, tolu, desk];
    expect(checkUserChange("me", owner, { kind: "disable" }, all)).toMatch(/Owner account/);
    expect(checkUserChange("me", owner, { kind: "role", role: "registrar" }, all)).toMatch(/Owner account/);
    expect(checkPasswordReset("me", owner)).toMatch(/Owner account/);
    // The Owner can still reset their own password, and others' passwords.
    expect(checkPasswordReset("owner", owner)).toBeNull();
    expect(checkPasswordReset("owner", tolu)).toBeNull();
    expect(checkUserChange("owner", tolu, { kind: "disable" }, all)).toBeNull();
    // The existing self-protection still applies to the Owner.
    expect(checkUserChange("owner", owner, { kind: "disable" }, all)).toMatch(/your own account/);
  });

  it("always allows enabling, promoting, and managing registrars", () => {
    expect(checkUserChange("me", { ...desk, active: false }, { kind: "enable" }, everyone)).toBeNull();
    expect(checkUserChange("me", desk, { kind: "role", role: "super_admin" }, everyone)).toBeNull();
    expect(checkUserChange("me", desk, { kind: "disable" }, everyone)).toBeNull();
  });
});

describe("validateNewUser", () => {
  it("cleans valid input", () => {
    expect(validateNewUser({ name: "  Ada   Obi ", email: " Ada@TenTrade.com ", role: "registrar" })).toEqual({
      ok: true,
      value: { name: "Ada Obi", email: "ada@tentrade.com", role: "registrar" },
    });
  });
  it("rejects missing name, bad email and unknown role", () => {
    expect(validateNewUser({ name: "", email: "a@b.co", role: "registrar" }).ok).toBe(false);
    expect(validateNewUser({ name: "Ada", email: "ada@", role: "registrar" }).ok).toBe(false);
    expect(validateNewUser({ name: "Ada", email: "a@b.co", role: "owner" }).ok).toBe(false);
  });
});
