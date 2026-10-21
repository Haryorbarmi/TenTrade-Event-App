"use client";

import { useState } from "react";
import { TENEDGE_5K } from "@/lib/raffle-labels";
import { DrawSelect, type DrawOption } from "./draw-select";
import { DisplayControls } from "./display-controls";
import { useDisplayLink } from "./use-display-link";

const LABEL = "Tenedge 5k Account";
const ACCOUNTS = 3;
const CLIENT_ID = /^\d{6}$/;

type Slot = { clientId: string; name: string };

// Display only: the winners are chosen outside the app. Nothing here is saved, and it
// does not touch the draws, the winners table or the one-prize rule. Whatever is
// typed goes straight to the projector's Winner screen.
export function Tenedge5k({ draws }: { draws: DrawOption[] }) {
  const display = useDisplayLink();
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: ACCOUNTS }, () => ({ clientId: "", name: "" })));

  function edit(i: number, change: Partial<Slot>) {
    setSlots((s) => s.map((slot, j) => (j === i ? { ...slot, ...change } : slot)));
  }

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex w-full flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-heading text-[30px] leading-[normal] text-ink">Raffle</h1>
          <p className="text-[14px] font-light leading-[normal] text-muted">Pick the draw, lock the eligible list, then draw.</p>
        </div>
        <DisplayControls showing={false} />
      </header>

      <div className="flex w-full flex-col items-start gap-[24px] lg:flex-row">
        <section className="flex w-full flex-col items-start gap-[20px] rounded-[12px] border border-line bg-white p-6 md:p-[32px] lg:w-[400px] lg:shrink-0">
          <h2 className="text-[16px] font-semibold leading-[normal] text-ink">1. Choose the draw</h2>
          <DrawSelect draws={draws} value={TENEDGE_5K} />
          <p className="text-[12px] font-light leading-[1.5] text-muted">
            The three winners are chosen outside the app. Type each Client ID and name below to show them on the projector. Nothing
            is saved here.
          </p>
        </section>

        <section className="flex w-full flex-col items-start gap-[16px] rounded-[12px] border border-line bg-white p-6 md:p-[32px]">
          <h2 className="text-[16px] font-semibold leading-[normal] text-ink">2. Winners to show</h2>
          {slots.map((slot, i) => {
            const ready = CLIENT_ID.test(slot.clientId) && slot.name.trim() !== "";
            return (
              <form
                key={i}
                className="flex w-full flex-col gap-[10px] md:flex-row md:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (ready && display.connected) display.reveal(LABEL, { complete: true, pool: [], winner: { clientId: slot.clientId, name: slot.name.trim() } });
                }}
              >
                <label className="flex flex-col gap-[6px] md:w-[160px]">
                  <span className="text-[13px] font-semibold text-ink">Client ID {i + 1}</span>
                  <input
                    value={slot.clientId}
                    onChange={(e) => edit(i, { clientId: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="6 digits"
                    className="h-[44px] rounded-[8px] border border-line px-[14px] text-[14px] text-ink outline-none focus:border-accent"
                  />
                </label>
                <label className="flex flex-1 flex-col gap-[6px]">
                  <span className="text-[13px] font-semibold text-ink">Name</span>
                  <input
                    value={slot.name}
                    onChange={(e) => edit(i, { name: e.target.value })}
                    autoComplete="off"
                    className="h-[44px] rounded-[8px] border border-line px-[14px] text-[14px] text-ink outline-none focus:border-accent"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!ready || !display.connected}
                  title={display.connected ? undefined : "Open the display screen first"}
                  className="h-[44px] shrink-0 rounded-[8px] bg-ink px-[20px] text-[14px] font-semibold text-white disabled:opacity-40"
                >
                  Show on screen
                </button>
              </form>
            );
          })}
        </section>
      </div>
    </div>
  );
}
