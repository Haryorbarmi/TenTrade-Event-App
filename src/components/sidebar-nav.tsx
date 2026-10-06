"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/registration", label: "Registration" },
  { href: "/attendees", label: "Attendee" },
  { href: "/raffle", label: "Raffle" },
];
// Not in the Figma sidebar; shown to Super Admins only (the page re-checks).
const ADMIN_ITEMS = [
  { href: "/users", label: "Users" },
  { href: "/event-data", label: "Event data" },
];

export function SidebarNav({ layout, superAdmin }: { layout: "column" | "row"; superAdmin: boolean }) {
  const pathname = usePathname();
  const items = superAdmin ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <nav className={layout === "column" ? "flex w-full flex-col items-start" : "flex gap-1 overflow-x-auto"}>
      {items.map(({ href, label }) => {
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
