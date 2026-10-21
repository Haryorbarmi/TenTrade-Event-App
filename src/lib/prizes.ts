// What each winner slot in a draw is worth. Most draws split their prize equally
// (Event Engagement: $250 / 5 = $50 each). Draws listed here pay a different amount
// per position (Lucky Attendee: $100 for the first round, $50 for the second).
const UNEVEN_PRIZES: Partial<Record<string, number[]>> = {
  lucky: [100, 50],
};

export type PrizeDraw = { type: string; prize_amount: number; winners_count: number };

// Position is 1-based, as in `winners.position`.
export function prizeAt(draw: PrizeDraw, position: number): number {
  return UNEVEN_PRIZES[draw.type]?.[position - 1] ?? draw.prize_amount / draw.winners_count;
}

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

// Short text for the prize, e.g. "$500", "5 × $50", "$100 + $50".
export function prizeSummary(draw: PrizeDraw): string {
  if (draw.winners_count <= 1) return money(draw.prize_amount);
  const amounts = Array.from({ length: draw.winners_count }, (_, i) => prizeAt(draw, i + 1));
  return amounts.every((a) => a === amounts[0]) ? `${draw.winners_count} × ${money(amounts[0]!)}` : amounts.map(money).join(" + ");
}
