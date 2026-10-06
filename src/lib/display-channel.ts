"use client";

import type { DisplayState } from "./display";

// The Raffle page and the projector tab run in the same browser on one laptop
// (CLAUDE.md section 13, item 8) and talk over a BroadcastChannel: no network,
// so weak venue Wi-Fi cannot interrupt the show.

export type DisplayMessage =
  | { type: "state"; state: DisplayState } // Raffle page → display
  | { type: "hello" } // display just opened or reloaded: "what should I show?"
  | { type: "alive" }; // display heartbeat, every ALIVE_MS

export const ALIVE_MS = 2000;
const NAME = "tentrade-lagos-2026-display";

export function openDisplayChannel(onMessage: (m: DisplayMessage) => void) {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(NAME);
  channel.onmessage = (e: MessageEvent<DisplayMessage>) => onMessage(e.data);
  return {
    post: (m: DisplayMessage) => channel.postMessage(m),
    close: () => channel.close(),
  };
}
