// Shown instantly while a page's data loads, so a click never feels frozen.
// The sidebar stays in place; only the main area shows this placeholder.
export default function Loading() {
  const block = "animate-pulse rounded-[12px] bg-surface";
  return (
    <div className="flex w-full flex-col gap-[24px] p-6 md:p-[48px]" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col gap-[8px]">
        <div className={`${block} h-[36px] w-[220px] rounded-[8px]`} />
        <div className={`${block} h-[16px] w-[320px] rounded-[6px]`} />
      </div>
      <div className="grid w-full grid-cols-1 gap-[24px] sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`${block} h-[128px]`} />
        ))}
      </div>
      <div className={`${block} h-[320px] w-full`} />
    </div>
  );
}
