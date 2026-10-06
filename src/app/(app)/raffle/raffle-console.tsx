"use client";

/* eslint-disable @next/next/no-img-element -- status dot SVGs from Figma */
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DrawType } from "@/lib/draw-engine";
import { formatLagosTime, shortName } from "@/lib/format";
import { confirmQuizResult, drawNextWinner, lockDrawList } from "./actions";
import { QuizResultSetup, QuizStage, useQuiz } from "./knowledge-panel";
import { ParticipantTags, type Participant } from "./participant-tags";
import { RedrawDialog, UnlockDialog } from "./raffle-dialogs";

export type DrawSummary = {
  id: string;
  type: DrawType;
  name: string;
  prize_amount: number;
  winners_count: number;
  status: "open" | "locked" | "done";
};
export type DrawDetail = DrawSummary & { locked_by: string | null; locked_at: string | null };

export type DrawWinnerRow = {
  id: string;
  attendee_id: string;
  position: number;
  pool_size: number;
  total_tickets: number;
  random_value: number;
  drawn_at: string;
  drawn_by: string;
  replaced: boolean;
  replace_kind: "absent" | "ineligible" | "other" | null;
  replaced_reason: string | null;
  attendee: { client_id: string; name: string; tickets: number } | null;
};

export type PoolStats = { people: number; entries: number; remaining: number };

const money = (n: number) => `$${n.toLocaleString("en-US")}`;
const REPLACE_LABELS = { absent: "Absent", ineligible: "Not eligible", other: "Other" } as const;

type Props = {
  draws: DrawSummary[];
  draw: DrawDetail;
  stats: PoolStats;
  winners: DrawWinnerRow[];
  names: Record<string, string>;
  earlyBirdCutoff: string | null;
  participants: Participant[];
};

// Figma: Raffle · Grand Draw (3952:194), Raffle · Early Bird (4007:1088) and variants.
export function RaffleConsole({ draws, draw, stats, winners, names, earlyBirdCutoff, participants }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [redrawing, setRedrawing] = useState<DrawWinnerRow | null>(null);

  const quiz = useQuiz();

  const current = winners.filter((w) => !w.replaced);
  const latest = current.at(-1);
  const weighted = draw.type === "grand";
  // Knowledge Challenge has its own "Quiz result" flow until a tie list is locked.
  const quizOpen = draw.type === "knowledge" && draw.status === "open";

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Something went wrong.");
      router.refresh();
    });
  }

  const stageLabel =
    draw.status === "open" ? "lock the list to draw" : draw.status === "locked" ? "ready to draw" : "complete";
  const drawLabel =
    draw.winners_count > 1
      ? `Draw winner ${Math.min(current.length + 1, draw.winners_count)} of ${draw.winners_count}`
      : "Draw winner";

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex w-full flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-heading text-[30px] leading-[normal] text-ink">Raffle</h1>
          <p className="text-[14px] font-light leading-[normal] text-muted">Pick the draw, lock the eligible list, then draw.</p>
        </div>
        <button
          type="button"
          disabled
          title="The projector display is built in Phase 4."
          className="flex h-[44px] items-center justify-center rounded-[8px] border border-line bg-white px-[20px] text-[14px] text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Open display screen
        </button>
      </header>

      <div className="flex w-full flex-col items-start gap-[24px] lg:flex-row">
        {/* Setup */}
        <section className="flex w-full flex-col items-start gap-[20px] rounded-[12px] border border-line bg-white p-6 md:p-[32px] lg:w-[400px] lg:shrink-0">
          <h2 className="text-[16px] font-semibold leading-[normal] text-ink">1. Choose the draw</h2>
          <label className="relative w-full">
            <span className="sr-only">Draw</span>
            <select
              value={draw.type}
              onChange={(e) => {
                setError(null);
                router.push(`/raffle?draw=${e.target.value}`);
              }}
              className="h-[48px] w-full cursor-pointer appearance-none rounded-[8px] border border-line bg-white pl-[16px] pr-[40px] text-[14px] text-ink outline-none focus:border-accent"
            >
              {draws.map((d) => (
                <option key={d.id} value={d.type}>
                  {d.name} · {money(d.prize_amount)}
                  {d.status === "done" ? " · done" : d.status === "locked" ? " · locked" : ""}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-[16px] top-1/2 -translate-y-1/2 text-[9px] text-muted" aria-hidden>
              ▼
            </span>
          </label>

          <PoolSummary draw={draw} stats={stats} earlyBirdCutoff={earlyBirdCutoff} tagged={participants.length} />
          {draw.type === "engagement" && <ParticipantTags participants={participants} editable={draw.status === "open"} />}
          <p className="-mt-[8px] text-[12px] font-light leading-[normal] text-muted">
            Previous winners, and winners found absent, are left out of this draw automatically.
          </p>

          <div className="h-px w-full bg-line" />
          <h2 className="text-[16px] font-semibold leading-[normal] text-ink">
            {draw.type === "knowledge" ? "2. Quiz result" : "2. Lock the list"}
          </h2>
          {quizOpen ? (
            <QuizResultSetup quiz={quiz} pending={pending} onLockTie={(ids) => run(() => lockDrawList(draw.id, ids))} />
          ) : (
            <LockStatus
              draw={draw}
              lockedByName={names[draw.locked_by ?? ""]}
              canLock={!pending && stats.people > 0}
              pending={pending}
              onLock={() => run(() => lockDrawList(draw.id))}
              onUnlock={() => setUnlocking(true)}
            />
          )}

          <div className="h-px w-full bg-line" />
          <h2 className="text-[16px] font-semibold leading-[normal] text-ink">3. Prize</h2>
          <p className="flex h-[48px] w-full items-center rounded-[8px] border border-line bg-white px-[16px] text-[14px] font-light text-ink">
            {draw.winners_count > 1
              ? `${money(draw.prize_amount)} · ${draw.winners_count} winners × ${money(draw.prize_amount / draw.winners_count)}`
              : `${money(draw.prize_amount)} · 1 winner`}
          </p>
        </section>

        {/* Draw column */}
        <div className="flex w-full min-w-px flex-1 flex-col gap-[24px]">
          {quizOpen ? (
            <QuizStage
              quiz={quiz}
              drawName={draw.name}
              pending={pending}
              onConfirm={(clientId) => run(() => confirmQuizResult(draw.id, clientId))}
            />
          ) : (
            <section className="flex w-full flex-col items-center gap-[16px] rounded-[12px] bg-ink px-6 py-[36px] text-center md:px-[32px]">
              <p className="text-[14px] leading-[normal] text-accent-from">
                {draw.name} · {stageLabel}
              </p>
              <p className="font-heading text-[48px] leading-[normal] text-white/90 md:text-[72px]" aria-live="polite">
                {latest?.attendee?.client_id ?? "- - - - -"}
              </p>
              {latest?.attendee && <p className="-mt-[8px] text-[18px] font-semibold text-white">{latest.attendee.name}</p>}
              <button
                type="button"
                disabled={pending || draw.status !== "locked"}
                onClick={() => run(() => drawNextWinner(draw.id))}
                className="bg-accent-gradient flex h-[52px] w-full max-w-[300px] items-center justify-center rounded-[8px] text-[14px] font-semibold text-white disabled:opacity-40"
              >
                {pending ? "Drawing…" : drawLabel}
              </button>
              <div className="flex gap-[24px] text-[13px] leading-[normal]">
                <Stat label={weighted ? "Tickets" : "Pool"} value={weighted ? stats.entries : stats.people} />
                <Stat
                  label="Drawn"
                  value={draw.winners_count > 1 ? `${current.length} / ${draw.winners_count}` : current.length}
                />
                <Stat label="Remaining" value={stats.remaining} />
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="w-full rounded-[8px] bg-[#c81e1e]/10 px-[14px] py-[10px] text-[13px] text-ink">
              {error}
            </p>
          )}

          <WinnersTable
            winners={winners}
            names={names}
            weighted={weighted}
            winnersCount={draw.winners_count}
            emptyText={draw.type === "knowledge" ? "No winner yet. The winner appears here once confirmed." : undefined}
            onRedraw={setRedrawing}
            disabled={pending}
          />
        </div>
      </div>

      {unlocking && (
        <UnlockDialog
          drawName={draw.name}
          onCancel={() => setUnlocking(false)}
          onDone={(result) => {
            setUnlocking(false);
            if (!result.ok) setError(result.error);
            router.refresh();
          }}
          drawId={draw.id}
        />
      )}
      {redrawing && (
        <RedrawDialog
          winner={redrawing}
          drawName={draw.name}
          onCancel={() => setRedrawing(null)}
          onDone={(result) => {
            setRedrawing(null);
            if (!result.ok) setError(result.error);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function LockStatus({
  draw,
  lockedByName,
  canLock,
  pending,
  onLock,
  onUnlock,
}: {
  draw: DrawDetail;
  lockedByName: string | undefined;
  canLock: boolean;
  pending: boolean;
  onLock: () => void;
  onUnlock: () => void;
}) {
  const open = draw.status === "open";
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-[8px]">
        <img alt="" width={10} height={10} className="block size-[10px]" src={open ? "/brand/dot-not-eligible.svg" : "/brand/dot-locked.svg"} />
        <div className="flex flex-col gap-[2px] leading-[normal]">
          <span className="text-[14px] font-semibold text-ink">{open ? "Not locked" : "Locked"}</span>
          <span className="text-[12px] font-light text-muted">
            {open || !draw.locked_at
              ? "Preview the pool above, then lock it."
              : `${formatLagosTime(draw.locked_at)} · by ${shortName(lockedByName ?? "…")}`}
          </span>
        </div>
      </div>
      {open ? (
        <button
          type="button"
          disabled={!canLock}
          onClick={onLock}
          className="bg-accent-gradient flex h-[36px] shrink-0 items-center justify-center rounded-[8px] px-[20px] text-[14px] font-semibold text-white disabled:opacity-50"
        >
          Lock the list
        </button>
      ) : draw.status === "locked" ? (
        <button
          type="button"
          disabled={pending}
          onClick={onUnlock}
          className="flex h-[36px] shrink-0 items-center justify-center rounded-[8px] border border-line bg-white px-[20px] text-[14px] text-ink hover:border-ink"
        >
          Unlock
        </button>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="flex items-center gap-[6px]">
      <span className="font-light text-white/60">{label}</span>
      <span className="font-semibold text-white">{value}</span>
    </span>
  );
}

function PoolSummary({
  draw,
  stats,
  earlyBirdCutoff,
  tagged,
}: {
  draw: DrawDetail;
  stats: PoolStats;
  earlyBirdCutoff: string | null;
  tagged: number;
}) {
  const equal = (
    <span className="mt-[4px] self-start rounded-full bg-[rgba(115,115,115,0.12)] px-[10px] py-[4px] text-[12px] font-semibold text-muted">
      Equal chance for everyone
    </span>
  );
  const box = (title: string, detail: string, pill?: React.ReactNode) => (
    <div className="flex w-full flex-col gap-[4px] rounded-[8px] bg-surface p-[14px] leading-[normal]">
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      <p className="text-[13px] font-light text-muted">{detail}</p>
      {pill}
    </div>
  );
  const people = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

  switch (draw.type) {
    case "grand":
      return box(
        `${people(stats.people, "eligible attendee")} · ${people(stats.entries, "ticket")}`,
        "Weighted draw: each ticket is one more chance to win.",
      );
    case "early_bird":
      return box(
        "First 50 checked in",
        earlyBirdCutoff
          ? `Entries #1 to #50 · cutoff at ${formatLagosTime(earlyBirdCutoff)} · ${people(stats.people, "person")} in the pool`
          : `Entries #1 to #50 · ${people(stats.people, "person")} so far`,
        equal,
      );
    case "lucky":
      return box(`${people(stats.people, "attendee")} checked in`, "Everyone present can win.", equal);
    case "engagement":
      return box(
        `${people(draw.status === "open" ? tagged : stats.people, "participant")} ${draw.status === "open" ? "tagged" : "in the locked list"}`,
        `${draw.winners_count} winners will be drawn, one at a time`,
        equal,
      );
    case "knowledge":
      return draw.status === "locked"
        ? box(`${people(stats.people, "tied client")} locked`, "Tie at the top score: one is drawn at random.", equal)
        : box("Winner decided by the quiz", "Run the quiz in your quiz tool, then record the top scorer here.");
  }
}

function WinnersTable({
  winners,
  names,
  weighted,
  winnersCount,
  emptyText,
  onRedraw,
  disabled,
}: {
  winners: DrawWinnerRow[];
  names: Record<string, string>;
  weighted: boolean;
  winnersCount: number;
  emptyText?: string;
  onRedraw: (w: DrawWinnerRow) => void;
  disabled: boolean;
}) {
  const ordered = [...winners].sort((a, b) => a.position - b.position || a.drawn_at.localeCompare(b.drawn_at));
  return (
    <section className="w-full overflow-hidden rounded-[12px] border border-line bg-white">
      <h2 className="px-[24px] py-[20px] text-[16px] font-semibold leading-[normal] text-ink">Winners</h2>
      {ordered.length === 0 ? (
        <p className="px-[24px] pb-[24px] text-[14px] font-light leading-[normal] text-muted">
          {emptyText ??
            (winnersCount > 1
              ? `No winners yet. The ${winnersCount} winners appear here, one at a time.`
              : "No winners yet. Winners appear here after each draw.")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[14px] leading-[normal]">
            <thead className="bg-surface text-[12px] font-semibold text-muted">
              <tr className="h-[44px]">
                <th className="w-[56px] pl-[24px]">#</th>
                <th>Client ID</th>
                <th>Name</th>
                {weighted && <th>Tickets</th>}
                <th>Drawn</th>
                <th className="pr-[24px]" />
              </tr>
            </thead>
            <tbody>
              {ordered.map((w) => (
                <tr key={w.id} className={`border-t border-line ${w.replaced ? "text-muted" : "text-ink"}`}>
                  <td className="py-[14px] pl-[24px] font-semibold">{w.position}</td>
                  <td className={`font-light ${w.replaced ? "line-through" : ""}`}>{w.attendee?.client_id ?? "—"}</td>
                  <td>
                    <span className={w.replaced ? "line-through" : ""}>{w.attendee?.name ?? "—"}</span>
                    {w.replaced && w.replace_kind && (
                      <span className="block text-[12px] font-light">
                        Replaced · {REPLACE_LABELS[w.replace_kind]}
                        {w.replaced_reason ? `: ${w.replaced_reason}` : ""}
                      </span>
                    )}
                  </td>
                  {weighted && <td className="font-light">{w.attendee?.tickets ?? "—"}</td>}
                  <td className="whitespace-nowrap font-light">
                    {formatLagosTime(w.drawn_at)} · {shortName(names[w.drawn_by] ?? "…")}
                    <span className="block text-[12px] text-muted" title="Saved for the audit: entry number picked / total entries">
                      Entry {w.random_value + 1} of {w.total_tickets}
                    </span>
                  </td>
                  <td className="pr-[24px] text-right">
                    {!w.replaced && (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => onRedraw(w)}
                        className="rounded-[6px] px-[8px] py-[4px] text-[13px] text-accent hover:bg-accent/10 disabled:opacity-50"
                      >
                        Redraw
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
