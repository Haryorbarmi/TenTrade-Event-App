"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setExpectedAttendees } from "./actions";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const card = "flex min-w-px flex-1 flex-col gap-[6px] rounded-[12px] px-[28px] py-[22px] leading-[normal]";
const plainCard = `${card} border border-line bg-white`;
const caption = "text-[13px] text-muted";
const big = "font-heading text-[48px] text-ink";
const note = "text-[13px] font-light text-muted";

export type KpiData = {
  checkedIn: number;
  expected: number | null;
  eligible: number;
  tickets: number;
  peak: { count: number; from: string; to: string } | null;
  draws: { done: number; total: number; awarded: number };
};

// Figma: Dashboard > KPIs (3963:143)
export function KpiCards({ data, canEditExpected }: { data: KpiData; canEditExpected: boolean }) {
  return (
    <div className="grid w-full grid-cols-1 gap-[24px] sm:grid-cols-2 xl:grid-cols-4">
      <CheckedInCard checkedIn={data.checkedIn} expected={data.expected} canEdit={canEditExpected} />

      <div className={`${card} bg-accent-gradient text-white`}>
        <p className="text-[13px] text-white/85">Grand Draw eligible</p>
        <p className="font-heading text-[48px] text-white">{data.eligible}</p>
        <p className="text-[13px] font-light text-white/90">
          eligible · {data.tickets} ticket{data.tickets === 1 ? "" : "s"} in the draw
        </p>
      </div>

      <div className={plainCard}>
        <p className={caption}>Peak arrivals</p>
        <p className={big}>{data.peak?.count ?? 0}</p>
        <p className={note}>{data.peak ? `between ${data.peak.from} and ${data.peak.to}` : "No arrivals yet"}</p>
      </div>

      <div className={plainCard}>
        <p className={caption}>Draws completed</p>
        <p className={big}>
          {data.draws.done} / {data.draws.total}
        </p>
        <p className={note}>{data.draws.awarded > 0 ? `${money(data.draws.awarded)} awarded so far` : "No prizes awarded yet"}</p>
      </div>
    </div>
  );
}

function CheckedInCard({ checkedIn, expected, canEdit }: { checkedIn: number; expected: number | null; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(expected?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const percent = expected ? Math.min(100, Math.round((checkedIn / expected) * 100)) : 0;

  function save() {
    startTransition(async () => {
      const r = await setExpectedAttendees(value);
      if (r.ok) {
        setEditing(false);
        setError(null);
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div className={plainCard}>
      <p className={caption}>Checked in</p>
      <p className={big}>{checkedIn}</p>
      {editing ? (
        <form
          className="flex flex-col gap-[6px]"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="flex items-center gap-[6px] text-[13px] font-light text-muted">
            of
            <input
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              inputMode="numeric"
              autoFocus
              aria-label="Expected number of attendees"
              placeholder="240"
              className="h-[30px] w-[80px] rounded-[6px] border border-line px-[8px] text-ink outline-none focus:border-accent"
            />
            expected
            <button type="submit" disabled={pending} className="ml-auto text-accent disabled:opacity-50">
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className="text-muted hover:text-ink">
              Cancel
            </button>
          </div>
          {error ? (
            <span className="text-[12px] text-[#c81e1e]">{error}</span>
          ) : (
            <span className="text-[12px] font-light text-muted">Leave empty to clear.</span>
          )}
        </form>
      ) : (
        <p className={`${note} flex items-center gap-[8px]`}>
          {expected ? `of ${expected.toLocaleString("en-US")} expected` : "Expected number not set"}
          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setValue(expected?.toString() ?? "");
                setEditing(true);
              }}
              className="text-accent hover:underline"
            >
              {expected ? "Edit" : "Set"}
            </button>
          )}
        </p>
      )}
      {expected !== null && (
        <div className="relative h-[6px] w-full overflow-clip rounded-[3px] bg-line" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="bg-accent-gradient absolute left-0 top-0 h-[6px]" style={{ width: `${percent}%` }} />
        </div>
      )}
    </div>
  );
}
