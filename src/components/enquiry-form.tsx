"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "saving" | "ok" | "error";

export function EnquiryForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setError("");

    const form = event.currentTarget;
    const data = new FormData(form);

    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          partySize: data.get("partySize"),
          preferredAt: data.get("preferredAt"),
          message: data.get("message"),
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setStatus("error");
        setError(payload.error || "Something went wrong.");
        return;
      }

      form.reset();
      setStatus("ok");
    } catch {
      setStatus("error");
      setError("Network error. Please try again.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block text-foam/60">Name</span>
          <input
            name="name"
            required
            className="w-full rounded-xl border border-foam/20 bg-foam/5 px-4 py-3 text-foam outline-none transition focus:border-mango"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-foam/60">Email</span>
          <input
            name="email"
            type="email"
            className="w-full rounded-xl border border-foam/20 bg-foam/5 px-4 py-3 text-foam outline-none transition focus:border-mango"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-foam/60">Phone</span>
          <input
            name="phone"
            className="w-full rounded-xl border border-foam/20 bg-foam/5 px-4 py-3 text-foam outline-none transition focus:border-mango"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-foam/60">Party size</span>
          <input
            name="partySize"
            type="number"
            min={1}
            className="w-full rounded-xl border border-foam/20 bg-foam/5 px-4 py-3 text-foam outline-none transition focus:border-mango"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="mb-1.5 block text-foam/60">Preferred date / time</span>
        <input
          name="preferredAt"
          type="datetime-local"
          className="w-full rounded-xl border border-foam/20 bg-foam/5 px-4 py-3 text-foam outline-none transition focus:border-mango"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-foam/60">Message</span>
        <textarea
          name="message"
          required
          rows={4}
          className="w-full resize-y rounded-xl border border-foam/20 bg-foam/5 px-4 py-3 text-foam outline-none transition focus:border-mango"
          placeholder="Tell us about your booking or question"
        />
      </label>
      <button
        type="submit"
        disabled={status === "saving"}
        className="rounded-full bg-mango px-6 py-3 text-sm font-semibold text-ink transition hover:bg-mango-deep disabled:opacity-60"
      >
        {status === "saving" ? "Sending…" : "Send enquiry"}
      </button>
      {status === "ok" ? (
        <p className="text-sm text-mango">Thanks — we’ll get back to you soon.</p>
      ) : null}
      {status === "error" ? (
        <p className="text-sm text-coral">{error}</p>
      ) : null}
    </form>
  );
}
