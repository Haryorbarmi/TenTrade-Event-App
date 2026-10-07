"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { formatLagosTime } from "@/lib/format";
import { changeUser, createUser, resetPassword } from "./actions";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  isOwner: boolean;
  lastSignIn: string | null;
};

const lagosDate = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "short" });
const lastSeen = (iso: string | null) => (iso ? `${lagosDate.format(new Date(iso))}, ${formatLagosTime(iso)}` : "Never");
const input =
  "h-[44px] w-full rounded-[8px] border border-line bg-white px-[14px] text-[14px] font-light text-ink outline-none focus:border-accent";

type Secret = { name: string; email: string; password: string; created: boolean };

export function UsersManager({ users, myId }: { users: UserRow[]; myId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<Secret | null>(null);
  const activeAdmins = users.filter((u) => u.role === "super_admin" && u.active).length;

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await action();
      if (!r.ok) setError(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-[24px]">
      {secret && <PasswordPanel secret={secret} onDone={() => setSecret(null)} />}
      {error && (
        <p role="alert" className="w-full rounded-[8px] bg-[#c81e1e]/10 px-[14px] py-[10px] text-[13px] text-ink">
          {error}
        </p>
      )}
      {activeAdmins < 2 && (
        <p className="w-full rounded-[8px] bg-[rgba(246,101,132,0.12)] px-[14px] py-[10px] text-[13px] text-ink">
          Only one active Super Admin. Add a second as a backup in case someone cannot sign in on the day.
        </p>
      )}

      <div className="flex w-full flex-col items-start gap-[24px] xl:flex-row">
        <AddUser
          pending={pending}
          onCreated={(s) => {
            setSecret(s);
            router.refresh();
          }}
          onError={setError}
        />

        <section className="w-full min-w-px flex-1 overflow-hidden rounded-[12px] border border-line bg-white">
          <div className="flex items-center justify-between px-[24px] py-[20px]">
            <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Team ({users.length})</h2>
            {pending && (
              <span role="status" className="text-[13px] text-muted">
                Saving…
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-[14px] leading-[normal]">
              <thead className="bg-surface text-[12px] font-semibold text-muted">
                <tr className="h-[44px]">
                  <th className="pl-[24px]">Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last sign-in</th>
                  <th className="pr-[24px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const me = u.id === myId;
                  // Nobody but the Owner can change the Owner account (the server enforces this too).
                  const locked = u.isOwner && !me;
                  return (
                    <tr key={u.id} className={`border-t border-line ${u.active ? "text-ink" : "text-muted"}`}>
                      <td className="py-[12px] pl-[24px]">
                        <span className="block">
                          {u.name}
                          {me && <span className="ml-[6px] text-[12px] text-muted">(you)</span>}
                          {u.isOwner && (
                            <span className="ml-[8px] inline-flex rounded-full bg-accent/10 px-[8px] py-[2px] text-[11px] font-semibold text-accent">
                              Owner
                            </span>
                          )}
                        </span>
                        <span className="block text-[12px] font-light text-muted">{u.email}</span>
                      </td>
                      <td>
                        <select
                          value={u.role}
                          disabled={pending || me || locked}
                          title={me ? "You cannot change your own role" : locked ? "Only the Owner can change this account" : undefined}
                          onChange={(e) => run(() => changeUser(u.id, { kind: "role", role: e.target.value as Role }))}
                          aria-label={`Role for ${u.name}`}
                          className="h-[34px] rounded-[6px] border border-line bg-white px-[8px] text-[13px] text-ink disabled:opacity-60"
                        >
                          <option value="registrar">{ROLE_LABELS.registrar}</option>
                          <option value="super_admin">{ROLE_LABELS.super_admin}</option>
                        </select>
                      </td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-[10px] py-[4px] text-[12px] font-semibold ${
                            u.active ? "bg-[rgba(33,158,97,0.12)] text-[#219e61]" : "bg-[rgba(115,115,115,0.12)] text-muted"
                          }`}
                        >
                          {u.active ? "Active" : "Disabled"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap font-light">{lastSeen(u.lastSignIn)}</td>
                      <td className="whitespace-nowrap pr-[24px] text-right">
                        {locked && <span className="px-[8px] text-[13px] font-light text-muted">Protected</span>}
                        {!locked && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                setError(null);
                                const r = await resetPassword(u.id);
                                if (r.ok) setSecret({ name: u.name, email: u.email, password: r.value.password, created: false });
                                else setError(r.error);
                              })
                            }
                            className="rounded-[6px] px-[8px] py-[4px] text-[13px] text-accent hover:bg-accent/10 disabled:opacity-50"
                          >
                            Reset password
                          </button>
                        )}
                        {!me && !locked && (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => run(() => changeUser(u.id, { kind: u.active ? "disable" : "enable" }))}
                            className={`rounded-[6px] px-[8px] py-[4px] text-[13px] disabled:opacity-50 ${
                              u.active ? "text-[#c81e1e] hover:bg-[#c81e1e]/10" : "text-[#219e61] hover:bg-[rgba(33,158,97,0.12)]"
                            }`}
                          >
                            {u.active ? "Disable" : "Enable"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function AddUser({
  pending,
  onCreated,
  onError,
}: {
  pending: boolean;
  onCreated: (s: Secret) => void;
  onError: (e: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("registrar");
  const [saving, startSaving] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onError(null);
        startSaving(async () => {
          const r = await createUser({ name, email, role });
          if (r.ok) {
            onCreated({ name: name.trim(), email: email.trim().toLowerCase(), password: r.value.password, created: true });
            setName("");
            setEmail("");
            setRole("registrar");
          } else {
            onError(r.error);
          }
        });
      }}
      className="flex w-full flex-col gap-[16px] rounded-[12px] border border-line bg-white p-6 md:p-[32px] xl:w-[400px] xl:shrink-0"
    >
      <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Add a user</h2>
      <label className="flex flex-col gap-[8px]">
        <span className="text-[13px] font-semibold text-ink">Full name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={input} />
      </label>
      <label className="flex flex-col gap-[8px]">
        <span className="text-[13px] font-semibold text-ink">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="off"
          placeholder="name@tentrade.com"
          className={input}
        />
      </label>
      <fieldset className="flex flex-col gap-[8px]">
        <legend className="mb-[8px] text-[13px] font-semibold text-ink">Role</legend>
        <div className="flex gap-[4px] rounded-[10px] bg-surface p-[4px]">
          {(["registrar", "super_admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={role === r}
              onClick={() => setRole(r)}
              className={`flex h-[40px] flex-1 items-center justify-center rounded-[8px] text-[14px] ${
                role === r ? "bg-accent-gradient font-semibold text-white" : "text-ink hover:bg-white"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </fieldset>
      <button
        type="submit"
        disabled={saving || pending || !name.trim() || !email.trim()}
        className="bg-accent-gradient flex h-[48px] items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create account"}
      </button>
      <p className="text-[12px] font-light leading-[normal] text-muted">A password is generated and shown to you once.</p>
    </form>
  );
}

function PasswordPanel({ secret, onDone }: { secret: Secret; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <section
      role="status"
      className="flex w-full flex-col gap-[12px] rounded-[12px] border border-[#219e61]/40 bg-[rgba(33,158,97,0.08)] p-[20px]"
    >
      <p className="text-[14px] text-ink">
        {secret.created ? "Account created for" : "New password for"} <span className="font-semibold">{secret.name}</span> ({secret.email}).
        Give them this password privately. <span className="font-semibold">It will not be shown again.</span>
      </p>
      <div className="flex flex-wrap items-center gap-[12px]">
        <code className="rounded-[8px] border border-line bg-white px-[14px] py-[10px] font-mono text-[18px] tracking-[1px] text-ink">
          {secret.password}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(secret.password);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
          className="h-[40px] rounded-[8px] border border-line bg-white px-[16px] text-[14px] text-ink hover:border-ink"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button type="button" onClick={onDone} className="h-[40px] px-[12px] text-[14px] text-muted hover:text-ink">
          Done, hide it
        </button>
      </div>
    </section>
  );
}
