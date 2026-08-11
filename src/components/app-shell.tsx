"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardCheck,
  LayoutDashboard,
  Map,
  Settings,
  Users,
  Armchair,
  Table2,
  BarChart3,
  MonitorPlay,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { hasMinRole, NAV_ITEMS } from "@/lib/permissions";
import type { AppRole } from "@/types/wedding";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "/dashboard": LayoutDashboard,
  "/guests": Users,
  "/check-in": ClipboardCheck,
  "/seating": Armchair,
  "/floor-plan": Map,
  "/tables": Table2,
  "/reports": BarChart3,
  "/settings": Settings,
};

export function AppShell({
  children,
  role,
  coupleNames,
}: {
  children: React.ReactNode;
  role: AppRole;
  coupleNames: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => hasMinRole(role, item.minRole)),
    [role],
  );

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell floral-rail min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-64 shrink-0 border-r border-black/8 bg-white/55 p-5 backdrop-blur lg:block">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Myjiefun
            </p>
            <h1 className="font-heading mt-1 text-2xl leading-tight">{coupleNames}</h1>
            <p className="mt-1 text-xs text-black/50">Wedding Guest & Seating</p>
          </div>
          <nav className="space-y-1">
            {items.map((item) => {
              const Icon = ICONS[item.href];
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    active
                      ? "bg-[var(--primary)] text-white shadow"
                      : "text-[var(--foreground)]/75 hover:bg-black/5",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 space-y-2 border-t border-black/8 pt-4">
            <Link href="/reception">
              <Button variant="gold" className="w-full justify-start" size="sm">
                <MonitorPlay className="h-4 w-4" />
                Reception Mode
              </Button>
            </Link>
            <Button variant="ghost" className="w-full justify-start" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-[#f7f3ec]/90 px-4 py-3 backdrop-blur lg:hidden">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                Myjiefun
              </p>
              <p className="font-heading text-lg leading-none">{coupleNames}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </header>

          {open ? (
            <div className="border-b border-black/8 bg-white/90 p-3 lg:hidden">
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm font-medium",
                      pathname.startsWith(item.href)
                        ? "bg-[var(--primary)] text-white"
                        : "bg-black/5",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>

          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-black/10 bg-white/95 p-2 backdrop-blur md:hidden">
            {items.slice(0, 4).map((item) => {
              const Icon = ICONS[item.href];
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold",
                    active ? "bg-[var(--primary)] text-white" : "text-black/60",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
