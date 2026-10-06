"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Supabase = ReturnType<typeof createClient>;

// Calls `reload` whenever any attendee is added, edited or removed, and once
// on every (re)connect so nothing missed while offline is lost.
// Returns whether the live connection is up.
export function useAttendeesLive(channelName: string, reload: (supabase: Supabase) => Promise<void>): boolean {
  const [live, setLive] = useState(false);
  const reloadRef = useRef(reload);

  useEffect(() => {
    reloadRef.current = reload;
  });

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const run = () => {
      if (!cancelled) void reloadRef.current(supabase);
    };

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", { event: "*", schema: "public", table: "attendees" }, run);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) supabase.realtime.setAuth(session.access_token);
      channel.subscribe((status) => {
        if (cancelled) return;
        setLive(status === "SUBSCRIBED");
        if (status === "SUBSCRIBED") run();
      });
    });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [channelName]);

  return live;
}
