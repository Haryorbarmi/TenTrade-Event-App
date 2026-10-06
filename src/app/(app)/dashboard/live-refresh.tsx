"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LiveIndicator } from "@/components/live-indicator";
import { useAttendeesLive } from "@/lib/use-attendees-live";

const POLL_MS = 30_000;

// Re-renders the Dashboard when an attendee is added or edited (live), and
// every 30 s for draw progress, which registrars cannot subscribe to.
export function LiveRefresh() {
  const router = useRouter();
  const live = useAttendeesLive("dashboard", async () => router.refresh());

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <span className={`rounded-full px-[10px] py-[4px] ${live ? "bg-[rgba(33,158,97,0.12)]" : "bg-[rgba(115,115,115,0.12)]"}`}>
      <LiveIndicator live={live} />
    </span>
  );
}
