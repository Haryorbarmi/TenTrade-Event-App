import { RECENT_COLUMNS, RECENT_LIMIT, type RecentRow } from "@/lib/attendees";
import { createClient } from "@/lib/supabase/server";
import { AttendeeForm } from "./attendee-form";
import { RecentCheckins } from "./recent-checkins";

export const metadata = { title: "Registration · TenTrade Lagos Seminar 2026" };

// Figma: Registration (3949:194)
export default async function RegistrationPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: profiles }] = await Promise.all([
    supabase.from("attendees").select(RECENT_COLUMNS).order("seq", { ascending: false }).limit(RECENT_LIMIT),
    supabase.from("profiles").select("id, name"),
  ]);
  const names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.name]));

  return (
    <div className="flex w-full flex-col items-start gap-[32px] p-6 md:p-[48px]">
      <header className="flex flex-col gap-[8px]">
        <h1 className="font-heading text-[30px] leading-[normal] text-ink">Registration</h1>
        <p className="text-[14px] font-light leading-[normal] text-muted">Add each client as they arrive at Lagos Seminar 2026.</p>
      </header>

      <div className="flex w-full flex-col items-start gap-[32px] lg:flex-row">
        <AttendeeForm />
        <RecentCheckins initialRows={(rows ?? []) as RecentRow[]} names={names} />
      </div>
    </div>
  );
}
