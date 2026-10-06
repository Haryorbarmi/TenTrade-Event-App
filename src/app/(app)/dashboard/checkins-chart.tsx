"use client";

import { useEffect, useRef } from "react";
import type { Slot } from "@/lib/dashboard";
import { formatLagosTime } from "@/lib/format";

const clock = (ms: number) => formatLagosTime(new Date(ms).toISOString()).replace(/ (AM|PM)$/, "");

// Figma: Dashboard > Check-ins over time (3963:163). Left-aligned like the
// design; when a long day no longer fits, it scrolls to show the newest bars.
export function CheckinsChart({ slots, peakStart }: { slots: Slot[]; peakStart: number | null }) {
  const scroller = useRef<HTMLDivElement>(null);
  const max = Math.max(1, ...slots.map((s) => s.count));

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [slots.length]);

  return (
    <section className="flex min-w-px flex-1 flex-col justify-center gap-[16px] rounded-[12px] border border-line bg-white p-[28px]">
      <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Check-ins over time</h2>
      {slots.length === 0 ? (
        <p className="text-[14px] font-light text-muted">No arrivals yet. Bars appear here as people check in.</p>
      ) : (
        <div ref={scroller} className="w-full overflow-x-auto">
          <div className="flex w-max flex-col gap-[8px]">
            <div className="flex h-[140px] items-end gap-[20px]" role="img" aria-label="Arrivals per 10 minutes">
              {slots.map((s) => (
                <div
                  key={s.start}
                  title={`${clock(s.start)}: ${s.count} arrival${s.count === 1 ? "" : "s"}`}
                  className={`w-[36px] shrink-0 rounded-[6px] ${s.start === peakStart ? "bg-accent-gradient" : "bg-[rgba(246,101,132,0.28)]"}`}
                  style={{ height: `${Math.max(6, Math.round((s.count / max) * 126))}px` }}
                />
              ))}
            </div>
            <div className="flex gap-[20px]">
              {slots.map((s) => (
                <span key={s.start} className="w-[36px] shrink-0 text-center text-[10px] font-light text-muted">
                  {clock(s.start)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <p className="text-[12px] font-light leading-[normal] text-muted">Arrivals per 10 minutes. The highlighted bar is the busiest slot.</p>
    </section>
  );
}
