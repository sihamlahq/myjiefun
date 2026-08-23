import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SetupCard } from "@/components/page-chrome";
import { RealtimeRefresh } from "@/components/realtime-refresh";
import { createClient } from "@/lib/supabase/server";
import { resolveDataClient } from "@/lib/supabase/data-client";
import type { AppRole, WeddingSettings } from "@/types/wedding";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch (error) {
    return (
      <AppShell role="viewer" coupleNames="Myjiefun Wedding">
        <SetupCard message={error instanceof Error ? error.message : "Supabase is not configured."} />
        {children}
      </AppShell>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const dataClient = await resolveDataClient(supabase);

  const [{ data: profile }, { data: weddingRow }] = await Promise.all([
    dataClient.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    dataClient.from("app_settings").select("value").eq("key", "wedding").maybeSingle(),
  ]);

  const role = (profile?.role as AppRole) || "viewer";
  const wedding = (weddingRow?.value as WeddingSettings | null) ?? {
    coupleNames: "Alex & Jordan",
    title: "Wedding Guest & Seating Manager",
    date: "",
    venue: "",
    logoUrl: "",
    backgroundImageUrl: "",
  };

  return (
    <AppShell role={role} coupleNames={wedding.coupleNames}>
      <RealtimeRefresh />
      {children}
    </AppShell>
  );
}
