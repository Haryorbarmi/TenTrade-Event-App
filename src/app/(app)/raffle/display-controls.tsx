"use client";

import { useEffect, useState } from "react";
import { useDisplayLink } from "./use-display-link";

const SCREEN_NAMES = { waiting: "Waiting screen", countdown: "Countdown", shuffling: "Drawing", winner: "Winner" } as const;

// Header controls: open the projector tab, see that it is listening, blank it.
export function DisplayControls({ showing }: { showing: boolean }) {
  const { connected, onScreen, blank } = useDisplayLink();

  return (
    <div className="flex flex-wrap items-center gap-[12px]">
      <span
        className={`inline-flex items-center gap-[6px] text-[12px] leading-[normal] ${connected ? "text-[#219e61]" : "text-muted"}`}
        title={connected ? "The projector tab is listening" : "Open the display screen in this browser"}
      >
        <span className={`size-[6px] rounded-full ${connected ? "bg-[#219e61]" : "bg-muted"}`} aria-hidden />
        {connected ? `Display connected · ${SCREEN_NAMES[onScreen]}` : "Display not connected"}
      </span>
      {connected && (
        <button
          type="button"
          onClick={blank}
          disabled={onScreen === "waiting" && !showing}
          title="Return the projector to the logo screen immediately"
          className="flex h-[44px] items-center justify-center rounded-[8px] border border-line bg-white px-[20px] text-[14px] text-ink hover:border-ink disabled:opacity-50"
        >
          Blank
        </button>
      )}
      <button
        type="button"
        // Same browser, new tab: drag it to the projector and press Full screen.
        onClick={() => window.open("/display", "tentrade-display")}
        className="flex h-[44px] items-center justify-center rounded-[8px] border border-line bg-white px-[20px] text-[14px] text-ink hover:border-ink"
      >
        Open display screen
      </button>
    </div>
  );
}

const STORAGE_KEY = "tentrade-countdown-seconds";
const DEFAULT_SECONDS = 10;

// Countdown length before each draw (owner decision: editable, default 10 s).
// Remembered on this laptop for convenience.
export function useCountdownSetting(): [number, (value: string) => void] {
  const [seconds, setSeconds] = useState(DEFAULT_SECONDS);

  // Read after hydration: the server cannot know this laptop's saved value.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = Number(raw);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
      if (raw !== null && Number.isInteger(saved) && saved >= 0 && saved <= 60) setSeconds(saved);
    } catch {
      // Storage unavailable: keep the default.
    }
  }, []);

  function update(value: string) {
    const n = Math.max(0, Math.min(60, Math.round(Number(value) || 0)));
    setSeconds(n);
    try {
      localStorage.setItem(STORAGE_KEY, String(n));
    } catch {
      // Not critical.
    }
  }
  return [seconds, update];
}
