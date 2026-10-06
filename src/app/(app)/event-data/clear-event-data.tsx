"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CONFIRM_PHRASE, type EventDataCounts } from "@/lib/event-data";
import { clearAllEventData } from "./actions";

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function ClearEventData({ counts }: { counts: EventDataCounts }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const empty = counts.attendees + counts.winners + counts.participants + counts.changes === 0;
  const armed = typed.trim() === CONFIRM_PHRASE;

  function clear() {
    startTransition(async () => {
      const r = await clearAllEventData(typed);
      if (r.ok) {
        setTyped("");
        setMessage({
          ok: true,
          text: `Done. Deleted ${plural(r.value.attendees, "attendee")} and ${plural(r.value.winners, "winner record")}. All draws are open. The next attendee will be No. 1.`,
        });
      } else {
        setMessage({ ok: false, text: r.error });
      }
      router.refresh();
    });
  }

  return (
    <section className="flex w-full max-w-[640px] flex-col gap-[20px] rounded-[12px] border border-line bg-white p-6 md:p-[32px]">
      <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Delete all event data</h2>

      <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-4">
        {[
          ["Attendees", counts.attendees],
          ["Winner records", counts.winners],
          ["Engagement tags", counts.participants],
          ["Edit history", counts.changes],
        ].map(([label, n]) => (
          <div key={label} className="flex flex-col gap-[4px] rounded-[8px] bg-surface p-[12px] leading-[normal]">
            <span className="font-heading text-[28px] text-ink">{n}</span>
            <span className="text-[12px] font-light text-muted">{label}</span>
          </div>
        ))}
      </div>

      <ul className="flex list-disc flex-col gap-[6px] pl-[18px] text-[14px] font-light leading-[1.5] text-muted">
        <li>
          Deletes every attendee (name, email, phone, Client ID), all winners, Event Engagement tags and the edit history. All five
          draws go back to open. <span className="font-semibold text-ink">This cannot be undone.</span>
        </li>
        <li>Keeps user accounts, the expected number, and the staff activity log (no names or contact details).</li>
        <li>
          <span className="font-semibold text-ink">Before the event:</span> use it to remove practice entries, so the day starts at
          arrival No. 1.
        </li>
        <li>
          <span className="font-semibold text-ink">After the event:</span>{" "}
          <Link href="/attendees" className="text-accent underline-offset-4 hover:underline">
            Export to Excel
          </Link>{" "}
          first if you need a record, then delete (Nigeria Data Protection Act).
        </li>
      </ul>

      {message && (
        <p role={message.ok ? "status" : "alert"} className={`rounded-[8px] px-[14px] py-[10px] text-[13px] ${message.ok ? "bg-[rgba(33,158,97,0.12)] text-ink" : "bg-[#c81e1e]/10 text-ink"}`}>
          {message.text}
        </p>
      )}

      {empty ? (
        <p className="text-[14px] font-light text-muted">There is no event data to delete.</p>
      ) : (
        <form
          className="flex flex-col gap-[10px]"
          onSubmit={(e) => {
            e.preventDefault();
            if (armed) clear();
          }}
        >
          <label className="flex flex-col gap-[8px]">
            <span className="text-[13px] font-semibold text-ink">
              Type <span className="font-mono">{CONFIRM_PHRASE}</span> to confirm
            </span>
            <input
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                setMessage(null);
              }}
              autoComplete="off"
              spellCheck={false}
              className="h-[44px] rounded-[8px] border border-line px-[14px] text-[14px] text-ink outline-none focus:border-[#c81e1e]"
            />
          </label>
          <button
            type="submit"
            disabled={!armed || pending}
            className="flex h-[48px] items-center justify-center rounded-[8px] bg-[#c81e1e] text-[14px] font-semibold text-white disabled:opacity-40"
          >
            {pending ? "Deleting…" : `Delete all event data (${plural(counts.attendees, "attendee")})`}
          </button>
        </form>
      )}
    </section>
  );
}
