// Registration rules (CLAUDE.md section 5). Shared by the form and the server
// action; the server always re-validates. Only the Client ID and name are
// recorded about a person (no email or phone, per the boss).

export type AttendeeInput = {
  clientId: string;
  name: string;
  eligible: boolean | null;
  tickets: number;
};

export type AttendeeFields = keyof AttendeeInput;
export type FieldErrors = Partial<Record<AttendeeFields, string>>;

export type CleanAttendee = {
  client_id: string;
  name: string;
  eligible: boolean;
  tickets: number;
};

export function attendeeFromForm(formData: FormData): AttendeeInput {
  const eligible = formData.get("eligible");
  return {
    clientId: String(formData.get("clientId") ?? ""),
    name: String(formData.get("name") ?? ""),
    eligible: eligible === "yes" ? true : eligible === "no" ? false : null,
    tickets: Number(formData.get("tickets") ?? 0),
  };
}

export const duplicateClientIdMessage = (clientId: string) =>
  `Client ID ${clientId} is already registered. Each client can only be added once.`;

// Owner confirmed 2026-10-06: Client IDs are always exactly 6 digits.
export const CLIENT_ID_RE = /^\d{6}$/;

export function validateAttendee(input: AttendeeInput): { data: CleanAttendee } | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  const clientId = input.clientId.trim();
  const name = input.name.trim().replace(/\s+/g, " ");

  if (!clientId) errors.clientId = "Enter the Client ID.";
  else if (!CLIENT_ID_RE.test(clientId)) errors.clientId = "A Client ID is exactly 6 digits, like 104823.";

  if (!name) errors.name = "Enter the client's name.";
  else if (name.length > 100) errors.name = "Name is too long.";

  if (input.eligible === null) errors.eligible = "Choose Eligible or Not eligible.";
  else if (input.eligible && !(Number.isInteger(input.tickets) && input.tickets >= 1 && input.tickets <= 10))
    errors.tickets = "Choose 1 to 10 tickets.";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      client_id: clientId,
      name,
      eligible: input.eligible!,
      tickets: input.eligible ? input.tickets : 0,
    },
  };
}
