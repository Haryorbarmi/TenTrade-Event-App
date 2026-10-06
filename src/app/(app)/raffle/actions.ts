"use server";

import { requireSuperAdmin } from "@/lib/auth";
import type { DisplayPoolEntry } from "@/lib/display";
import {
  confirmQuizWinner,
  drawWinner,
  lockDraw,
  lookupQuizCandidate,
  previewPool,
  replaceWinner,
  tagParticipant,
  unlockDraw,
  untagParticipant,
  type ReplaceKind,
} from "@/lib/raffle";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Every raffle action re-checks the role on the server (CLAUDE.md section 4):
// requireSuperAdmin throws for registrars, even when called directly.

export async function previewDrawPool(drawId: string, tiedClientIds?: string[]) {
  await requireSuperAdmin();
  const db = await createClient();
  const { data: draw } = await db.from("draws").select("type").eq("id", drawId).maybeSingle();
  if (!draw) return { ok: false as const, error: "Draw not found." };
  return previewPool(db, draw, { tiedClientIds });
}

export async function lockDrawList(drawId: string, tiedClientIds?: string[]) {
  const me = await requireSuperAdmin();
  return lockDraw(await createClient(), createAdminClient(), me.id, drawId, { tiedClientIds });
}

export async function unlockDrawList(drawId: string) {
  const me = await requireSuperAdmin();
  return unlockDraw(await createClient(), createAdminClient(), me.id, drawId);
}

export type ShowPayload = {
  complete: boolean;
  pool: DisplayPoolEntry[]; // Client IDs and weights the winner was drawn from
  winner: { clientId: string; name: string };
};

// The winner is chosen and saved before anything is shown. The browser then
// only gets what the projector needs: Client IDs, weights, the winner's name.
async function toShow(
  db: Awaited<ReturnType<typeof createClient>>,
  result: Awaited<ReturnType<typeof drawWinner>>,
): Promise<{ ok: true; value: ShowPayload } | { ok: false; error: string }> {
  if (!result.ok) return result;
  const { data: a } = await db.from("attendees").select("client_id, name").eq("id", result.value.winner.attendee_id).single();
  return {
    ok: true,
    value: {
      complete: result.value.complete,
      pool: result.value.pool.map((e) => ({ id: e.client_id, w: e.weight })),
      winner: { clientId: a?.client_id ?? "", name: a?.name ?? "" },
    },
  };
}

export async function drawNextWinner(drawId: string) {
  const me = await requireSuperAdmin();
  const db = await createClient();
  return toShow(db, await drawWinner(db, createAdminClient(), me.id, drawId));
}

export async function addParticipant(clientId: string) {
  await requireSuperAdmin();
  return tagParticipant(await createClient(), clientId);
}

export async function removeParticipant(attendeeId: string) {
  await requireSuperAdmin();
  return untagParticipant(await createClient(), attendeeId);
}

export async function lookupQuizWinner(clientId: string) {
  await requireSuperAdmin();
  return lookupQuizCandidate(await createClient(), clientId);
}

export async function confirmQuizResult(drawId: string, clientId: string) {
  const me = await requireSuperAdmin();
  const db = await createClient();
  return toShow(db, await confirmQuizWinner(db, createAdminClient(), me.id, drawId, clientId));
}

const KINDS: ReplaceKind[] = ["absent", "ineligible", "other"];

export async function replaceDrawWinner(winnerId: string, kind: ReplaceKind, note: string) {
  const me = await requireSuperAdmin();
  if (!KINDS.includes(kind)) return { ok: false as const, error: "Choose a reason." };
  if (kind === "other" && !note.trim()) return { ok: false as const, error: "Add a short note explaining the reason." };
  return replaceWinner(await createClient(), createAdminClient(), me.id, winnerId, kind, note);
}
