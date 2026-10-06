"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AttendeeFields, hintClass, type AttendeeValues } from "@/components/attendee-fields";
import type { AttendeeRow } from "@/lib/attendees";
import type { FieldErrors } from "@/lib/attendee-validation";
import { formatLagosTime, formatPhone, shortName } from "@/lib/format";
import { checkClientId } from "../registration/actions";
import { getAttendeeHistory, updateAttendee, type AttendeeChange, type EditAttendeeState } from "./actions";

const FIELD_LABELS: Record<string, string> = {
  client_id: "Client ID",
  name: "Name",
  email: "Email",
  phone: "Phone",
  eligible: "Grand Draw",
  tickets: "Tickets",
  source: "Source",
};

function showValue(field: string, value: string | null) {
  if (value === null || value === "") return "—";
  if (field === "eligible") return value === "true" ? "Eligible" : "Not eligible";
  if (field === "phone") return formatPhone(value);
  return value;
}

type Props = {
  attendee: AttendeeRow;
  names: Record<string, string>;
  canSeeHistory: boolean;
  onClose: () => void;
};

// Centred pop-up for editing one attendee. No Figma frame: reuses the Registration fields.
export function EditAttendeeDialog({ attendee, names, canSeeHistory, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const clientIdRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<AttendeeValues>({
    clientId: attendee.client_id,
    name: attendee.name,
    email: attendee.email,
    phone: formatPhone(attendee.phone),
    eligible: attendee.eligible,
    tickets: attendee.tickets,
  });
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [history, setHistory] = useState<AttendeeChange[] | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    clientIdRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canSeeHistory) return;
    let cancelled = false;
    getAttendeeHistory(attendee.id).then((rows) => {
      if (!cancelled) setHistory(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [attendee.id, canSeeHistory]);

  const [state, formAction, pending] = useActionState(async (prev: EditAttendeeState, formData: FormData) => {
    const result = await updateAttendee(attendee.id, prev, formData);
    if (result.status === "saved") dialogRef.current?.close();
    return result;
  }, { status: "idle" } as EditAttendeeState);

  const errors: FieldErrors = state.status === "error" ? state.errors : {};

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="edit-attendee-title"
      className="m-auto max-h-[92vh] w-[calc(100%-32px)] max-w-[560px] overflow-y-auto rounded-[16px] border border-line bg-white p-0 text-ink backdrop:bg-black/40"
    >
      <form action={formAction} noValidate className="flex flex-col items-start gap-[20px] p-6 md:p-[32px]">
        <div className="flex w-full items-start justify-between gap-4">
          <div className="flex flex-col gap-[4px]">
            <h2 id="edit-attendee-title" className="font-heading text-[26px] leading-[normal]">
              Edit No. {attendee.seq}
            </h2>
            <p className={hintClass}>
              Registered by {shortName(names[attendee.registered_by] ?? "…")} at {formatLagosTime(attendee.created_at)}. The arrival
              number never changes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="flex size-[36px] shrink-0 items-center justify-center rounded-full text-[18px] text-muted outline-none hover:bg-surface hover:text-ink focus-visible:ring-2 focus-visible:ring-accent"
          >
            ✕
          </button>
        </div>

        {state.status === "error" && state.message && (
          <p role="alert" className="w-full rounded-[8px] bg-[#c81e1e]/10 px-[14px] py-[10px] text-[13px]">
            {state.message}
          </p>
        )}

        <AttendeeFields
          values={values}
          onChange={(next) => {
            if (next.clientId !== values.clientId) setDuplicate(null);
            setValues(next);
          }}
          errors={errors}
          clientIdWarning={duplicate}
          onClientIdBlur={async (clientId) => setDuplicate(await checkClientId(clientId, attendee.id))}
          clientIdRef={clientIdRef}
        />

        <div className="flex w-full gap-[12px]">
          <button
            type="submit"
            disabled={pending || !!duplicate}
            className="bg-accent-gradient flex h-[48px] min-w-px flex-1 items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex h-[48px] items-center justify-center rounded-[8px] border border-line bg-white px-[24px] text-[14px]"
          >
            Cancel
          </button>
        </div>

        {canSeeHistory && (
          <section className="flex w-full flex-col gap-[10px] border-t border-line pt-[20px]">
            <h3 className="text-[14px] font-semibold leading-[normal]">Change history</h3>
            {history === null ? (
              <p className={hintClass}>Loading…</p>
            ) : history.length === 0 ? (
              <p className={hintClass}>No changes since this entry was added.</p>
            ) : (
              <ul className="flex flex-col gap-[8px]">
                {history.map((h) => (
                  <li key={h.id} className="text-[13px] leading-[normal]">
                    <span className="font-semibold">{FIELD_LABELS[h.field] ?? h.field}:</span>{" "}
                    <span className="font-light text-muted line-through">{showValue(h.field, h.old_value)}</span> →{" "}
                    <span>{showValue(h.field, h.new_value)}</span>
                    <span className="font-light text-muted">
                      {" "}
                      · by {shortName(names[h.changed_by ?? ""] ?? "…")} · {formatLagosTime(h.changed_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </form>
    </dialog>
  );
}
