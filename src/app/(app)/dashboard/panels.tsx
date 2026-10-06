/* eslint-disable @next/next/no-img-element -- small SVG dots from Figma */
import { EligibilityPill } from "@/components/attendee-pills";
import { formatLagosTime } from "@/lib/format";

const panel = "flex min-w-px flex-col rounded-[12px] border border-line bg-white p-[28px]";
const title = "text-[16px] font-semibold leading-[normal] text-ink";
const money = (n: number) => `$${n.toLocaleString("en-US")}`;

type DrawRow = { id: string; name: string; prize_amount: number; winners_count: number; status: "open" | "locked" | "done" };

const STATUS = {
  locked: { label: "Ready", cls: "bg-[rgba(246,101,132,0.12)] text-accent-from", dot: "/brand/dot-ready.svg" },
  done: { label: "Done", cls: "bg-[rgba(33,158,97,0.12)] text-[#219e61]", dot: "/brand/dot-eligible.svg" },
  open: { label: "Waiting", cls: "bg-[rgba(115,115,115,0.12)] text-muted", dot: "/brand/dot-not-eligible.svg" },
} as const;

// Figma: Dashboard > Draws (3963:204). Ready = list locked, Done = all winners drawn.
export function DrawsPanel({ draws }: { draws: DrawRow[] }) {
  return (
    <section className={`${panel} w-full gap-[4px] lg:w-[400px] lg:shrink-0`}>
      <h2 className={title}>Draws</h2>
      {draws.map((d, i) => {
        const s = STATUS[d.status];
        return (
          <div key={d.id} className={`flex items-center justify-between gap-3 py-[10px] ${i > 0 ? "border-t border-line" : ""}`}>
            <div className="flex min-w-0 flex-col gap-[2px] leading-[normal]">
              <span className="truncate text-[14px] text-ink">{d.name}</span>
              <span className="text-[12px] font-light text-muted">
                {d.winners_count > 1 ? `${d.winners_count} × ${money(d.prize_amount / d.winners_count)}` : money(d.prize_amount)}
              </span>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-semibold leading-[normal] ${s.cls}`}>
              <img alt="" width={6} height={6} className="block size-[6px]" src={s.dot} />
              {s.label}
            </span>
          </div>
        );
      })}
    </section>
  );
}

type Arrival = { seq: number; client_id: string; name: string; eligible: boolean; created_at: string };

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

// Figma: Dashboard > Latest arrivals (3963:242)
export function LatestArrivals({ arrivals }: { arrivals: Arrival[] }) {
  return (
    <section className={`${panel} flex-1 gap-[4px]`}>
      <h2 className={title}>Latest arrivals</h2>
      {arrivals.length === 0 && <p className="pt-[8px] text-[14px] font-light text-muted">No arrivals yet.</p>}
      {arrivals.map((a, i) => (
        <div key={a.seq} className={`flex items-center gap-[12px] py-[8px] ${i > 0 ? "border-t border-line" : ""}`}>
          <span
            className="flex size-[36px] shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-r from-[rgba(246,101,132,0.18)] to-[rgba(217,37,200,0.18)] text-[12px] font-semibold text-accent"
            aria-hidden
          >
            {initials(a.name)}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal]">
            <span className="truncate text-[14px] text-ink">{a.name}</span>
            <span className="text-[12px] font-light text-muted">
              #{a.seq} · ID {a.client_id} · {formatLagosTime(a.created_at)}
            </span>
          </span>
          <EligibilityPill eligible={a.eligible} />
        </div>
      ))}
    </section>
  );
}

// Figma: Dashboard > Grand Draw eligibility (3963:280)
const R = 66;
const C = 2 * Math.PI * R;
export function EligibilityDonut({ eligible, total, tickets }: { eligible: number; total: number; tickets: number }) {
  const share = total > 0 ? eligible / total : 0;
  const legend = [
    { dot: "/brand/legend-eligible.svg", label: "Eligible", value: eligible },
    { dot: "/brand/legend-not-eligible.svg", label: "Not eligible", value: total - eligible },
    { dot: "/brand/legend-tickets.svg", label: "Tickets in draw", value: tickets },
  ];
  return (
    <section className={`${panel} w-full justify-center gap-[16px] lg:w-[400px] lg:shrink-0`}>
      <h2 className={title}>Grand Draw eligibility</h2>
      <div className="flex w-full items-center gap-[24px]">
        <div className="relative size-[150px] shrink-0">
          <img alt="" width={150} height={150} className="absolute inset-0 block size-[150px]" src="/brand/donut-track.svg" />
          {/* Eligible share: same 18px stroke and gradient as the Figma arc, sized from real data. */}
          <svg width={150} height={150} viewBox="0 0 150 150" className="absolute inset-0 -rotate-90" aria-hidden>
            <defs>
              <linearGradient id="donut-gradient" x1="0" y1="75" x2="150" y2="75" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F66584" />
                <stop offset="1" stopColor="#D925C8" />
              </linearGradient>
            </defs>
            {share > 0 && (
              <circle cx="75" cy="75" r={R} fill="none" stroke="url(#donut-gradient)" strokeWidth={18} strokeDasharray={`${C * share} ${C}`} />
            )}
          </svg>
          <p className="absolute inset-0 flex items-center justify-center font-heading text-[34px] leading-none text-ink">
            {Math.round(share * 100)}%
          </p>
        </div>
        <div className="flex min-w-px flex-1 flex-col gap-[10px]">
          {legend.map((l) => (
            <div key={l.label} className="flex items-center gap-[8px] text-[14px] leading-[normal]">
              <img alt="" width={10} height={10} className="block size-[10px]" src={l.dot} />
              <span className="font-light text-muted">{l.label}</span>
              <span className="font-semibold text-ink">{l.value}</span>
            </div>
          ))}
          <p className="text-[12px] font-light leading-[normal] text-muted">
            Clients can top up at the desk and qualify before the list is locked.
          </p>
        </div>
      </div>
    </section>
  );
}
