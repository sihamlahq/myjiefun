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
import { useEffect, useMemo, useState, useTransition } from "react";
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
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startNavTransition] = useTransition();

  const items = useMemo(
    () => NAV_ITEMS.filter((item) => hasMinRole(role, item.minRole)),
    [role],
  );

  useEffect(() => {
    setPendingHref(null);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    for (const item of items) {
      router.prefetch(item.href);
    }
  }, [items, router]);

  const activePath = pendingHref ?? pathname;

  function goTo(href: string) {
    if (pathname.startsWith(href) && (href !== "/" || pathname === "/")) {
      setPendingHref(null);
      setOpen(false);
      return;
    }
    setPendingHref(href);
    setOpen(false);
    startNavTransition(() => {
      router.push(href);
    });
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="app-shell floral-rail min-h-screen min-h-dvh">
      <div className="mx-auto flex min-h-screen min-h-dvh max-w-[1600px]">
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
              const active = activePath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={(event) => {
                    if (
                      event.defaultPrevented ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    goTo(item.href);
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-[background-color,color,transform] duration-150",
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
            <Link href="/reception" prefetch>
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
          <header className="mobile-top-bar sticky top-0 z-30 flex items-center justify-between border-b border-black/8 bg-[#f7f3ec]/92 px-4 py-3 backdrop-blur lg:hidden">
            <div className="min-w-0 pr-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
                Myjiefun
              </p>
              <p className="font-heading truncate text-lg leading-none">{coupleNames}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </header>

          {open ? (
            <div className="border-b border-black/8 bg-white/95 p-3 lg:hidden">
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch
                    onClick={(event) => {
                      if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      ) {
                        return;
                      }
                      event.preventDefault();
                      goTo(item.href);
                    }}
                    className={cn(
                      "min-h-11 rounded-xl px-3 py-3 text-sm font-medium transition-[background-color,color] duration-150",
                      activePath.startsWith(item.href)
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

          <main className="app-main flex-1 p-4 md:p-6 md:pb-6 lg:p-8">{children}</main>

          <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 gap-1 border-t border-black/10 bg-white/95 px-2 pt-2 backdrop-blur md:hidden">
            {items.slice(0, 4).map((item) => {
              const Icon = ICONS[item.href];
              const active = activePath.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={(event) => {
                    if (
                      event.defaultPrevented ||
                      event.button !== 0 ||
                      event.metaKey ||
                      event.ctrlKey ||
                      event.shiftKey ||
                      event.altKey
                    ) {
                      return;
                    }
                    event.preventDefault();
                    goTo(item.href);
                  }}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold leading-tight transition-[background-color,color,transform] duration-150 active:scale-95 sm:text-[11px]",
                    active ? "bg-[var(--primary)] text-white" : "text-black/60",
                  )}
                >
                  {Icon ? <Icon className="h-5 w-5" /> : null}
                  <span className="max-w-full truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
