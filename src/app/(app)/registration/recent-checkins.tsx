"use client";

import { useRef, useState } from "react";
import { EligibilityPill, TicketsPill } from "@/components/attendee-pills";
import { LiveIndicator } from "@/components/live-indicator";
import { RECENT_COLUMNS, RECENT_LIMIT, type RecentRow } from "@/lib/attendees";
import { formatLagosTime, shortName } from "@/lib/format";
import { useAttendeesLive } from "@/lib/use-attendees-live";

// Figma: Registration > Recent check-ins (3949:223), rows styled like the Attendee table.
export function RecentCheckins({ initialRows, names }: { initialRows: RecentRow[]; names: Record<string, string> }) {
  const [rows, setRows] = useState(initialRows);
  const [registrars, setRegistrars] = useState(names);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const known = useRef(new Set(initialRows.map((r) => r.id)));

  // Re-read instead of patching from the event, so the list is always exactly
  // the latest entries, even after edits or deletes.
  const live = useAttendeesLive("recent-checkins", async (supabase) => {
    const { data } = await supabase
      .from("attendees")
      .select(RECENT_COLUMNS)
      .order("seq", { ascending: false })
      .limit(RECENT_LIMIT);
    if (!data) return;

    const added = data.filter((r) => !known.current.has(r.id)).map((r) => r.id);
    data.forEach((r) => known.current.add(r.id));
    setRows(data);
    if (added.length) setFresh(new Set(added));

    if (data.some((r) => !(r.registered_by in registrars))) {
      const { data: profiles } = await supabase.from("profiles").select("id, name");
      if (profiles) setRegistrars(Object.fromEntries(profiles.map((p) => [p.id, p.name])));
    }
  });

  return (
    <section className="flex w-full min-w-px flex-1 flex-col gap-[20px] rounded-[12px] border border-line bg-white p-6 md:p-[32px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Recent check-ins</h2>
        <LiveIndicator live={live} />
      </div>

      {rows.length === 0 ? (
        <p className="text-[14px] font-light leading-[normal] text-muted">
          No check-ins yet. Entries appear here in arrival order, numbered from 1.
        </p>
      ) : (
        <ol className="-mx-6 md:-mx-[32px]" aria-live="polite">
          {rows.map((r) => (
            <li
              key={r.id}
              className={`flex items-center gap-[12px] border-t border-line px-6 py-[10px] md:px-[32px] ${
                fresh.has(r.id) ? "animate-row-flash" : ""
              }`}
            >
              <span className="w-[40px] shrink-0 text-[14px] font-semibold text-ink">{r.seq}</span>
              <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <span className="truncate text-[14px] font-normal leading-[normal] text-ink">{r.name}</span>
                <span className="truncate text-[12px] font-light leading-[normal] text-muted">
                  {r.client_id} · by {shortName(registrars[r.registered_by] ?? "…")}
                </span>
              </span>
              <span className="hidden shrink-0 sm:inline-flex">
                <EligibilityPill eligible={r.eligible} />
              </span>
              <span className="w-[76px] shrink-0">
                <TicketsPill tickets={r.tickets} />
              </span>
              <span className="w-[64px] shrink-0 text-right text-[14px] font-light text-ink">{formatLagosTime(r.created_at)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
