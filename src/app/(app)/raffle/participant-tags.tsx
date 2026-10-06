"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addParticipant, removeParticipant } from "./actions";

export type Participant = { attendee_id: string; client_id: string; name: string };

const VISIBLE = 6;

// Figma: Raffle · Event Engagement > Mark participants (4007:1423)
export function ParticipantTags({ participants, editable }: { participants: Participant[]; editable: boolean }) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [message, setMessage] = useState<{ error: boolean; text: string } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [pending, startTransition] = useTransition();

  const shown = showAll ? participants : participants.slice(0, VISIBLE);
  const hidden = participants.length - shown.length;

  function add() {
    const id = clientId.trim();
    if (!id) return;
    startTransition(async () => {
      const r = await addParticipant(id);
      if (r.ok) {
        setClientId("");
        setMessage({ error: false, text: `Tagged ${r.value.name} (${id}).` });
      } else {
        setMessage({ error: true, text: r.error });
      }
      router.refresh();
    });
  }

  function remove(p: Participant) {
    startTransition(async () => {
      const r = await removeParticipant(p.attendee_id);
      setMessage(r.ok ? { error: false, text: `Removed ${p.name} (${p.client_id}).` } : { error: true, text: r.error });
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col items-start gap-[10px]">
      <p className="text-[13px] font-semibold leading-[normal] text-ink">Mark participants</p>
      {editable ? (
        <form
          className="flex w-full items-center gap-[8px]"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value);
              setMessage(null);
            }}
            placeholder="Client ID"
            aria-label="Client ID to tag as a participant"
            autoComplete="off"
            className="h-[44px] min-w-px flex-1 rounded-[8px] border border-line bg-white px-[14px] text-[14px] font-light text-ink outline-none placeholder:text-[rgba(115,115,115,0.9)] focus:border-accent"
          />
          <button
            type="submit"
            disabled={pending || !clientId.trim()}
            className="bg-accent-gradient flex h-[44px] w-[72px] shrink-0 items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            Add
          </button>
        </form>
      ) : (
        <p className="text-[12px] font-light leading-[normal] text-muted">The list is locked. Unlock it to add or remove participants.</p>
      )}

      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-[12px] leading-[normal] ${message.error ? "text-[#c81e1e]" : "text-muted"}`}>
          {message.text}
        </p>
      )}

      {participants.length > 0 && (
        <ul className="flex w-full flex-wrap gap-[8px]">
          {shown.map((p) => (
            <li
              key={p.attendee_id}
              title={p.name}
              className="flex items-center gap-[6px] rounded-full bg-surface px-[10px] py-[5px] text-[12px] leading-[normal]"
            >
              <span className="font-light text-ink">{p.client_id}</span>
              {editable && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(p)}
                  aria-label={`Remove ${p.name} (${p.client_id})`}
                  className="text-muted hover:text-ink disabled:opacity-50"
                >
                  ×
                </button>
              )}
            </li>
          ))}
          {hidden > 0 && (
            <li>
              <button
                type="button"
                onClick={() => setShowAll(true)}
                className="rounded-full bg-surface px-[10px] py-[5px] text-[12px] font-light leading-[normal] text-ink hover:bg-line"
              >
                +{hidden} more
              </button>
            </li>
          )}
          {showAll && participants.length > VISIBLE && (
            <li>
              <button
                type="button"
                onClick={() => setShowAll(false)}
                className="rounded-full px-[10px] py-[5px] text-[12px] font-light leading-[normal] text-muted hover:text-ink"
              >
                Show less
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
