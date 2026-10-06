"use client";

/* eslint-disable @next/next/no-img-element -- fixed-size SVG assets from Figma */
import { useEffect, useMemo, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { ALIVE_MS, openDisplayChannel } from "@/lib/display-channel";
import {
  SHUFFLE_MS,
  SHUFFLE_TICK_MS,
  expandPool,
  practiceState,
  shuffleFrame,
  type DisplayState,
} from "@/lib/display";

const W = 1280;
const H = 720;

// Figma: Raffle display screen (projector) (3953:135), four 1280×720 frames.
// Built at the design size and scaled to fill whatever screen it is on.
export function DisplayScreen({ practice, freezeStep }: { practice: boolean; freezeStep: number | null }) {
  const [state, setState] = useState<DisplayState>({ kind: "waiting" });

  usePracticeLoop(practice, freezeStep, setState);
  useRaffleLink(!practice, setState);

  return (
    <main className="fixed inset-0 overflow-hidden bg-ink">
      <ScaledFrame>
        <Stage key={stateKey(state)} state={state} />
      </ScaledFrame>
      <FullscreenButton />
      {practice && (
        <p className="pointer-events-none fixed bottom-3 right-4 text-[12px] tracking-[2px] text-white/30">PRACTICE MODE · NOTHING IS RECORDED</p>
      )}
    </main>
  );
}

// A new key restarts the state's timers (countdown, shuffle) whenever a new state arrives.
let keyCounter = 0;
const keys = new WeakMap<DisplayState, number>();
function stateKey(state: DisplayState) {
  if (!keys.has(state)) keys.set(state, ++keyCounter);
  return keys.get(state);
}

// Live: show whatever the Raffle page sends. If the Raffle page goes away, the
// last screen simply stays up. A reloaded display asks for the current screen.
function useRaffleLink(enabled: boolean, setState: (s: DisplayState) => void) {
  useEffect(() => {
    if (!enabled) return;
    const channel = openDisplayChannel((m) => {
      if (m.type === "state") setState(m.state);
    });
    if (!channel) return;
    channel.post({ type: "hello" });
    const alive = setInterval(() => channel.post({ type: "alive" }), ALIVE_MS);
    return () => {
      clearInterval(alive);
      channel.close();
    };
  }, [enabled, setState]);
}

// Practice: cycles through all four states with fake IDs; nothing is sent or saved.
const PRACTICE_STEP_MS = [3000, 5300, SHUFFLE_MS + 600, 4500];
function usePracticeLoop(practice: boolean, freezeStep: number | null, setState: (s: DisplayState) => void) {
  useEffect(() => {
    if (!practice) return;
    if (freezeStep !== null) {
      setState(practiceState(freezeStep));
      return;
    }
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      setState(practiceState(step));
      timer = setTimeout(next, PRACTICE_STEP_MS[step % 4]);
      step++;
    };
    next();
    return () => clearTimeout(timer);
  }, [practice, freezeStep, setState]);
}

function ScaledFrame({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / W, window.innerHeight / H));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{ width: W, height: H, transform: `translate(-50%, -50%) scale(${scale})` }}
    >
      {children}
    </div>
  );
}

function Stage({ state }: { state: DisplayState }) {
  // The shuffle ends by revealing the winner it carried, even if the
  // connection drops before the admin screen sends anything else.
  const [revealed, setRevealed] = useState(false);
  const shown: DisplayState =
    state.kind === "shuffling" && revealed
      ? { kind: "winner", label: state.label, clientId: state.winner.clientId, name: state.winner.name }
      : state;

  return (
    <div className="relative flex size-full flex-col items-center justify-center bg-ink text-center">
      {shown.kind === "winner" && (
        <div className="pointer-events-none absolute left-[320px] top-[150px] h-[420px] w-[640px]" aria-hidden>
          <div className="absolute inset-[-33.33%_-21.88%]">
            <img alt="" className="block size-full max-w-none" src="/brand/winner-glow.svg" />
          </div>
        </div>
      )}
      <div className="absolute left-[56px] top-[48px]">
        <Logo size="md" />
      </div>

      {shown.kind === "waiting" && <Waiting />}
      {shown.kind === "countdown" && <Countdown label={shown.label} seconds={shown.seconds} />}
      {shown.kind === "shuffling" && <Shuffling state={shown} onDone={() => setRevealed(true)} />}
      {shown.kind === "winner" && <Winner label={shown.label} clientId={shown.clientId} name={shown.name} />}
    </div>
  );
}

const kicker = "text-[22px] leading-[normal] tracking-[3.3px] text-accent-from uppercase";

// Figma: Display · 1 Waiting (3953:136)
function Waiting() {
  return (
    <div className="relative flex flex-col items-center gap-[24px]">
      <p className={kicker}>Lagos Seminar 2026</p>
      <p className="font-heading text-[84px] leading-[normal] text-white">Raffle starting soon</p>
      <p className="text-[22px] font-light leading-[normal] text-white/60">Please stay seated. The draw begins shortly.</p>
    </div>
  );
}

// Figma: Display · 2 Countdown (3954:148)
const RING_R = 185;
const RING_C = 2 * Math.PI * RING_R;
function Countdown({ label, seconds }: { label: string; seconds: number }) {
  const [left, setLeft] = useState(seconds * 1000);
  useEffect(() => {
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const remaining = Math.max(0, seconds * 1000 - (now - start));
      setLeft(remaining);
      if (remaining > 0) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [seconds]);

  const fraction = seconds > 0 ? left / (seconds * 1000) : 0;
  return (
    <div className="relative flex flex-col items-center gap-[32px]">
      <p className={kicker}>{label} · Starts in</p>
      <div className="relative size-[380px]">
        <img alt="" width={380} height={380} className="absolute inset-0 block size-[380px]" src="/brand/countdown-track.svg" />
        {/* The shrinking arc: same 10px stroke and gradient as the Figma ring, animated. */}
        <svg width={380} height={380} viewBox="0 0 380 380" className="absolute inset-0 -rotate-90" aria-hidden>
          <defs>
            <linearGradient id="countdown-gradient" x1="0" y1="190" x2="380" y2="190" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F66584" />
              <stop offset="1" stopColor="#D925C8" />
            </linearGradient>
          </defs>
          <circle
            cx="190"
            cy="190"
            r={RING_R}
            fill="none"
            stroke="url(#countdown-gradient)"
            strokeWidth={10}
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - fraction)}
          />
        </svg>
        <p className="absolute inset-0 flex items-center justify-center font-heading text-[200px] leading-none text-white" aria-live="polite">
          {Math.ceil(left / 1000)}
        </p>
      </div>
      <p className="text-[22px] font-light leading-[normal] text-white/60">Get ready...</p>
    </div>
  );
}

// Figma: Display · 3 Shuffling (3953:171). One Client ID in digit boxes; the
// whole ID changes in place (nothing scrolls), then settles on the winner.
function Shuffling({ state, onDone }: { state: Extract<DisplayState, { kind: "shuffling" }>; onDone: () => void }) {
  const ids = useMemo(() => expandPool(state.pool), [state.pool]);
  const winner = state.winner.clientId;
  const [chars, setChars] = useState(() => shuffleFrame(ids, winner, 0));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const start = performance.now();
    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      setChars(shuffleFrame(ids, winner, elapsed));
      if (elapsed >= SHUFFLE_MS + 500) {
        clearInterval(timer);
        done.current();
      }
    }, SHUFFLE_TICK_MS);
    return () => clearInterval(timer);
  }, [ids, winner]);

  // Long IDs shrink so every box still fits the 1280px frame.
  const n = chars.length;
  const box = Math.min(150, Math.floor((1160 - 20 * (n - 1)) / n));
  return (
    <div className="relative flex flex-col items-center gap-[40px]">
      <p className={kicker}>{state.label} · Drawing</p>
      <div className="flex gap-[20px]" aria-label="Choosing a winner">
        {chars.map((c, i) => (
          <div
            key={i}
            className="flex items-center justify-center overflow-clip rounded-[18px] border-2 border-white/14 bg-white/6"
            style={{ width: box, height: Math.round(box * 1.4) }}
          >
            <span className="font-heading leading-none text-white" style={{ fontSize: box }}>
              {c}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[22px] font-light leading-[normal] text-white/50">Choosing a winner...</p>
    </div>
  );
}

// Figma: Display · 4 Winner (3953:209). Client ID and name only, never email or phone.
function Winner({ label, clientId, name }: { label: string; clientId: string; name: string }) {
  const idSize = Math.min(190, Math.floor(1150 / Math.max(1, clientId.length * 0.62)));
  return (
    <div className="relative flex flex-col items-center gap-[24px]">
      <p className="text-[24px] uppercase leading-[normal] tracking-[3.6px] text-accent-from">Winner · {label}</p>
      <p
        className="bg-accent-gradient bg-clip-text font-heading leading-[normal] text-transparent"
        style={{ fontSize: idSize }}
      >
        {clientId}
      </p>
      <p className="max-w-[1180px] truncate text-[64px] font-semibold leading-[normal] text-white">{name}</p>
      <p className="text-[28px] font-light leading-[normal] text-white/85">Congratulations!</p>
    </div>
  );
}

// Appears when the mouse moves, hides after 3 s so the projector stays clean.
function FullscreenButton() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    let timer = setTimeout(() => setVisible(false), 3000);
    const show = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 3000);
    };
    window.addEventListener("mousemove", show);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousemove", show);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen())}
      className={`fixed right-4 top-4 rounded-[8px] border border-white/20 px-[14px] py-[8px] text-[13px] text-white/70 transition-opacity hover:text-white ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      Full screen
    </button>
  );
}
