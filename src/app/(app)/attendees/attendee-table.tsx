"use client";

import { useMemo, useRef, useState } from "react";
import { EligibilityPill, TicketsPill } from "@/components/attendee-pills";
import { LiveIndicator } from "@/components/live-indicator";
import { ATTENDEE_COLUMNS, filterAttendees, summarize, type AttendeeRow } from "@/lib/attendees";
import { formatLagosTime, shortName } from "@/lib/format";
import { canEditAttendee, isSuperAdmin, type Profile } from "@/lib/roles";
import { useAttendeesLive } from "@/lib/use-attendees-live";
import { EditAttendeeDialog } from "./edit-attendee-dialog";

type Registrar = { id: string; name: string };

const COLUMNS = [
  { label: "No.", width: "w-[48px]" },
  { label: "Client ID", width: "w-[90px]" },
  { label: "Name", width: "w-[220px]" },
  { label: "Grand Draw", width: "w-[120px]" },
  { label: "Tickets", width: "w-[100px]" },
  { label: "Registered by", width: "w-[120px]" },
  { label: "Time", width: "w-[88px]" },
  { label: "", width: "w-[72px]" }, // Edit
];

const chip = "inline-flex h-[34px] items-center whitespace-nowrap rounded-full px-[14px] text-[13px] leading-[normal]";
const chipOn = `${chip} bg-ink text-white`;
const chipOff = `${chip} border border-line bg-white text-ink hover:border-ink`;

// Figma: Attendee (3950:194)
export function AttendeeTable({
  initialRows,
  registrars,
  viewer,
}: {
  initialRows: AttendeeRow[];
  registrars: Registrar[];
  viewer: Profile;
}) {
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<AttendeeRow | null>(null);
  const [people, setPeople] = useState(registrars);
  const [query, setQuery] = useState("");
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [registeredBy, setRegisteredBy] = useState<string | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef(new Set(initialRows.map((r) => r.id)));

  const live = useAttendeesLive("attendee-list", async (supabase) => {
    const { data } = await supabase.from("attendees").select(ATTENDEE_COLUMNS).order("seq");
    if (!data) return;
    const added = data.filter((r) => !known.current.has(r.id)).map((r) => r.id);
    data.forEach((r) => known.current.add(r.id));
    setRows(data);
    if (added.length) setFresh(new Set(added));

    const names = new Set(people.map((p) => p.id));
    if (data.some((r) => !names.has(r.registered_by))) {
      const { data: profiles } = await supabase.from("profiles").select("id, name").order("name");
      if (profiles) setPeople(profiles);
    }
  });

  const nameOf = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p.name])), [people]);
  const totals = useMemo(() => summarize(rows), [rows]);
  const shown = useMemo(
    () => filterAttendees(rows, { query, eligibleOnly, registeredBy }),
    [rows, query, eligibleOnly, registeredBy],
  );

  return (
    <>
      <div className="flex w-full flex-wrap items-center justify-between gap-[12px]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or Client ID"
          aria-label="Search attendees"
          className="h-[44px] w-full rounded-[8px] border border-line bg-white px-[16px] text-[14px] font-light text-ink outline-none placeholder:text-[rgba(115,115,115,0.9)] focus:border-accent sm:w-[380px]"
        />

        <div className="flex flex-wrap items-center gap-[8px]" role="group" aria-label="Filters">
          <button
            type="button"
            aria-pressed={!eligibleOnly && registeredBy === null}
            onClick={() => {
              setEligibleOnly(false);
              setRegisteredBy(null);
            }}
            className={!eligibleOnly && registeredBy === null ? chipOn : chipOff}
          >
            All
          </button>
          <button
            type="button"
            aria-pressed={eligibleOnly}
            onClick={() => setEligibleOnly((v) => !v)}
            className={eligibleOnly ? chipOn : chipOff}
          >
            Eligible only · {totals.eligible}
          </button>
          <label className={`${registeredBy ? chipOn : chipOff} relative gap-[6px] pr-[30px]`}>
            <span className="sr-only">Registered by</span>
            <select
              value={registeredBy ?? ""}
              onChange={(e) => setRegisteredBy(e.target.value || null)}
              className="cursor-pointer appearance-none bg-transparent outline-none"
            >
              <option value="">Registered by: All</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  Registered by: {shortName(p.name)}
                </option>
              ))}
            </select>
            <span className={`pointer-events-none absolute right-[14px] text-[8px] ${registeredBy ? "text-white" : "text-muted"}`} aria-hidden>
              ▼
            </span>
          </label>
        </div>

        <div className="flex items-center gap-[12px] text-[14px] leading-[normal]">
          <LiveIndicator live={live} />
          <span>
            <span className="font-semibold text-ink">{totals.total}</span>{" "}
            <span className="font-light text-muted">checked in</span>
          </span>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-[12px] border border-line bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left">
            <thead className="bg-surface">
              <tr>
                {COLUMNS.map((c, i) => (
                  <th
                    key={c.label}
                    scope="col"
                    className={`${c.width} h-[44px] text-[12px] font-semibold leading-[normal] text-muted ${i === 0 ? "pl-[24px]" : ""} ${
                      i === COLUMNS.length - 1 ? "pr-[24px]" : ""
                    }`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`h-[52px] border-b border-line text-[14px] leading-[normal] text-ink ${fresh.has(r.id) ? "animate-row-flash" : ""}`}>
                  <td className="pl-[24px] font-light">{r.seq}</td>
                  <td className="truncate pr-2 font-light">{r.client_id}</td>
                  <td className="truncate pr-2 font-normal" title={r.name}>
                    {r.name}
                  </td>
                  <td>
                    <EligibilityPill eligible={r.eligible} />
                  </td>
                  <td>
                    <TicketsPill tickets={r.tickets} />
                  </td>
                  <td className="truncate pr-2 font-light">{shortName(nameOf[r.registered_by] ?? "…")}</td>
                  <td className="whitespace-nowrap pr-2 font-light">{formatLagosTime(r.created_at)}</td>
                  <td className="pr-[24px] text-right">
                    {canEditAttendee(viewer) && (
                      <button
                        type="button"
                        onClick={() => setEditing(r)}
                        aria-label={`Edit No. ${r.seq}, ${r.name}`}
                        className="rounded-[6px] px-[8px] py-[4px] text-[13px] text-accent hover:bg-accent/10"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="h-[88px] px-[24px] text-[14px] font-light text-muted">
                    {rows.length === 0 ? "No check-ins yet. Attendees appear here as registrars add them." : "No attendees match your search or filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="px-[24px] py-[14px] text-[13px] font-light leading-[normal] text-muted">
          Showing {shown.length} of {totals.total} attendee{totals.total === 1 ? "" : "s"} · {totals.eligible} eligible · {totals.tickets} ticket
          {totals.tickets === 1 ? "" : "s"} in the Grand Draw
        </p>
      </div>

      {editing && (
        <EditAttendeeDialog
          key={editing.id}
          attendee={editing}
          names={nameOf}
          canSeeHistory={isSuperAdmin(viewer)}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
