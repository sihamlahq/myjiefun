"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GuestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Guests page error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-rose-50/80 p-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">Something went wrong</p>
      <h2 className="font-heading mt-2 text-3xl font-semibold text-rose-950">Guests page failed to load</h2>
      <p className="mt-3 text-sm text-rose-900/70">
        {error.message || "An unexpected error occurred. Try again, or re-import a cleaned CSV."}
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-rose-800/50">Digest: {error.digest}</p>
      ) : null}
      <Button className="mt-5" type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
