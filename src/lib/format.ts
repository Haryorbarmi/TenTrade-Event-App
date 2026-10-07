// Display helpers. All times are shown in Lagos time (WAT), whatever the device's timezone.

const lagosTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Africa/Lagos",
  hour: "numeric",
  minute: "2-digit",
});

export function formatLagosTime(iso: string): string {
  return lagosTime.format(new Date(iso));
}

// "Eniola Oyedele" -> "Eniola O."
export function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? "";
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}
