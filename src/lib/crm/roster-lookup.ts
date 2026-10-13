import "server-only";
import { ticketsForBalance } from "../tickets";
import { createAdminClient } from "../supabase/admin";
import type { ClientLookup } from "./types";

// Looks a Client ID up in the imported client roster (the company's Excel sheet).
// The balance is read here on the server, turned into eligible + tickets, and
// discarded: it is never returned, so it cannot reach the browser or be saved.
export async function rosterLookup(clientId: string): Promise<ClientLookup> {
  const { data, error } = await createAdminClient()
    .from("client_roster")
    .select("first_name, middle_name, last_name, balance")
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) return { found: false, unavailable: true };
  if (!data) return { found: false };
  return {
    found: true,
    firstName: data.first_name,
    middleName: data.middle_name ?? "",
    lastName: data.last_name,
    ...ticketsForBalance(Number(data.balance)),
  };
}
