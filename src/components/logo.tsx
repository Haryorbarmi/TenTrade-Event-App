/* eslint-disable @next/next/no-img-element -- fixed-size SVG pieces from Figma */

// TenTrade logo, assembled from the Figma SVG pieces exactly as laid out there.
// "lg" is the Login brand panel (node 4010:138), "md" the projector display
// (node 3953:137), "sm" the sidebar (node 3943:1281).

const WORDMARK_PIECES = [
  "inset-[5.8%_86.05%_0.2%_0]",
  "inset-[27.97%_75.03%_-0.01%_12.03%]",
  "inset-[27.87%_61.86%_0.21%_26.56%]",
  "inset-[5.8%_49.36%_0.2%_36.69%]",
  "inset-[27.87%_42.57%_0.21%_50.23%]",
  "inset-[27.86%_29.41%_0.01%_57.66%]",
  "inset-[-0.01%_14.7%_0_72.37%]",
  "inset-[28.15%_0_0_87.06%]",
];

const SIZES = {
  lg: {
    prefix: "/brand/",
    gap: "gap-[7.2px]",
    mark: "h-[30.645px] w-[37.625px]",
    divider: "h-[34.54px] w-[0.921px]",
    wordmark: "h-[30.686px] w-[169.308px]",
  },
  md: {
    prefix: "/brand/dp-",
    gap: "gap-[6px]",
    mark: "h-[25.537px] w-[31.354px]",
    divider: "h-[28.783px] w-[0.768px]",
    wordmark: "h-[25.571px] w-[141.09px]",
  },
  sm: {
    prefix: "/brand/sb-",
    gap: "gap-[4px]",
    mark: "h-[17.025px] w-[20.903px]",
    divider: "h-[19.189px] w-[0.512px]",
    wordmark: "h-[17.048px] w-[94.06px]",
  },
};

export function Logo({ size }: { size: "lg" | "md" | "sm" }) {
  const s = SIZES[size];
  return (
    <div className={`flex items-center ${s.gap}`} role="img" aria-label="TenTrade">
      <div className={`relative shrink-0 ${s.mark}`}>
        <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${s.prefix}logo-mark.svg`} />
      </div>
      <div className={`relative shrink-0 ${s.divider}`}>
        <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${s.prefix}logo-divider.svg`} />
      </div>
      <div className={`relative shrink-0 overflow-clip ${s.wordmark}`}>
        {WORDMARK_PIECES.map((inset, i) => (
          <div key={inset} className={`absolute ${inset}`}>
            <img alt="" className="absolute inset-0 block size-full max-w-none" src={`${s.prefix}logo-w${i + 1}.svg`} />
          </div>
        ))}
      </div>
    </div>
  );
}
