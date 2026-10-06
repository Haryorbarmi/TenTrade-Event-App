// Display helpers. All times are shown in Lagos time (WAT), whatever the device's timezone.

const lagosTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Lagos",
  hour: "numeric",
  minute: "2-digit",
});

export function formatLagosTime(iso: string): string {
  return lagosTime.format(new Date(iso));
}

// "+2348031234567" -> "+234 803 123 4567" (numbers are stored in that one format).
export function formatPhone(phone: string): string {
  const m = /^\+234(\d{3})(\d{3})(\d{4})$/.exec(phone);
  return m ? `+234 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

// "Eniola Oyedele" -> "Eniola O."
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}
