"use client";

import { useRouter } from "next/navigation";
import { TENEDGE_5K } from "@/lib/raffle-labels";

export type DrawOption = { id: string; type: string; name: string; prize_amount: number; status: string };

// "1. Choose the draw" dropdown, shared by the draw console and the Tenedge 5k page.
export function DrawSelect({ draws, value, onChange }: { draws: DrawOption[]; value: string; onChange?: () => void }) {
  const router = useRouter();
  return (
    <label className="relative w-full">
      <span className="sr-only">Draw</span>
      <select
        value={value}
        onChange={(e) => {
          onChange?.();
          router.push(`/raffle?draw=${e.target.value}`);
        }}
        className="h-[48px] w-full cursor-pointer appearance-none rounded-[8px] border border-line bg-white pl-[16px] pr-[40px] text-[14px] text-ink outline-none focus:border-accent"
      >
        {draws.map((d) => (
          <option key={d.id} value={d.type}>
            {d.name} · ${d.prize_amount.toLocaleString("en-US")}
            {d.status === "done" ? " · done" : d.status === "locked" ? " · locked" : ""}
          </option>
        ))}
        <option value={TENEDGE_5K}>Tenedge 5k Challenge Account · 3 accounts</option>
      </select>
      <span className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 text-[9px] text-muted" aria-hidden>
        ▼
      </span>
    </label>
  );
}
