"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/registration", label: "Registration" },
  { href: "/attendees", label: "Attendee" },
  { href: "/raffle", label: "Raffle" },
] as const;

export function SidebarNav({ layout }: { layout: "column" | "row" }) {
  const pathname = usePathname();

  return (
    <nav className={layout === "column" ? "flex w-full flex-col items-start" : "flex gap-1 overflow-x-auto"}>
      {NAV_ITEMS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center whitespace-nowrap rounded-[6px] p-[10px] text-[14px] font-light leading-none ${
              layout === "column" ? "w-full" : ""
            } ${active ? "bg-white/8 text-white" : "text-[rgba(253,253,253,0.75)] hover:text-white"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
