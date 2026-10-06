import { NotAllowed } from "@/components/not-allowed";
import { getCurrentProfile } from "@/lib/auth";
import { countEventData } from "@/lib/event-data";
import { isSuperAdmin } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClearEventData } from "./clear-event-data";

export const metadata = { title: "Event data · TenTrade Lagos Seminar 2026" };

// Super Admin only. No Figma frame: built in the app's existing card style.
export default async function EventDataPage() {
  const profile = await getCurrentProfile();
  if (!isSuperAdmin(profile)) return <NotAllowed what="Event data" />;

  const counts = await countEventData(createAdminClient());

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex flex-col gap-[8px]">
        <h1 className="font-heading text-[30px] leading-[normal] text-ink">Event data</h1>
        <p className="text-[14px] font-light leading-[normal] text-muted">
          Clear practice entries before the event, and delete everyone&apos;s data after it.
        </p>
      </header>
      <ClearEventData counts={counts} />
    </div>
  );
}
