"use client";

import { useActionState, useRef, useState } from "react";
import { AttendeeFields, EMPTY_VALUES, type AttendeeValues } from "@/components/attendee-fields";
import type { FieldErrors } from "@/lib/attendee-validation";
import { addAttendee, checkClientId, type AddAttendeeState } from "./actions";

// Figma: Registration > Attendee form (3949:199)
export function AttendeeForm() {
  const [values, setValues] = useState<AttendeeValues>(EMPTY_VALUES);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const clientIdRef = useRef<HTMLInputElement>(null);

  function reset() {
    setValues(EMPTY_VALUES);
    setDuplicate(null);
  }

  const [state, formAction, pending] = useActionState(async (prev: AddAttendeeState, formData: FormData) => {
    const result = await addAttendee(prev, formData);
    if (result.status === "added") {
      reset();
      clientIdRef.current?.focus();
    }
    return result;
  }, { status: "idle" } as AddAttendeeState);

  const errors: FieldErrors = state.status === "error" ? state.errors : {};

  return (
    <form
      action={formAction}
      noValidate
      className="flex w-full flex-col items-start gap-[20px] rounded-[12px] border border-line bg-white p-6 md:p-[32px] lg:w-[520px] lg:shrink-0"
    >
      <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Attendee details</h2>

      <div aria-live="polite" className="w-full empty:hidden">
        {state.status === "added" && (
          <p className="w-full rounded-[8px] bg-accent/10 px-[14px] py-[10px] text-[13px] text-ink">
            Added <span className="font-semibold">No. {state.seq}</span> · {state.name} ({state.clientId})
          </p>
        )}
        {state.status === "error" && state.message && (
          <p role="alert" className="w-full rounded-[8px] bg-[#c81e1e]/10 px-[14px] py-[10px] text-[13px] text-ink">
            {state.message}
          </p>
        )}
      </div>

      <AttendeeFields
        values={values}
        onChange={(next) => {
          if (next.clientId !== values.clientId) setDuplicate(null);
          setValues(next);
        }}
        errors={errors}
        clientIdWarning={duplicate}
        onClientIdBlur={async (clientId) => setDuplicate(await checkClientId(clientId))}
        clientIdRef={clientIdRef}
        autoFocus
      />

      <div className="flex w-full gap-[12px]">
        <button
          type="submit"
          disabled={pending || !!duplicate}
          className="bg-accent-gradient flex h-[48px] min-w-px flex-1 items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add attendee"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex h-[48px] items-center justify-center rounded-[8px] border border-line bg-white px-[24px] text-[14px] text-ink"
        >
          Clear
        </button>
      </div>

      <p className="w-full rounded-[8px] bg-surface px-[14px] py-[12px] text-[12px] font-light leading-[normal] text-muted">
        Privacy: we keep only the Client ID and name, for this event&apos;s giveaways. Let the client know before you add them.
      </p>
    </form>
  );
}
