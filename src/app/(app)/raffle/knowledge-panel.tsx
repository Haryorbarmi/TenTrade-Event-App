"use client";

/* eslint-disable @next/next/no-img-element -- status dot SVGs from Figma */
import { useState } from "react";
import type { QuizCandidate } from "@/lib/raffle";
import { lookupQuizWinner } from "./actions";

// Figma: Raffle · Knowledge Challenge (4007:1452). Used while the draw is open;
// once tied clients are locked, the page falls back to the normal lock/draw UI.

export type QuizState = ReturnType<typeof useQuiz>;

export function useQuiz() {
  const [mode, setMode] = useState<"single" | "tie">("single");
  const [input, setInput] = useState("");
  const [candidate, setCandidate] = useState<QuizCandidate | null>(null);
  const [tied, setTied] = useState<QuizCandidate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function lookUp() {
    const id = input.trim();
    if (!id) return;
    setBusy(true);
    const r = await lookupQuizWinner(id);
    setBusy(false);
    setMessage(r.ok ? null : r.error);
    if (mode === "single") {
      setCandidate(r.ok ? r.value : null);
    } else if (r.ok) {
      if (!r.value.canWin) setMessage(`${r.value.name} (${r.value.client_id}): ${r.value.reason}.`);
      else if (tied.some((t) => t.client_id === r.value.client_id)) setMessage(`${r.value.name} is already in the tie.`);
      else {
        setTied((t) => [...t, r.value]);
        setInput("");
      }
    }
  }

  function switchMode(next: "single" | "tie") {
    setMode(next);
    setInput("");
    setCandidate(null);
    setMessage(null);
  }

  return { mode, switchMode, input, setInput, candidate, setCandidate, tied, setTied, message, busy, lookUp };
}

export function QuizResultSetup({
  quiz,
  pending,
  onLockTie,
}: {
  quiz: QuizState;
  pending: boolean;
  onLockTie: (clientIds: string[]) => void;
}) {
  const { mode, input, setInput, candidate, setCandidate, tied, setTied, message, busy, lookUp } = quiz;
  const done = mode === "single" && !!candidate;

  return (
    <div className="flex w-full flex-col gap-[12px]">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="flex items-center gap-[8px]">
          <img alt="" width={10} height={10} className="block size-[10px]" src={done ? "/brand/dot-locked.svg" : "/brand/dot-not-eligible.svg"} />
          <div className="flex flex-col gap-[2px] leading-[normal]">
            <span className="text-[14px] font-semibold text-ink">
              {mode === "tie" ? "Tie at the top score" : done ? "Quiz finished" : "Waiting for the result"}
            </span>
            <span className="text-[12px] font-light text-muted">
              {mode === "tie"
                ? `${tied.length} tied client${tied.length === 1 ? "" : "s"} added`
                : done
                  ? `Top scorer: ${candidate!.client_id}`
                  : "Enter the top scorer's Client ID."}
            </span>
          </div>
        </div>
        {done && (
          <button
            type="button"
            onClick={() => setCandidate(null)}
            className="flex h-[36px] shrink-0 items-center justify-center rounded-[8px] border border-line bg-white px-[20px] text-[14px] text-ink hover:border-ink"
          >
            Edit
          </button>
        )}
      </div>

      {!done && (
        <form
          className="flex w-full items-center gap-[8px]"
          onSubmit={(e) => {
            e.preventDefault();
            void lookUp();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "tie" ? "Tied client's ID" : "Top scorer's Client ID"}
            aria-label={mode === "tie" ? "Tied client's Client ID" : "Top scorer's Client ID"}
            autoComplete="off"
            className="h-[44px] min-w-px flex-1 rounded-[8px] border border-line bg-white px-[14px] text-[14px] font-light text-ink outline-none placeholder:text-[rgba(115,115,115,0.9)] focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="bg-accent-gradient flex h-[44px] shrink-0 items-center justify-center rounded-[8px] px-[16px] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            {mode === "tie" ? "Add" : "Look up"}
          </button>
        </form>
      )}
      {message && <p role="alert" className="text-[12px] leading-[normal] text-[#c81e1e]">{message}</p>}

      {mode === "tie" && (
        <>
          {tied.length > 0 && (
            <ul className="flex flex-wrap gap-[8px]">
              {tied.map((t) => (
                <li key={t.client_id} title={t.name} className="flex items-center gap-[6px] rounded-full bg-surface px-[10px] py-[5px] text-[12px] leading-[normal]">
                  <span className="font-light text-ink">{t.client_id}</span>
                  <button
                    type="button"
                    onClick={() => setTied((all) => all.filter((x) => x.client_id !== t.client_id))}
                    aria-label={`Remove ${t.name}`}
                    className="text-muted hover:text-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            disabled={pending || tied.length < 2}
            onClick={() => onLockTie(tied.map((t) => t.client_id))}
            className="bg-accent-gradient flex h-[40px] w-full items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-50"
          >
            Lock the {tied.length >= 2 ? tied.length : ""} tied clients
          </button>
          <p className="text-[12px] font-light leading-[normal] text-muted">Add at least 2. Once locked, one is drawn at random.</p>
        </>
      )}
    </div>
  );
}

export function QuizStage({
  quiz,
  drawName,
  pending,
  onConfirm,
}: {
  quiz: QuizState;
  drawName: string;
  pending: boolean;
  onConfirm: (clientId: string) => void;
}) {
  const { mode, candidate, switchMode } = quiz;
  const tie = mode === "tie";

  return (
    <section className="flex w-full flex-col items-center gap-[16px] rounded-[12px] bg-ink px-6 py-[36px] text-center md:px-[32px]">
      <p className="text-[14px] leading-[normal] text-accent-from">
        {drawName} · {tie ? "add the tied clients" : "record the winner"}
      </p>
      <p className="font-heading text-[48px] leading-[normal] text-white/90 md:text-[72px]" aria-live="polite">
        {!tie && candidate ? candidate.client_id : "- - - - -"}
      </p>
      {!tie && candidate && (
        <p className={`-mt-[8px] text-[14px] font-light leading-[normal] ${candidate.canWin ? "text-white/70" : "text-accent-from"}`}>
          {candidate.name} · {candidate.canWin ? "Eligible to win" : candidate.reason}
        </p>
      )}
      {!tie && (
        <button
          type="button"
          disabled={pending || !candidate?.canWin}
          onClick={() => candidate && onConfirm(candidate.client_id)}
          className="bg-accent-gradient flex h-[52px] w-full max-w-[300px] items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-40"
        >
          {pending ? "Saving…" : "Confirm winner"}
        </button>
      )}
      <button
        type="button"
        onClick={() => switchMode(tie ? "single" : "tie")}
        className="rounded-[8px] border border-white/30 px-[16px] py-[10px] text-[13px] leading-[normal] text-white hover:border-white/60"
      >
        {tie ? "No tie? Record a single winner" : "Tied at the top score? Draw among the tied clients"}
      </button>
    </section>
  );
}
