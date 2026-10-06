"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { ReplaceKind } from "@/lib/raffle";
import { replaceDrawWinner, unlockDrawList } from "./actions";
import type { DrawWinnerRow } from "./raffle-console";

type Result = { ok: true } | { ok: false; error: string };

// Shared centred confirmation pop-up (native <dialog>: Esc, focus and backdrop built in).
function ConfirmDialog({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
  pending,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => ref.current?.showModal(), []);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      className="m-auto w-[calc(100%-32px)] max-w-[460px] rounded-[16px] border border-line bg-white p-0 text-ink backdrop:bg-black/40"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirm();
        }}
        className="flex flex-col gap-[16px] p-6 md:p-[28px]"
      >
        <h2 className="font-heading text-[24px] leading-[normal]">{title}</h2>
        {children}
        <div className="flex gap-[12px]">
          <button
            type="submit"
            disabled={pending}
            className="bg-accent-gradient flex h-[44px] flex-1 items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : confirmLabel}
          </button>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex h-[44px] items-center justify-center rounded-[8px] border border-line bg-white px-[20px] text-[14px]"
          >
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

export function UnlockDialog({
  drawId,
  drawName,
  onCancel,
  onDone,
}: {
  drawId: string;
  drawName: string;
  onCancel: () => void;
  onDone: (result: Result) => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <ConfirmDialog
      title="Unlock the list?"
      confirmLabel="Unlock"
      pending={pending}
      onCancel={onCancel}
      onConfirm={() =>
        startTransition(async () => {
          const r = await unlockDrawList(drawId);
          onDone(r.ok ? { ok: true } : r);
        })
      }
    >
      <p className="text-[14px] font-light leading-[1.5] text-muted">
        The locked pool for <span className="font-semibold text-ink">{drawName}</span> will be discarded. When you lock again, the
        pool is rebuilt from the current attendee list. This is recorded with your name and the time.
      </p>
    </ConfirmDialog>
  );
}

const KINDS: { value: ReplaceKind; label: string; help: string }[] = [
  { value: "absent", label: "Absent", help: "Not in the room. Left out of every later draw too." },
  { value: "ineligible", label: "Not eligible", help: "Only this win is cancelled. They stay in later draws." },
  { value: "other", label: "Other", help: "Only this win is cancelled. Add a note." },
];

export function RedrawDialog({
  winner,
  drawName,
  onCancel,
  onDone,
}: {
  winner: DrawWinnerRow;
  drawName: string;
  onCancel: () => void;
  onDone: (result: Result) => void;
}) {
  const [kind, setKind] = useState<ReplaceKind>("absent");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <ConfirmDialog
      title={`Replace winner #${winner.position}?`}
      confirmLabel="Replace winner"
      pending={pending}
      onCancel={onCancel}
      onConfirm={() => {
        if (kind === "other" && !note.trim()) {
          setError("Add a short note explaining the reason.");
          return;
        }
        startTransition(async () => {
          const r = await replaceDrawWinner(winner.id, kind, note);
          onDone(r.ok ? { ok: true } : r);
        });
      }}
    >
      <p className="text-[14px] font-light leading-[1.5] text-muted">
        <span className="font-semibold text-ink">
          {winner.attendee?.name} ({winner.attendee?.client_id})
        </span>{" "}
        stays on record as replaced. Their slot in {drawName} reopens, and the next draw fills it.
      </p>
      <fieldset className="flex flex-col gap-[8px]">
        <legend className="mb-[8px] text-[13px] font-semibold">Reason</legend>
        {KINDS.map((k) => (
          <label
            key={k.value}
            className={`flex cursor-pointer items-start gap-[10px] rounded-[8px] border p-[12px] ${
              kind === k.value ? "border-accent bg-accent/5" : "border-line"
            }`}
          >
            <input
              type="radio"
              name="kind"
              value={k.value}
              checked={kind === k.value}
              onChange={() => setKind(k.value)}
              className="mt-[3px] accent-[#d925c8]"
            />
            <span className="flex flex-col gap-[2px] leading-[normal]">
              <span className="text-[14px] font-semibold">{k.label}</span>
              <span className="text-[12px] font-light text-muted">{k.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-[8px]">
        <span className="text-[13px] font-semibold">Note {kind === "other" ? "" : "(optional)"}</span>
        <input
          value={note}
          onChange={(e) => {
            setNote(e.target.value);
            setError(null);
          }}
          maxLength={300}
          placeholder="e.g. Called three times, not in the hall"
          className="h-[44px] rounded-[8px] border border-line px-[14px] text-[14px] font-light outline-none focus:border-accent"
        />
        {error && <span className="text-[12px] text-[#c81e1e]">{error}</span>}
      </label>
    </ConfirmDialog>
  );
}
