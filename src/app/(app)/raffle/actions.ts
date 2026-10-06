"use server";

import { requireSuperAdmin } from "@/lib/auth";
import { drawWinner, lockDraw, previewPool, replaceWinner, unlockDraw, type ReplaceKind } from "@/lib/raffle";
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

export async function drawNextWinner(drawId: string) {
  const me = await requireSuperAdmin();
  return drawWinner(await createClient(), createAdminClient(), me.id, drawId);
}

const KINDS: ReplaceKind[] = ["absent", "ineligible", "other"];

export async function replaceDrawWinner(winnerId: string, kind: ReplaceKind, note: string) {
  const me = await requireSuperAdmin();
  if (!KINDS.includes(kind)) return { ok: false as const, error: "Choose a reason." };
  if (kind === "other" && !note.trim()) return { ok: false as const, error: "Add a short note explaining the reason." };
  return replaceWinner(await createClient(), createAdminClient(), me.id, winnerId, kind, note);
}
