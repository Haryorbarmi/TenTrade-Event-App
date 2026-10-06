// Lock/draw checks against the real Supabase project. Skipped by `npm test`;
// run with `npm run test:raffle-db`. Only runs while no draw has started, and
// puts everything back afterwards.
import { readFileSync } from "node:fs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drawWinner, lockDraw, replaceWinner, unlockDraw, type Draw } from "./raffle";

// Keys are only present when started with --env-file (npm run test:raffle-db).
const RUN = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
vi.setConfig({ testTimeout: 30_000 }); // every step is a round trip to Supabase
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function password(email: string) {
  const line = readFileSync("user-passwords.txt", "utf8").split("\n").find((l) => l.includes(email))!;
  return line.trim().split(/\s+/).at(-1)!;
}
async function signIn(email: string) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: password(email) });
  if (error) throw error;
  return { db: c, id: data.user.id };
}

describe.skipIf(!RUN)("raffle against the real database", () => {
  let admin: SupabaseClient;
  let boss: { db: SupabaseClient; id: string };
  let desk: { db: SupabaseClient; id: string };
  let draws: Record<Draw["type"], Draw>;
  const test: Record<string, string> = {}; // client_id -> attendee id
  const started = new Date().toISOString();

  beforeAll(async () => {
    admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const [{ count: winners }, { data: d }] = await Promise.all([
      admin.from("winners").select("*", { count: "exact", head: true }),
      admin.from("draws").select("*"),
    ]);
    if (winners !== 0 || d!.some((x) => x.status !== "open")) {
      throw new Error("Draws have already started; refusing to touch real raffle data.");
    }
    draws = Object.fromEntries(d!.map((x) => [x.type, x])) as typeof draws;

    boss = await signIn("ayobami@tentrade.com");
    desk = await signIn("eniolao@tentrade.com");
    // 8 test attendees; T1-T4 eligible for the Grand Draw.
    for (let i = 1; i <= 8; i++) {
      const { data, error } = await boss.db
        .from("attendees")
        .insert({
          client_id: `DRAWTEST-${i}`,
          name: `Draw Test ${i}`,
          email: `drawtest${i}@example.com`,
          phone: "+2348031234567",
          eligible: i <= 4,
          tickets: i <= 4 ? i : 0,
        })
        .select("id")
        .single();
      if (error) throw error;
      test[`DRAWTEST-${i}`] = data.id;
    }
  }, 30_000);

  afterAll(async () => {
    if (!admin || !draws) return;
    const testIds = Object.values(test);
    const drawIds = Object.values(draws).map((d) => d.id);
    const steps = [
      await admin.from("winners").delete().in("draw_id", drawIds),
      await admin.from("participants").delete().in("attendee_id", testIds),
      await admin.from("draws").update({ status: "open", pool_snapshot: null, locked_by: null, locked_at: null }).in("id", drawIds),
    ];
    for (const s of steps) if (s.error) console.error("CLEANUP FAILED:", s.error.message);
    await admin.from("activity_log").delete().gte("at", started).in("action", ["draw_locked", "draw_unlocked", "winner_drawn", "winner_replaced"]);
    for (const id of testIds) await admin.from("activity_log").delete().eq("detail->>attendee_id", id);
    await admin.from("attendees").delete().like("client_id", "DRAWTEST-%");
    await Promise.all([boss?.db.auth.signOut(), desk?.db.auth.signOut()]);
  }, 30_000);

  it("refuses to draw before the list is locked", async () => {
    const r = await drawWinner(boss.db, admin, boss.id, draws.lucky.id);
    expect(r).toEqual({ ok: false, error: "Lock the list before drawing." });
  });

  it("a registrar cannot lock, unlock or draw (RLS hides the draw)", async () => {
    expect((await lockDraw(desk.db, admin, desk.id, draws.lucky.id)).ok).toBe(false);
    expect((await drawWinner(desk.db, admin, desk.id, draws.lucky.id)).ok).toBe(false);
    const { data } = await admin.from("draws").select("status").eq("id", draws.lucky.id).single();
    expect(data!.status).toBe("open");
  });

  it("locks the Grand Draw: eligible test clients in, weighted by tickets; second lock refused", async () => {
    const r = await lockDraw(boss.db, admin, boss.id, draws.grand.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const t3 = r.value.entries.find((e) => e.client_id === "DRAWTEST-3");
    expect(t3?.weight).toBe(3);
    expect(r.value.entries.some((e) => e.client_id === "DRAWTEST-5")).toBe(false);

    const { data } = await admin.from("draws").select("status, locked_by, locked_at").eq("id", draws.grand.id).single();
    expect(data).toMatchObject({ status: "locked", locked_by: boss.id });
    expect(data!.locked_at).toBeTruthy();
    expect(await lockDraw(boss.db, admin, boss.id, draws.grand.id)).toEqual({ ok: false, error: "This list is already locked." });
  });

  it("unlock reopens the list and is logged", async () => {
    await lockDraw(boss.db, admin, boss.id, draws.knowledge.id, { tiedClientIds: ["DRAWTEST-6", "DRAWTEST-7"] });
    expect((await unlockDraw(boss.db, admin, boss.id, draws.knowledge.id)).ok).toBe(true);
    const { data } = await admin.from("draws").select("status, pool_snapshot").eq("id", draws.knowledge.id).single();
    expect(data).toEqual({ status: "open", pool_snapshot: null });
    const { count } = await admin.from("activity_log").select("*", { count: "exact", head: true }).eq("action", "draw_unlocked").gte("at", started);
    expect(count).toBe(1);
  });

  it("Lucky Attendee: draws the forced entry, saves audit values, completes the draw", async () => {
    const lock = await lockDraw(boss.db, admin, boss.id, draws.lucky.id);
    if (!lock.ok) throw new Error(lock.error);
    const index = lock.value.entries.findIndex((e) => e.client_id === "DRAWTEST-1");
    const r = await drawWinner(boss.db, admin, boss.id, draws.lucky.id, () => index);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.winner).toMatchObject({ attendee_id: test["DRAWTEST-1"], position: 1, random_value: index });
    expect(r.value.winner.pool_size).toBe(lock.value.entries.length);
    expect(r.value.complete).toBe(true);
    expect(await drawWinner(boss.db, admin, boss.id, draws.lucky.id)).toEqual({ ok: false, error: "This draw is complete." });
  });

  it("one prize per attendee: the Grand Draw (locked earlier) skips the Lucky winner", async () => {
    const { data: g } = await admin.from("draws").select("pool_snapshot").eq("id", draws.grand.id).single();
    const snapshot = g!.pool_snapshot as { entries: { attendee_id: string; weight: number }[]; total: number };
    expect(snapshot.entries.some((e) => e.attendee_id === test["DRAWTEST-1"])).toBe(true); // still in the snapshot...

    const r = await drawWinner(boss.db, admin, boss.id, draws.grand.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.winner.attendee_id).not.toBe(test["DRAWTEST-1"]); // ...but can never win
    expect(r.value.winner.pool_size).toBe(snapshot.entries.length - 1);
    expect(r.value.winner.total_tickets).toBe(snapshot.total - 1); // T1 had 1 ticket
  });

  it("double-click: two simultaneous draws on Early Bird produce exactly one winner", async () => {
    const lock = await lockDraw(boss.db, admin, boss.id, draws.early_bird.id);
    expect(lock.ok).toBe(true);
    const results = await Promise.all([
      drawWinner(boss.db, admin, boss.id, draws.early_bird.id),
      drawWinner(boss.db, admin, boss.id, draws.early_bird.id),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const { count } = await admin.from("winners").select("*", { count: "exact", head: true }).eq("draw_id", draws.early_bird.id);
    expect(count).toBe(1);
  });

  it("Event Engagement: 5 different winners one at a time, then complete", async () => {
    const tagged = ["DRAWTEST-2", "DRAWTEST-3", "DRAWTEST-4", "DRAWTEST-5", "DRAWTEST-6", "DRAWTEST-7", "DRAWTEST-8"];
    const { error } = await boss.db.from("participants").insert(tagged.map((c) => ({ attendee_id: test[c] })));
    expect(error).toBeNull();
    expect((await lockDraw(boss.db, admin, boss.id, draws.engagement.id)).ok).toBe(true);

    const winners: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = await drawWinner(boss.db, admin, boss.id, draws.engagement.id);
      if (!r.ok) throw new Error(r.error);
      expect(r.value.winner.position).toBe(i);
      expect(r.value.complete).toBe(i === 5);
      winners.push(r.value.winner.attendee_id);
    }
    expect(new Set(winners).size).toBe(5);
    expect((await drawWinner(boss.db, admin, boss.id, draws.engagement.id)).ok).toBe(false);
  });

  it("redraw (absent): slot reopens, new winner fills the same position, absent person is out of later draws", async () => {
    const { data: before } = await admin
      .from("winners")
      .select("id, attendee_id")
      .eq("draw_id", draws.engagement.id)
      .eq("position", 2)
      .eq("replaced", false)
      .single();
    const absentId = before!.attendee_id;

    expect((await replaceWinner(desk.db, admin, desk.id, before!.id, "absent", "")).ok).toBe(false); // registrar
    expect((await replaceWinner(boss.db, admin, boss.id, before!.id, "absent", "Not in the hall")).ok).toBe(true);
    expect((await replaceWinner(boss.db, admin, boss.id, before!.id, "absent", "")).ok).toBe(false); // twice

    const { data: kept } = await admin.from("winners").select("replaced, replace_kind, replaced_reason").eq("id", before!.id).single();
    expect(kept).toEqual({ replaced: true, replace_kind: "absent", replaced_reason: "Not in the hall" }); // never deleted
    const { data: d } = await admin.from("draws").select("status").eq("id", draws.engagement.id).single();
    expect(d!.status).toBe("locked");

    const r = await drawWinner(boss.db, admin, boss.id, draws.engagement.id);
    if (!r.ok) throw new Error(r.error);
    expect(r.value.winner.position).toBe(2);
    expect(r.value.winner.attendee_id).not.toBe(absentId);
    expect(r.value.complete).toBe(true);

    // The absent person cannot come back, even in a draw they would qualify for.
    const absentClient = Object.entries(test).find(([, id]) => id === absentId)![0];
    const lock = await lockDraw(boss.db, admin, boss.id, draws.knowledge.id, { tiedClientIds: [absentClient, "DRAWTEST-1"] });
    expect(lock.ok).toBe(false); // T1 already won Lucky, absent person excluded: nobody left
    if (!lock.ok) expect(lock.error).toMatch(/Nobody is in the pool/);
  });

  it("redraw (not eligible): only that win is cancelled, the person stays in later draws", async () => {
    const { data: grand } = await admin.from("winners").select("id, attendee_id").eq("draw_id", draws.grand.id).eq("replaced", false).single();
    expect((await replaceWinner(boss.db, admin, boss.id, grand!.id, "ineligible", "Tickets entered wrongly")).ok).toBe(true);

    const client = Object.entries(test).find(([, id]) => id === grand!.attendee_id)?.[0];
    if (!client) return; // the Grand winner was a real attendee, not a test one; nothing more to check
    const lock = await lockDraw(boss.db, admin, boss.id, draws.knowledge.id, { tiedClientIds: [client] });
    expect(lock.ok && lock.value.entries.map((e) => e.attendee_id)).toEqual([grand!.attendee_id]);
  });

  it("across all draws, nobody holds two prizes", async () => {
    const { data } = await admin.from("winners").select("attendee_id").eq("replaced", false);
    const ids = data!.map((w) => w.attendee_id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
