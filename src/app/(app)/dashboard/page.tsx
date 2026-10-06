import { requireUser } from "@/lib/auth";
import { summarize } from "@/lib/attendees";
import { arrivalSlots, drawProgress, peakSlot } from "@/lib/dashboard";
import { formatLagosTime } from "@/lib/format";
import { isSuperAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { KpiCards } from "./kpi-cards";
import { LiveRefresh } from "./live-refresh";
import { CheckinsChart } from "./checkins-chart";
import { DrawsPanel, EligibilityDonut, LatestArrivals } from "./panels";

const DRAW_ORDER = ["grand", "early_bird", "engagement", "knowledge", "lucky"];

export const metadata = { title: "Dashboard · TenTrade Lagos Seminar 2026" };

// "9:30" and "9:40 AM" (Figma style); keeps both AM/PM when they differ.
function slotLabel(start: number, end: number) {
  const from = formatLagosTime(new Date(start).toISOString());
  const to = formatLagosTime(new Date(end).toISOString());
  return { from: from.slice(-2) === to.slice(-2) ? from.slice(0, -3) : from, to };
}

// Figma: Dashboard (3963:135). Every number comes from real data.
export default async function DashboardPage() {
  const viewer = await requireUser();
  const supabase = await createClient();
  // Draw progress for everyone, as totals only. Registrars cannot read the raffle
  // tables (RLS), so this is read on the server and never includes who won.
  const admin = createAdminClient();

  const [{ data: attendees }, { data: settings }, { data: draws }, { data: winners }] = await Promise.all([
    supabase.from("attendees").select("seq, client_id, name, eligible, tickets, created_at").order("seq", { ascending: false }),
    supabase.from("event_settings").select("expected_attendees").eq("id", 1).maybeSingle(),
    admin.from("draws").select("id, type, name, status, prize_amount, winners_count"),
    admin.from("winners").select("draw_id").eq("replaced", false),
  ]);

  const rows = attendees ?? [];
  const totals = summarize(rows);
  const slots = arrivalSlots(rows.map((r) => r.created_at));
  const peak = peakSlot(slots);
  const orderedDraws = DRAW_ORDER.map((t) => (draws ?? []).find((d) => d.type === t)).filter((d) => !!d);
  const progress = drawProgress(
    (draws ?? []).map((d) => ({ ...d, currentWinners: (winners ?? []).filter((w) => w.draw_id === d.id).length })),
  );

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex w-full items-end justify-between gap-4">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-heading text-[30px] leading-[normal] text-ink">Dashboard</h1>
          <p className="text-[14px] font-light leading-[normal] text-muted">Live overview of Lagos Seminar 2026.</p>
        </div>
        <LiveRefresh />
      </header>

      <KpiCards
        canEditExpected={isSuperAdmin(viewer)}
        data={{
          checkedIn: totals.total,
          expected: settings?.expected_attendees ?? null,
          eligible: totals.eligible,
          tickets: totals.tickets,
          peak: peak ? { count: peak.count, ...slotLabel(peak.start, peak.end) } : null,
          draws: progress,
        }}
      />

      <div className="flex w-full flex-col gap-[24px] lg:flex-row">
        <CheckinsChart slots={slots} peakStart={peak?.start ?? null} />
        <DrawsPanel draws={orderedDraws} />
      </div>
      <div className="flex w-full flex-col gap-[24px] lg:flex-row">
        <LatestArrivals arrivals={rows.slice(0, 4)} />
        <EligibilityDonut eligible={totals.eligible} total={totals.total} tickets={totals.tickets} />
      </div>
    </div>
  );
}
