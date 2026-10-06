// Registration database checks against the real Supabase project (needs user-passwords.txt).
// Only runs while the attendees table is empty, and deletes its test rows afterwards.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const pw = (email) => readFileSync("user-passwords.txt", "utf8").split("\n").find((l) => l.includes(email)).trim().split(/\s+/).at(-1);

async function signIn(email) {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({ email, password: pw(email) });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { c, id: data.user.id };
}

const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { count: before } = await admin.from("attendees").select("*", { count: "exact", head: true });
if (before !== 0) { console.log(`attendees table has ${before} rows; aborting so real data is not touched.`); process.exit(1); }

let fail = 0;
const check = (name, ok, detail = "") => { if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`); };
const row = (i) => ({ client_id: `TEST-${i}`, name: `Test ${i}`, email: `t${i}@example.com`, phone: "+2348031234567", eligible: true, tickets: 1 });

const eniola = await signIn("eniolao@tentrade.com");
const chioma = await signIn("chioma@tentrade.com");

try {
  // 1. Two registrars add 20 entries at the same instant.
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => (i % 2 ? chioma : eniola).c.from("attendees").insert(row(i + 1)).select("seq, registered_by").single()),
  );
  const errs = results.filter((r) => r.error);
  const seqs = results.map((r) => r.data?.seq).filter(Boolean).sort((a, b) => a - b);
  check("20 simultaneous inserts all succeed", errs.length === 0, errs[0]?.error?.message ?? "");
  check("arrival numbers are unique and gapless 1..20", JSON.stringify(seqs) === JSON.stringify(Array.from({ length: 20 }, (_, i) => i + 1)), `got ${seqs.join(",")}`);
  check("registered_by is the person who added it", results.every((r, i) => r.data?.registered_by === (i % 2 ? chioma : eniola).id));

  // 2. Duplicate Client ID is blocked, and does not burn a number.
  const dup = await eniola.c.from("attendees").insert(row(1));
  check("duplicate Client ID rejected", dup.error?.code === "23505", dup.error?.code ?? "no error");
  const next = await eniola.c.from("attendees").insert(row(21)).select("seq").single();
  check("next entry after a rejected duplicate gets no. 21", next.data?.seq === 21, `got ${next.data?.seq}`);

  // 3. Ticket rules enforced by the database.
  const bad1 = await eniola.c.from("attendees").insert({ ...row(22), eligible: false, tickets: 3 });
  check("not eligible with tickets rejected", !!bad1.error);
  const bad2 = await eniola.c.from("attendees").insert({ ...row(23), tickets: 11 });
  check("11 tickets rejected", !!bad2.error);

  // 4. Browser cannot fake seq or registered_by.
  const fake = await eniola.c.from("attendees").insert({ ...row(24), seq: 999, registered_by: chioma.id }).select("seq, registered_by").single();
  check("seq and registered_by cannot be faked", fake.data?.seq === 22 && fake.data?.registered_by === eniola.id, JSON.stringify(fake.data ?? fake.error?.message));

  // 5. Edit rights + audit log.
  const own = await eniola.c.from("attendees").update({ tickets: 5 }).eq("client_id", "TEST-1").select("tickets");
  check("registrar can edit own entry", own.data?.length === 1 && own.data[0].tickets === 5);
  const other = await eniola.c.from("attendees").update({ tickets: 5 }).eq("client_id", "TEST-2").select();
  check("registrar cannot edit someone else's entry", (other.data?.length ?? 0) === 0);
  const { data: audit } = await admin.from("attendee_changes").select("field, old_value, new_value, changed_by");
  check("edit written to audit log", audit?.length === 1 && audit[0].field === "tickets" && audit[0].old_value === "1" && audit[0].new_value === "5" && audit[0].changed_by === eniola.id, JSON.stringify(audit));
} finally {
  await admin.from("attendees").delete().like("client_id", "TEST-%");
  await admin.from("activity_log").delete().eq("action", "attendee_added");
  const { count } = await admin.from("attendees").select("*", { count: "exact", head: true });
  console.log(`\ncleanup: attendees table back to ${count} rows`);
  await eniola.c.auth.signOut();
  await chioma.c.auth.signOut();
}
console.log(fail === 0 ? "All registration database checks passed." : `${fail} check(s) FAILED.`);
process.exit(fail ? 1 : 0);
