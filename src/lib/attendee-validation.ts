// Registration rules (CLAUDE.md section 5). Shared by the form and the server
// action; the server always re-validates.

export type AttendeeInput = {
  clientId: string;
  name: string;
  email: string;
  phone: string;
  eligible: boolean | null;
  tickets: number;
};

export type AttendeeFields = keyof AttendeeInput;
export type FieldErrors = Partial<Record<AttendeeFields, string>>;

export type CleanAttendee = {
  client_id: string;
  name: string;
  email: string;
  phone: string;
  eligible: boolean;
  tickets: number;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Nigerian mobile numbers: 080..., 0803 ..., +234 803 ..., 234803...
// Returns the number as +234XXXXXXXXXX, or null if it is not valid.
export function normalizeNigerianPhone(raw: string): string | null {
  const digits = raw.replace(/[\s\-().]/g, "");
  let national: string | null = null;
  if (/^\+234\d{10}$/.test(digits)) national = digits.slice(4);
  else if (/^234\d{10}$/.test(digits)) national = digits.slice(3);
  else if (/^0\d{10}$/.test(digits)) national = digits.slice(1);
  if (!national || !/^[789]\d{9}$/.test(national)) return null;
  return `+234${national}`;
}

export function validateAttendee(input: AttendeeInput): { data: CleanAttendee } | { errors: FieldErrors } {
  const errors: FieldErrors = {};
  const clientId = input.clientId.trim();
  const name = input.name.trim().replace(/\s+/g, " ");
  const email = input.email.trim().toLowerCase();
  const phone = normalizeNigerianPhone(input.phone);

  if (!clientId) errors.clientId = "Enter the Client ID.";
  else if (clientId.length > 50) errors.clientId = "Client ID is too long.";

  if (!name) errors.name = "Enter the client's name.";
  else if (name.length > 100) errors.name = "Name is too long.";

  if (!email) errors.email = "Enter the client's email.";
  else if (!EMAIL_RE.test(email) || email.length > 200) errors.email = "Enter a valid email, like name@example.com.";

  if (!input.phone.trim()) errors.phone = "Enter the client's phone number.";
  else if (!phone) errors.phone = "Enter a Nigerian number, like 0803 000 0000 or +234 803 000 0000.";

  if (input.eligible === null) errors.eligible = "Choose Eligible or Not eligible.";
  else if (input.eligible && !(Number.isInteger(input.tickets) && input.tickets >= 1 && input.tickets <= 10))
    errors.tickets = "Choose 1 to 10 tickets.";

  if (Object.keys(errors).length > 0) return { errors };

  return {
    data: {
      client_id: clientId,
      name,
      email,
      phone: phone!,
      eligible: input.eligible!,
      tickets: input.eligible ? input.tickets : 0,
    },
  };
}
