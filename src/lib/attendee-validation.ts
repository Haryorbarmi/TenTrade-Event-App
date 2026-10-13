// Registration rules (CLAUDE.md section 5). Shared by the form and the server
// action; the server always re-validates. Only the Client ID and name are
// recorded about a person (no email or phone, per the boss). A name is a First
// name, an optional Middle name and a Last name; `name` is those parts joined,
// for lists, exports and the raffle.

export type AttendeeInput = {
  clientId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  eligible: boolean | null;
  tickets: number;
};

export type AttendeeFields = keyof AttendeeInput;
export type FieldErrors = Partial<Record<AttendeeFields, string>>;

export type CleanAttendee = {
  client_id: string;
  name: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  eligible: boolean;
  tickets: number;
};

export function attendeeFromForm(formData: FormData): AttendeeInput {
  const eligible = formData.get("eligible");
  return {
    clientId: String(formData.get("clientId") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    middleName: String(formData.get("middleName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    eligible: eligible === "yes" ? true : eligible === "no" ? false : null,
    tickets: Number(formData.get("tickets") ?? 0),
  };
}

export const duplicateClientIdMessage = (clientId: string) =>
  `Client ID ${clientId} is already registered. Each client can only be added once.`;

// Owner confirmed 2026-10-06: Client IDs are always exactly 6 digits.
export const CLIENT_ID_RE = /^\d{6}$/;

const tidy = (v: string) => v.trim().replace(/\s+/g, " ");

export function validateAttendee(input: AttendeeInput): { data: CleanAttendee } | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  const clientId = input.clientId.trim();
  const first = tidy(input.firstName);
  const middle = tidy(input.middleName);
  const last = tidy(input.lastName);
  const name = [first, middle, last].filter(Boolean).join(" ");

  if (!clientId) errors.clientId = "Enter the Client ID.";
  else if (!CLIENT_ID_RE.test(clientId)) errors.clientId = "A Client ID is exactly 6 digits, like 104823.";

  if (!first) errors.firstName = "Enter the first name.";
  if (!last) errors.lastName = "Enter the last name.";
  if (name.length > 100) errors.lastName = "Name is too long.";

  if (input.eligible === null) errors.eligible = "Choose Eligible or Not eligible.";
  else if (input.eligible && !(Number.isInteger(input.tickets) && input.tickets >= 1 && input.tickets <= 10))
    errors.tickets = "Choose 1 to 10 tickets.";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      client_id: clientId,
      name,
      first_name: first,
      middle_name: middle || null,
      last_name: last,
      eligible: input.eligible!,
      tickets: input.eligible ? input.tickets : 0,
    },
  };
}

// Splits one full name into parts: the first word is the first name, the rest the last name.
export function splitFullName(full: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = full.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}
