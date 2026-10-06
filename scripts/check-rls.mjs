// Phase 1 check: a registrar cannot reach Raffle data, even calling the API directly.
// Signs in as a registrar with the public anon key (exactly what a browser has)
// and tries to read and write every Super-Admin-only table.
// Usage: npm run check-rls -- <registrar-email> <registrar-password>
import { createClient } from "@supabase/supabase-js";

const [email, password] = process.argv.slice(2);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!email || !password || !url || !anonKey) {
  console.error("Usage: npm run check-rls -- <registrar-email> <registrar-password>  (needs .env.local)");
  process.exit(1);
}

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });
const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
if (signInError) {
  console.error(`Sign-in failed: ${signInError.message}`);
  process.exit(1);
}

const { data: me } = await supabase.from("profiles").select("role").eq("id", (await supabase.auth.getUser()).data.user.id).single();
if (me?.role !== "registrar") {
  console.error(`This account's role is "${me?.role}". Run the check with a registrar account.`);
  process.exit(1);
}

let failures = 0;
function report(name, blocked, detail) {
  if (!blocked) failures++;
  console.log(`${blocked ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
}

// Reads: RLS returns no rows to a registrar.
for (const table of ["draws", "winners", "participants", "attendee_changes", "activity_log"]) {
  const { data, error } = await supabase.from(table).select("*").limit(5);
  report(`read ${table}`, !!error || data.length === 0, error ? error.message : `${data.length} rows`);
}

// Writes: every attempt must be rejected.
const fakeId = "00000000-0000-0000-0000-000000000000";
const writes = [
  ["insert draws", () => supabase.from("draws").insert({ type: "grand", name: "x", prize_amount: 1 }).select()],
  ["update draws", () => supabase.from("draws").update({ status: "done" }).neq("id", fakeId).select()],
  ["delete draws", () => supabase.from("draws").delete().neq("id", fakeId).select()],
  ["insert winners", () =>
    supabase.from("winners").insert({ draw_id: fakeId, attendee_id: fakeId, position: 1, drawn_by: fakeId, pool_size: 1, total_tickets: 1, random_value: 0 }).select()],
  ["insert participants", () => supabase.from("participants").insert({ attendee_id: fakeId }).select()],
  ["change own role", () => supabase.from("profiles").update({ role: "super_admin" }).neq("id", fakeId).select()],
  ["log a fake export", () => supabase.rpc("log_session_event", { p_action: "export" })],
];
for (const [name, run] of writes) {
  const { data, error } = await run();
  report(name, !!error || (Array.isArray(data) && data.length === 0), error ? error.message : `${data?.length ?? 0} rows affected`);
}

await supabase.auth.signOut();
console.log(failures === 0 ? "\nAll checks passed: Raffle data is closed to registrars." : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
