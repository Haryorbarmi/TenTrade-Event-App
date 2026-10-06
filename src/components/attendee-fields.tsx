"use client";

import type { Ref } from "react";
import type { FieldErrors } from "@/lib/attendee-validation";

// The attendee fields from Figma: Registration > Attendee form (3949:199).
// Shared by the Registration form and the Edit attendee pop-up.

export type AttendeeValues = {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  eligible: boolean | null;
  tickets: number;
};

export const EMPTY_VALUES: AttendeeValues = { clientId: "", name: "", email: "", phone: "", eligible: null, tickets: 0 };

const TICKET_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const label = "text-[13px] font-semibold leading-[normal] text-ink";
export const hintClass = "text-[12px] font-light leading-[normal] text-muted";
export const errorClass = "text-[12px] leading-[normal] text-[#c81e1e]";
const inputClass = (invalid: boolean) =>
  `h-[48px] w-full rounded-[8px] border bg-white px-[16px] text-[14px] font-light text-ink outline-none placeholder:text-[rgba(115,115,115,0.9)] focus:border-accent ${
    invalid ? "border-[#c81e1e]" : "border-line"
  }`;

type Props = {
  values: AttendeeValues;
  onChange: (values: AttendeeValues) => void;
  errors: FieldErrors;
  clientIdWarning: string | null;
  onClientIdBlur: (clientId: string) => void;
  clientIdRef?: Ref<HTMLInputElement>;
  autoFocus?: boolean;
};

export function AttendeeFields({ values, onChange, errors, clientIdWarning, onClientIdBlur, clientIdRef, autoFocus }: Props) {
  const set = (patch: Partial<AttendeeValues>) => onChange({ ...values, ...patch });
  const clientIdError = clientIdWarning ?? errors.clientId;

  const text = (key: "name" | "email" | "phone", title: string, placeholder: string, type = "text") => (
    <label className="flex w-full flex-col gap-[8px]">
      <span className={label}>{title}</span>
      <input
        name={key}
        type={type}
        inputMode={type === "email" ? "email" : type === "tel" ? "tel" : undefined}
        value={values[key]}
        onChange={(e) => set({ [key]: e.target.value })}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={!!errors[key]}
        className={inputClass(!!errors[key])}
      />
      {errors[key] && <span className={errorClass}>{errors[key]}</span>}
    </label>
  );

  return (
    <>
      <label className="flex w-full flex-col gap-[8px]">
        <span className={label}>Client ID</span>
        <input
          ref={clientIdRef}
          name="clientId"
          value={values.clientId}
          onChange={(e) => set({ clientId: e.target.value })}
          onBlur={(e) => onClientIdBlur(e.target.value)}
          placeholder="Enter Client ID"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-invalid={!!clientIdError}
          className={inputClass(!!clientIdError)}
        />
        {clientIdError ? (
          <span className={errorClass}>{clientIdError}</span>
        ) : (
          <span className={hintClass}>Type it exactly as shown on the portal.</span>
        )}
      </label>

      {text("name", "Name", "Full name")}
      {text("email", "Email", "name@example.com", "email")}
      {text("phone", "Phone number", "+234 800 000 0000", "tel")}

      <fieldset className="flex w-full flex-col gap-[8px]">
        <legend className={`${label} mb-[8px]`}>Grand Draw eligibility</legend>
        <input type="hidden" name="eligible" value={values.eligible === null ? "" : values.eligible ? "yes" : "no"} />
        <div className="flex w-full gap-[4px] rounded-[10px] bg-surface p-[4px]">
          {[
            { value: true, text: "Eligible" },
            { value: false, text: "Not eligible" },
          ].map(({ value, text: caption }) => {
            const selected = values.eligible === value;
            return (
              <button
                key={caption}
                type="button"
                aria-pressed={selected}
                onClick={() => set(value ? { eligible: true } : { eligible: false, tickets: 0 })}
                className={`flex h-[40px] min-w-px flex-1 items-center justify-center rounded-[8px] text-[14px] ${
                  selected ? "bg-accent-gradient font-semibold text-white" : "font-normal text-ink hover:bg-white"
                }`}
              >
                {caption}
              </button>
            );
          })}
        </div>
        {errors.eligible && <span className={errorClass}>{errors.eligible}</span>}
      </fieldset>

      <fieldset className="flex w-full flex-col gap-[8px]" disabled={!values.eligible}>
        <legend className={`${label} mb-[8px]`}>Tickets</legend>
        <input type="hidden" name="tickets" value={values.tickets} />
        <div className="flex w-full gap-[6px]">
          {TICKET_OPTIONS.map((n) => {
            const selected = values.tickets === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={selected}
                aria-label={`${n} ticket${n === 1 ? "" : "s"}`}
                onClick={() => set({ tickets: n })}
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
        {values.tickets > 0 && (
          <span className="self-start rounded-full bg-[rgba(217,37,200,0.1)] px-[10px] py-[4px] text-[12px] font-semibold text-accent">
            {values.tickets} ticket{values.tickets === 1 ? "" : "s"} · {values.tickets}× the chance
          </span>
        )}
        {values.eligible === false && <span className={hintClass}>Not eligible for the Grand Draw: 0 tickets.</span>}
        {errors.tickets && <span className={errorClass}>{errors.tickets}</span>}
        <span className={hintClass}>1 ticket per $100 (rounded down), up to 10 tickets at $1,000 or more.</span>
        <span className={hintClass}>Saved with your name and the time.</span>
      </fieldset>
    </>
  );
}
