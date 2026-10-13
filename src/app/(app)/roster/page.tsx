import { NotAllowed } from "@/components/not-allowed";
import { getCurrentProfile } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/roles";
import { ticketsForBalance } from "@/lib/tickets";
import { createAdminClient } from "@/lib/supabase/admin";
import { UploadRoster } from "./upload-roster";

export const metadata = { title: "Client roster · TenTrade Lagos Seminar 2026" };

const SHOWN = 200;

// Super Admin only. Balances are read on the server and turned into a ticket count;
// the table shows asterisks, and the figure itself never reaches the browser.
export default async function RosterPage() {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile)) return <NotAllowed what="Client roster" />;

  const db = createAdminClient();
  const [{ count }, { data: rows }, { data: latest }] = await Promise.all([
    db.from("client_roster").select("client_id", { count: "exact", head: true }),
    db.from("client_roster").select("client_id, first_name, middle_name, last_name, balance").order("client_id").limit(SHOWN),
    db.from("client_roster").select("imported_at").order("imported_at", { ascending: false }).limit(1),
  ]);
  const total = count ?? 0;
  const importedAt = latest?.[0]?.imported_at ? new Date(latest[0].imported_at).toLocaleString("en-GB") : null;

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex w-full flex-col justify-between gap-[16px] md:flex-row md:items-start">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-heading text-[30px] leading-[normal] text-ink">Client roster</h1>
          <p className="text-[14px] font-light leading-[normal] text-muted">
            The company&apos;s client sheet. Registrars type a Client ID and the name and tickets fill in from here. The
            sheet needs these columns: CRM ID (Client ID), First Name, Middle Name (optional), Last Name, Balance.
          </p>
          <p className="text-[14px] text-ink">
            {total === 0 ? "No clients imported yet." : `${total} clients${importedAt ? ` · imported ${importedAt}` : ""}`}
          </p>
        </div>
        <UploadRoster hasRoster={total > 0} />
      </header>

      {total > 0 && (
        <div className="w-full overflow-x-auto rounded-[12px] border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-[14px]">
            <thead className="text-[13px] text-muted">
              <tr>
                <th className="p-[12px] font-normal">CRM ID</th>
                <th className="p-[12px] font-normal">First name</th>
                <th className="p-[12px] font-normal">Middle name</th>
                <th className="p-[12px] font-normal">Last name</th>
                <th className="p-[12px] font-normal">Balance</th>
                <th className="p-[12px] font-normal">Tickets</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => {
                const { tickets } = ticketsForBalance(Number(r.balance));
                return (
                  <tr key={r.client_id} className="border-t border-line text-ink">
                    <td className="p-[12px]">{r.client_id}</td>
                    <td className="p-[12px]">{r.first_name}</td>
                    <td className="p-[12px]">{r.middle_name ?? ""}</td>
                    <td className="p-[12px]">{r.last_name}</td>
                    <td className="p-[12px] tracking-widest text-muted" aria-label="Hidden">
                      ••••••
                    </td>
                    <td className="p-[12px]">{tickets > 0 ? tickets : "Not eligible"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {total > SHOWN && (
            <p className="border-t border-line p-[12px] text-[13px] text-muted">
              Showing the first {SHOWN} of {total}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
