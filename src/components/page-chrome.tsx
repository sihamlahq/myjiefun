"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { isJwtClockSkewError } from "@/lib/supabase/errors";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 md:mb-6 md:flex-row md:items-end md:justify-between md:gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
          {eyebrow}
        </p>
        <h1 className="font-heading mt-1 text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--foreground)]/65">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function SetupCard({ message }: { message?: string | null }) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const clockSkew = isJwtClockSkewError(message);

  async function signOutAndRetry() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // Still send the user to login so cookies can be cleared on next auth.
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <Card className="border-[var(--accent)]/35 bg-white/85">
      <CardHeader>
        <CardTitle>{clockSkew ? "Session clock mismatch" : "Connect Supabase to begin"}</CardTitle>
        <CardDescription>
          {clockSkew
            ? "Supabase Auth accepted your login, but the database rejected the access token as “issued in the future.” This is almost always clock skew — not missing env vars."
            : "Add the wedding app environment variables, apply the Supabase migration, then refresh."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[var(--foreground)]/70">
        {message ? (
          <p className="rounded-xl bg-[var(--muted)] px-3 py-2 font-mono text-xs whitespace-pre-wrap">
            {message}
          </p>
        ) : null}
        {clockSkew ? (
          <>
            <ol className="list-decimal space-y-1 pl-5">
              <li>Turn on automatic date &amp; time (and the correct time zone) on this device.</li>
              <li>Sign out, then sign in again so Auth mints a fresh token against a synced clock.</li>
              <li>
                If you run local Supabase/Docker, restart Docker Desktop / sync the VM clock, then
                retry.
              </li>
              <li>
                Ensure <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> is set on the
                host — the app can keep serving staff data while a brief Auth ↔ database skew
                clears.
              </li>
            </ol>
            <Button type="button" onClick={signOutAndRetry} disabled={signingOut}>
              {signingOut ? "Signing out…" : "Sign out and try again"}
            </Button>
          </>
        ) : (
          <ul className="list-disc space-y-1 pl-5">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>SUPABASE_SERVICE_ROLE_KEY for optional seeding</li>
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-dashed border-[var(--primary)]/25 bg-white/55 p-8 text-center",
        className,
      )}
    >
      <p className="font-heading text-2xl font-semibold">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--foreground)]/60">{description}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">
          {label}
        </p>
        <p className="font-heading mt-2 text-4xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-[var(--foreground)]/55">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
