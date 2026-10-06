/* eslint-disable @next/next/no-img-element -- 6px dot SVGs from Figma */

// Figma: Attendee table cells (4010:223, 4010:267, 4010:227)

export function EligibilityPill({ eligible }: { eligible: boolean }) {
  return eligible ? (
    <span className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-[rgba(33,158,97,0.12)] px-[10px] py-[4px] text-[12px] font-semibold leading-[normal] text-[#219e61]">
      <img alt="" width={6} height={6} className="block size-[6px]" src="/brand/dot-eligible.svg" />
      Eligible
    </span>
  ) : (
    <span className="inline-flex items-center gap-[6px] whitespace-nowrap rounded-full bg-[rgba(115,115,115,0.12)] px-[10px] py-[4px] text-[12px] font-semibold leading-[normal] text-muted">
      <img alt="" width={6} height={6} className="block size-[6px]" src="/brand/dot-not-eligible.svg" />
      Not eligible
    </span>
  );
}

export function TicketsPill({ tickets }: { tickets: number }) {
  if (tickets === 0) return <span className="text-[14px] font-light text-muted">—</span>;
  return (
    <span className="inline-flex whitespace-nowrap rounded-full bg-[rgba(217,37,200,0.1)] px-[10px] py-[4px] text-[12px] font-semibold leading-[normal] text-accent">
      {tickets} ticket{tickets === 1 ? "" : "s"}
    </span>
  );
}
