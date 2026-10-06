"use client";

import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ALIVE_MS, openDisplayChannel } from "@/lib/display-channel";
import { SHUFFLE_MS, type DisplayState } from "@/lib/display";
import type { ShowPayload } from "./actions";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STORAGE_KEY = "tentrade-display-state";

type DisplayLink = {
  connected: boolean;
  onScreen: DisplayState["kind"];
  play: (label: string, show: ShowPayload, countdownSeconds: number) => Promise<void>;
  reveal: (label: string, show: ShowPayload) => void;
  blank: () => void;
};

const DisplayLinkContext = createContext<DisplayLink | null>(null);

export function useDisplayLink(): DisplayLink {
  const link = useContext(DisplayLinkContext);
  if (!link) throw new Error("useDisplayLink must be used inside DisplayLinkProvider");
  return link;
}

// Raffle page side of the projector link. Lives in the Raffle layout so it
// survives switching draws. Remembers the current screen for this tab.
export function DisplayLinkProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [onScreen, setOnScreen] = useState<DisplayState["kind"]>("waiting");
  const channel = useRef<ReturnType<typeof openDisplayChannel>>(null);
  const current = useRef<DisplayState>({ kind: "waiting" });
  const lastAlive = useRef(0);
  const showId = useRef(0); // Blank (or a newer show) stops older shows

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      // A show interrupted by leaving the page is treated as finished.
      if (saved) {
        const s = JSON.parse(saved) as DisplayState;
        current.current =
          s.kind === "shuffling"
            ? { kind: "winner", label: s.label, clientId: s.winner.clientId, name: s.winner.name }
            : s.kind === "countdown"
              ? { kind: "waiting" }
              : s;
        setOnScreen(current.current.kind);
      }
    } catch {
      // Storage unavailable: start from the waiting screen.
    }

    channel.current = openDisplayChannel((m) => {
      if (m.type === "alive" || m.type === "hello") {
        lastAlive.current = Date.now();
        setConnected(true);
      }
      // A reloaded display catches up, except mid-countdown/shuffle: the next
      // state arrives within seconds, and replaying would desync the timing.
      if (m.type === "hello" && current.current.kind !== "countdown" && current.current.kind !== "shuffling") {
        channel.current?.post({ type: "state", state: current.current });
      }
    });
    const check = setInterval(() => setConnected(Date.now() - lastAlive.current < ALIVE_MS * 2.5), 1000);
    return () => {
      clearInterval(check);
      channel.current?.close();
    };
  }, []);

  const send = useCallback((state: DisplayState) => {
    current.current = state;
    setOnScreen(state.kind);
    channel.current?.post({ type: "state", state });
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Not critical: only used to resume after leaving the page.
    }
  }, []);

  // Countdown → shuffle → winner. The winner is already saved on the server.
  const play = useCallback(
    async (label: string, show: ShowPayload, countdownSeconds: number) => {
      const id = ++showId.current;
      const still = () => id === showId.current;
      if (countdownSeconds > 0) {
        send({ kind: "countdown", label, seconds: countdownSeconds });
        await sleep(countdownSeconds * 1000);
      }
      if (!still()) return;
      send({ kind: "shuffling", label, pool: show.pool, winner: show.winner });
      await sleep(SHUFFLE_MS + 600);
      if (!still()) return;
      send({ kind: "winner", label, clientId: show.winner.clientId, name: show.winner.name });
    },
    [send],
  );

  // Knowledge Challenge: straight to the Winner screen (no countdown or shuffle).
  const reveal = useCallback(
    (label: string, show: ShowPayload) => {
      showId.current++;
      send({ kind: "winner", label, clientId: show.winner.clientId, name: show.winner.name });
    },
    [send],
  );

  const blank = useCallback(() => {
    showId.current++;
    send({ kind: "waiting" });
  }, [send]);

  const value = useMemo(() => ({ connected, onScreen, play, reveal, blank }), [connected, onScreen, play, reveal, blank]);
  // The callbacks read refs only when called from click handlers, never during render.
  // eslint-disable-next-line react-hooks/refs
  return createElement(DisplayLinkContext.Provider, { value }, children);
}
