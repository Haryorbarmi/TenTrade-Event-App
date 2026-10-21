"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ROSTER_CONFIRM_PHRASE } from "@/lib/roster-import";
import { clearRoster } from "./actions";

export function ClearRoster({ total }: { total: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const armed = typed.trim() === ROSTER_CONFIRM_PHRASE;

  function close() {
    setOpen(false);
    setTyped("");
    setError(null);
  }

  function clear() {
    startTransition(async () => {
      const r = await clearRoster(typed);
      if (r.ok) close();
      else setError(r.error);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[44px] shrink-0 items-center justify-center rounded-[8px] border border-[#c81e1e] bg-white px-[20px] text-[14px] text-[#c81e1e] hover:bg-[#c81e1e]/10"
      >
        Delete roster
      </button>
    );
  }

  return (
    <form
      className="flex w-full max-w-[360px] flex-col gap-[10px] rounded-[12px] border border-line bg-white p-[16px]"
      onSubmit={(e) => {
        e.preventDefault();
        if (armed) clear();
      }}
    >
      <p className="text-[13px] font-light leading-[1.5] text-muted">
        Deletes all {total} clients from the roster so you can start again.{" "}
        <span className="font-semibold text-ink">This cannot be undone.</span> Attendees already registered are not affected.
      </p>
      <label className="flex flex-col gap-[8px]">
        <span className="text-[13px] font-semibold text-ink">
          Type <span className="font-mono">{ROSTER_CONFIRM_PHRASE}</span> to confirm
        </span>
        <input
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setError(null);
          }}
          autoComplete="off"
          spellCheck={false}
          className="h-[44px] rounded-[8px] border border-line px-[14px] text-[14px] text-ink outline-none focus:border-[#c81e1e]"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-[8px] bg-[#c81e1e]/10 px-[14px] py-[10px] text-[13px] text-ink">
          {error}
        </p>
      )}
      <div className="flex gap-[10px]">
        <button type="button" onClick={close} className="h-[44px] flex-1 rounded-[8px] border border-line text-[14px] text-ink hover:border-ink">
          Cancel
        </button>
        <button
          type="submit"
          disabled={!armed || pending}
          className="h-[44px] flex-1 rounded-[8px] bg-[#c81e1e] text-[14px] font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete roster"}
        </button>
      </div>
    </form>
  );
}
