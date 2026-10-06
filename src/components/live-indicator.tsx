export function LiveIndicator({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-[6px] whitespace-nowrap text-[12px] leading-[normal] ${live ? "text-[#219e61]" : "text-muted"}`}
      title={live ? "New entries appear automatically" : "Connecting to live updates…"}
    >
      <span className={`size-[6px] rounded-full ${live ? "bg-[#219e61]" : "bg-muted"}`} aria-hidden />
      {live ? "Live" : "Connecting…"}
    </span>
  );
}
