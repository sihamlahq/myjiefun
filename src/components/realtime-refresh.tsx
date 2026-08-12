"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isRealtimeRefreshSuppressed } from "@/lib/client-refresh";

const TABLES = [
  "guests",
  "reception_tables",
  "seats",
  "guest_groups",
  "check_in_events",
  "app_settings",
] as const;

/** Debounced router.refresh for app pages (reception uses a faster dedicated live board). */
export function RealtimeRefresh({ enabled = true }: { enabled?: boolean }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    const refreshSoon = () => {
      if (isRealtimeRefreshSuppressed()) return;
      if (timer.current) clearTimeout(timer.current);
      // Longer debounce avoids fighting optimistic UI + action revalidation on mobile.
      timer.current = setTimeout(() => {
        if (isRealtimeRefreshSuppressed()) return;
        router.refresh();
      }, 900);
    };

    const channel = supabase.channel(`wedding-live-${Math.random().toString(36).slice(2)}`);
    for (const table of TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, refreshSoon);
    }
    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [enabled, router]);

  return null;
}
