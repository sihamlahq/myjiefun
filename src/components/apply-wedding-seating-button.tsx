"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { applyWeddingDinnerSeatingV3 } from "@/lib/actions/wedding";
import { Button } from "@/components/ui/button";

export function ApplyWeddingSeatingButton() {
  const [pending, startTransition] = useTransition();
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[color-mix(in_oklab,var(--primary)_20%,transparent)] bg-[color-mix(in_oklab,var(--primary)_6%,white)] px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--foreground)]">Wedding dinner table V3</p>
        <p className="text-xs text-[var(--foreground)]/65">
          Import tables + parties from the seating PDF. Repeat count = pax (e.g. Yee Wen Family ×9).
          Table 3A→4, 13A→14.
        </p>
        {last ? <p className="mt-1 text-xs text-emerald-700">{last}</p> : null}
      </div>
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              "Apply Wedding dinner table V3 now?\n\nThis creates/updates tables and seats party blocks (repeat count = pax).",
            )
          ) {
            return;
          }
          startTransition(async () => {
            try {
              const result = await applyWeddingDinnerSeatingV3();
              const msg = `Tables ${result.tablesUpserted} · added ${result.guestsCreated} · updated ${result.guestsUpdated} · ${result.totalPax} pax`;
              setLast(msg);
              if (result.errors.length) {
                toast.error(`Applied with ${result.errors.length} issue(s). ${msg}`);
              } else {
                toast.success(msg);
              }
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Unable to apply seating");
            }
          });
        }}
      >
        {pending ? "Applying…" : "Apply seating V3"}
      </Button>
    </div>
  );
}
