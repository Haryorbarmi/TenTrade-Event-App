/* eslint-disable @next/next/no-img-element -- fixed-size SVG icon from Figma */
import Link from "next/link";

// Figma: Raffle · Not allowed (registrar view) (4013:136)
export function NotAllowed() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-[48px]">
      <div className="flex w-full max-w-[520px] flex-col items-center gap-[16px] rounded-[16px] border border-line bg-white p-8 text-center md:p-[48px]">
        <img alt="" width={84} height={84} className="block size-[84px]" src="/brand/lock-icon.svg" />
        <h1 className="font-heading text-[38px] leading-[normal] text-ink">Not allowed</h1>
        <p className="text-[15px] font-light text-muted">
          Only Super Admins can open the Raffle. You can keep adding attendees from Registration.
        </p>
        <Link
          href="/registration"
          className="bg-accent-gradient flex h-[48px] items-center justify-center rounded-[8px] px-[28px] text-[14px] font-semibold text-white"
        >
          Go to Registration
        </Link>
        <p className="text-[13px] font-light text-muted">Need access? Ask a Super Admin.</p>
      </div>
    </div>
  );
}
