import { NotAllowed } from "@/components/not-allowed";
import { getCurrentProfile } from "@/lib/auth";
import type { DrawType } from "@/lib/draw-engine";
import { excludedAttendeeIds, previewPool, type Draw } from "@/lib/raffle";
import { canAccessRaffle } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { RaffleConsole, type DrawWinnerRow, type PoolStats } from "./raffle-console";

export const metadata = { title: "Raffle · TenTrade Lagos Seminar 2026" };

const DRAW_ORDER: DrawType[] = ["grand", "early_bird", "engagement", "knowledge", "lucky"];

// Figma: Raffle · Grand Draw (3952:194) and its variants.
export default async function RafflePage({ searchParams }: PageProps<"/raffle">) {
  // Checked on the server. Raffle data is also blocked for registrars by RLS,
  // and every raffle action re-checks the role.
  const profile = await getCurrentProfile();
  if (!canAccessRaffle(profile)) return <NotAllowed />;

  const supabase = await createClient();
  const { data: drawRows } = await supabase.from("draws").select("*");
  const draws = DRAW_ORDER.map((t) => (drawRows as Draw[]).find((d) => d.type === t)).filter((d): d is Draw => !!d);

  const { draw: requested } = await searchParams;
  const draw = draws.find((d) => d.type === requested) ?? draws[0]!;

  const [{ data: winnerRows }, { data: profiles }, excluded, { data: fiftieth }, { data: tagged }] = await Promise.all([
    supabase
      .from("winners")
      .select(
        "id, attendee_id, position, pool_size, total_tickets, random_value, drawn_at, drawn_by, replaced, replace_kind, replaced_reason, attendee:attendees(client_id, name, tickets)",
      )
      .eq("draw_id", draw.id)
      .order("drawn_at"),
    supabase.from("profiles").select("id, name"),
    excludedAttendeeIds(supabase),
    supabase.from("attendees").select("created_at").eq("seq", 50).maybeSingle(),
    draw.type === "engagement"
      ? supabase.from("participants").select("attendee_id, attendee:attendees(client_id, name)").order("tagged_at")
      : Promise.resolve({ data: [] }),
  ]);
  const participants = ((tagged ?? []) as unknown as { attendee_id: string; attendee: { client_id: string; name: string } }[]).map(
    (p) => ({ attendee_id: p.attendee_id, client_id: p.attendee.client_id, name: p.attendee.name }),
  );

  // Pool numbers: the live preview while open, the locked snapshot afterwards,
  // minus anyone who has won or been found absent since.
  let stats: PoolStats;
  if (draw.status === "open") {
    const preview = await previewPool(supabase, draw);
    const entries = preview.ok ? preview.value.entries : [];
    stats = { people: entries.length, entries: preview.ok ? preview.value.total : 0, remaining: entries.length };
  } else {
    const entries = draw.pool_snapshot?.entries ?? [];
    const left = entries.filter((e) => !excluded.has(e.attendee_id));
    stats = { people: entries.length, entries: draw.pool_snapshot?.total ?? 0, remaining: left.length };
  }

  return (
    <RaffleConsole
      key={draw.id}
      draws={draws.map(({ id, type, name, prize_amount, winners_count, status }) => ({ id, type, name, prize_amount, winners_count, status }))}
      draw={{
        id: draw.id,
        type: draw.type,
        name: draw.name,
        prize_amount: draw.prize_amount,
        winners_count: draw.winners_count,
        status: draw.status,
        locked_by: draw.locked_by,
        locked_at: draw.locked_at,
      }}
      stats={stats}
      winners={(winnerRows ?? []) as unknown as DrawWinnerRow[]}
      names={Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]))}
      earlyBirdCutoff={fiftieth?.created_at ?? null}
      participants={participants}
    />
  );
}
