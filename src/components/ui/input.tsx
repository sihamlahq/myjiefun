import * as React from "react";
import { cn } from "@/lib/utils";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-black/40 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[88px] w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm text-[var(--foreground)] shadow-sm outline-none placeholder:text-black/40 focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/30",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-[var(--foreground)]/80", className)}
      {...props}
    />
  );
}
