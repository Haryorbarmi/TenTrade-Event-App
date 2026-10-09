// FAKE CRM for building and rehearsing the lookup flow before the real system
// is connected. Made-up people and net deposits, nothing real. Predictable so a
// tester knows what each Client ID will do:
//   ends in 0  -> client not found
//   ends in 9  -> CRM unavailable (simulated outage)
//   otherwise  -> a made-up name and net deposit, derived from the number

import type { ClientLookup } from "./types";
import { ticketsForNetDeposit } from "../tickets";

const NAMES = [
  "Adaeze Okafor", "Tunde Bakare", "Ngozi Eze", "Ibrahim Musa", "Funke Adeyemi",
  "Chinedu Obi", "Aisha Bello", "Emeka Nwosu", "Yetunde Alade", "Segun Balogun",
  "Halima Yusuf", "Obinna Okeke", "Bisi Ogunleye", "Kelechi Anya", "Zainab Lawal",
];

export function fakeLookup(clientId: string): ClientLookup {
  if (!/^\d{6}$/.test(clientId)) return { found: false };
  const n = Number(clientId);
  const last = n % 10;
  if (last === 0) return { found: false };
  if (last === 9) return { found: false, unavailable: true };

  const netDeposit = (n * 37) % 1400; // spreads across "under $100", "a few tickets" and "$1,000+"
  return { found: true, name: NAMES[n % NAMES.length]!, ...ticketsForNetDeposit(netDeposit) };
}
