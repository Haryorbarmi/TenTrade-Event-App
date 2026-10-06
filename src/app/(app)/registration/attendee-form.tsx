"use client";

import { useActionState, useRef, useState } from "react";
import type { FieldErrors } from "@/lib/attendee-validation";
import { addAttendee, checkClientId, type AddAttendeeState } from "./actions";

const TICKET_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const EMPTY = { clientId: "", name: "", email: "", phone: "" };

const label = "text-[13px] font-semibold leading-[normal] text-ink";
const hint = "text-[12px] font-light leading-[normal] text-muted";
const errorText = "text-[12px] leading-[normal] text-[#c81e1e]";
const inputClass = (invalid: boolean) =>
  `h-[48px] w-full rounded-[8px] border bg-white px-[16px] text-[14px] font-light text-ink outline-none placeholder:text-[rgba(115,115,115,0.9)] focus:border-accent ${
    invalid ? "border-[#c81e1e]" : "border-line"
  }`;

// Figma: Registration > Attendee form (3949:199)
export function AttendeeForm() {
  const [fields, setFields] = useState(EMPTY);
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [tickets, setTickets] = useState(0);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const clientIdRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFields(EMPTY);
    setEligible(null);
    setTickets(0);
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
  const clientIdError = duplicate ?? errors.clientId;

  function update(key: keyof typeof EMPTY, value: string) {
    setFields((f) => ({ ...f, [key]: value }));
    if (key === "clientId") setDuplicate(null);
  }

  function chooseEligible(value: boolean) {
    setEligible(value);
    if (!value) setTickets(0);
  }

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

      <label className="flex w-full flex-col gap-[8px]">
        <span className={label}>Client ID</span>
        <input
          ref={clientIdRef}
          name="clientId"
          value={fields.clientId}
          onChange={(e) => update("clientId", e.target.value)}
          onBlur={async (e) => setDuplicate(await checkClientId(e.target.value))}
          placeholder="Enter Client ID"
          autoComplete="off"
          autoFocus
          aria-invalid={!!clientIdError}
          className={inputClass(!!clientIdError)}
        />
        {clientIdError ? (
          <span className={errorText}>{clientIdError}</span>
        ) : (
          <span className={hint}>Type it exactly as shown on the portal.</span>
        )}
      </label>

      <label className="flex w-full flex-col gap-[8px]">
        <span className={label}>Name</span>
        <input
          name="name"
          value={fields.name}
          onChange={(e) => update("name", e.target.value)}
          placeholder="Full name"
          autoComplete="off"
          aria-invalid={!!errors.name}
          className={inputClass(!!errors.name)}
        />
        {errors.name && <span className={errorText}>{errors.name}</span>}
      </label>

      <label className="flex w-full flex-col gap-[8px]">
        <span className={label}>Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          value={fields.email}
          onChange={(e) => update("email", e.target.value)}
          placeholder="name@example.com"
          autoComplete="off"
          aria-invalid={!!errors.email}
          className={inputClass(!!errors.email)}
        />
        {errors.email && <span className={errorText}>{errors.email}</span>}
      </label>

      <label className="flex w-full flex-col gap-[8px]">
        <span className={label}>Phone number</span>
        <input
          name="phone"
          type="tel"
          inputMode="tel"
          value={fields.phone}
          onChange={(e) => update("phone", e.target.value)}
          placeholder="+234 800 000 0000"
          autoComplete="off"
          aria-invalid={!!errors.phone}
          className={inputClass(!!errors.phone)}
        />
        {errors.phone && <span className={errorText}>{errors.phone}</span>}
      </label>

      <fieldset className="flex w-full flex-col gap-[8px]">
        <legend className={`${label} mb-[8px]`}>Grand Draw eligibility</legend>
        <input type="hidden" name="eligible" value={eligible === null ? "" : eligible ? "yes" : "no"} />
        <div className="flex w-full gap-[4px] rounded-[10px] bg-surface p-[4px]">
          {[
            { value: true, text: "Eligible" },
            { value: false, text: "Not eligible" },
          ].map(({ value, text }) => {
            const selected = eligible === value;
            return (
              <button
                key={text}
                type="button"
                aria-pressed={selected}
                onClick={() => chooseEligible(value)}
                className={`flex h-[40px] min-w-px flex-1 items-center justify-center rounded-[8px] text-[14px] ${
                  selected ? "bg-accent-gradient font-semibold text-white" : "font-normal text-ink hover:bg-white"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
        {errors.eligible && <span className={errorText}>{errors.eligible}</span>}
      </fieldset>

      <fieldset className="flex w-full flex-col gap-[8px]" disabled={!eligible}>
        <legend className={`${label} mb-[8px]`}>Tickets</legend>
        <input type="hidden" name="tickets" value={tickets} />
        <div className="flex w-full gap-[6px]">
          {TICKET_OPTIONS.map((n) => {
            const selected = tickets === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                aria-label={`${n} ticket${n === 1 ? "" : "s"}`}
                onClick={() => setTickets(n)}
                className={`flex h-[40px] min-w-px flex-1 items-center justify-center rounded-[8px] text-[14px] disabled:cursor-not-allowed disabled:opacity-40 ${
                  selected
                    ? "bg-accent-gradient font-semibold text-white"
                    : "border border-line bg-white font-normal text-ink enabled:hover:border-accent"
                }`}
              >
                {n}
              </button>
            );
          })}
        </div>
        {tickets > 0 && (
          <span className="self-start rounded-full bg-[rgba(217,37,200,0.1)] px-[10px] py-[4px] text-[12px] font-semibold text-accent">
            {tickets} ticket{tickets === 1 ? "" : "s"} · {tickets}× the chance
          </span>
        )}
        {eligible === false && <span className={hint}>Not eligible for the Grand Draw: 0 tickets.</span>}
        {errors.tickets && <span className={errorText}>{errors.tickets}</span>}
        <span className={hint}>1 ticket per $100 (rounded down), up to 10 tickets at $1,000 or more.</span>
        <span className={hint}>Saved with your name and the time.</span>
      </fieldset>

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
        Privacy: we keep only the Client ID, name, email and phone, for this event&apos;s giveaways. Let the client know before you add them.
      </p>
    </form>
  );
}
