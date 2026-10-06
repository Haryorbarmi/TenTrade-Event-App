// Temporary stand-in for screens built in later phases (CLAUDE.md section 11).
export function ComingSoon({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="p-6 md:p-[48px]">
      <h1 className="font-heading text-[38px] leading-[normal] text-ink">{title}</h1>
      <p className="mt-2 text-[14px] font-light text-muted">This screen is built in Phase {phase}.</p>
    </div>
  );
}
