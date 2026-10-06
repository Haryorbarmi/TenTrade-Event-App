import { requireUser } from "@/lib/auth";
import { ATTENDEE_COLUMNS, type AttendeeRow } from "@/lib/attendees";
import { createClient } from "@/lib/supabase/server";
import { AttendeeTable } from "./attendee-table";

export const metadata = { title: "Attendees · TenTrade Lagos Seminar 2026" };

// Figma: Attendee (3950:194)
export default async function AttendeesPage() {
  const viewer = await requireUser();
  const supabase = await createClient();
  const [{ data: rows }, { data: profiles }] = await Promise.all([
    supabase.from("attendees").select(ATTENDEE_COLUMNS).order("seq"),
    supabase.from("profiles").select("id, name").order("name"),
  ]);

  return (
    <div className="flex w-full flex-col items-start gap-[24px] p-6 md:p-[48px]">
      <header className="flex w-full items-end justify-between gap-4">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-heading text-[30px] leading-[normal] text-ink">Attendee</h1>
          <p className="text-[14px] font-light leading-[normal] text-muted">Everyone who has checked in, in arrival order.</p>
        </div>
        {/* Export to Excel (Super Admin only) is added in a later step. */}
      </header>

      <AttendeeTable initialRows={(rows ?? []) as AttendeeRow[]} registrars={profiles ?? []} viewer={viewer} />
    </div>
  );
}
