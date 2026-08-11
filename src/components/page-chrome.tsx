import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--primary)]">
          {eyebrow}
        </p>
        <h1 className="font-heading mt-1 text-4xl font-semibold tracking-tight md:text-5xl">
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
  return (
    <Card className="border-[var(--accent)]/35 bg-white/85">
      <CardHeader>
        <CardTitle>Connect Supabase to begin</CardTitle>
        <CardDescription>
          Add the wedding app environment variables, apply the Supabase migration, then refresh.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-[var(--foreground)]/70">
        {message ? (
          <p className="rounded-xl bg-[var(--muted)] px-3 py-2 font-mono text-xs">{message}</p>
        ) : null}
        <ul className="list-disc space-y-1 pl-5">
          <li>NEXT_PUBLIC_SUPABASE_URL</li>
          <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
          <li>SUPABASE_SERVICE_ROLE_KEY for optional seeding</li>
        </ul>
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
