"use client";

import { Heart, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type CheckInToast = {
  id: string;
  guestId: string;
  nameEn: string;
  nameZh: string;
  tableNumber: string | null;
  createdAt: number;
};

export function CheckInPopouts({
  toasts,
  onDismiss,
}: {
  toasts: CheckInToast[];
  onDismiss: (id: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !toasts.length) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-y-0 right-0 z-[80] flex w-full max-w-sm flex-col justify-end gap-3 p-4 sm:justify-center sm:p-6"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map((toast, index) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => onDismiss(toast.id)}
          className={cn(
            "checkin-popout pointer-events-auto relative w-full overflow-hidden rounded-[1.75rem] border border-white/70 text-left shadow-[0_18px_50px_rgba(80,50,30,.18)] backdrop-blur-md",
            "bg-[linear-gradient(145deg,rgba(255,252,247,.96),rgba(255,236,220,.92)_55%,rgba(255,214,224,.88))]",
          )}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <span className="checkin-popout-shine pointer-events-none absolute inset-0" />
          <span className="pointer-events-none absolute -right-3 -top-3 h-16 w-16 rounded-full bg-[var(--accent)]/25 blur-2xl" />
          <span className="pointer-events-none absolute -bottom-4 -left-2 h-14 w-14 rounded-full bg-rose-300/30 blur-2xl" />

          <div className="relative flex items-start gap-3 px-4 py-3.5">
            <span className="checkin-popout-badge mt-0.5 grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/85 text-[var(--primary)] shadow-sm">
              <Heart className="h-5 w-5 fill-[var(--accent)] text-[var(--accent)]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                Just checked in
              </p>
              <p className="font-heading mt-1 truncate text-2xl font-semibold leading-tight text-[var(--foreground)]">
                {toast.nameEn || "Guest"}
              </p>
              {toast.nameZh ? (
                <p className="mt-0.5 truncate text-sm text-[var(--foreground)]/65">{toast.nameZh}</p>
              ) : null}
              {toast.tableNumber ? (
                <p className="mt-2 inline-flex rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-[var(--primary)] shadow-sm">
                  Table {toast.tableNumber}
                </p>
              ) : null}
            </div>
          </div>
        </button>
      ))}
    </div>,
    document.body,
  );
}
