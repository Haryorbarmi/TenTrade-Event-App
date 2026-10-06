import { AttendeeForm } from "./attendee-form";

export const metadata = { title: "Registration · TenTrade Lagos Seminar 2026" };

// Figma: Registration (3949:194)
export default function RegistrationPage() {
  return (
    <div className="flex w-full flex-col items-start gap-[32px] p-6 md:p-[48px]">
      <header className="flex flex-col gap-[8px]">
        <h1 className="font-heading text-[30px] leading-[normal] text-ink">Registration</h1>
        <p className="text-[14px] font-light leading-[normal] text-muted">Add each client as they arrive at Lagos Seminar 2026.</p>
      </header>

      <div className="flex w-full flex-col items-start gap-[32px] lg:flex-row">
        <AttendeeForm />

        {/* Recent check-ins: wired to live data in the next step. */}
        <section className="flex w-full min-w-px flex-1 flex-col gap-[20px] rounded-[12px] border border-line bg-white p-6 md:p-[32px]">
          <h2 className="text-[16px] font-semibold leading-[normal] text-ink">Recent check-ins</h2>
          <p className="text-[14px] font-light leading-[normal] text-muted">
            No check-ins yet. Entries appear here in arrival order, numbered from 1.
          </p>
        </section>
      </div>
    </div>
  );
}
