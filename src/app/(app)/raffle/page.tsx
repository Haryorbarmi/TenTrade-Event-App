import { ComingSoon } from "@/components/coming-soon";
import { NotAllowed } from "@/components/not-allowed";
import { getCurrentProfile } from "@/lib/auth";
import { canAccessRaffle } from "@/lib/roles";

export const metadata = { title: "Raffle · TenTrade Lagos Seminar 2026" };

export default async function RafflePage() {
  // Checked on the server. Raffle data is also blocked for registrars by RLS.
  const profile = await getCurrentProfile();
  if (!canAccessRaffle(profile)) return <NotAllowed />;

  return <ComingSoon title="Raffle" phase={3} />;
}
