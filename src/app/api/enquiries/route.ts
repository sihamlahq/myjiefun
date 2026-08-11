import { NextResponse } from "next/server";
import { createBrowserClient } from "@/lib/supabase/client";

type EnquiryBody = {
  name?: string;
  email?: string;
  phone?: string;
  partySize?: number | string;
  preferredAt?: string;
  message?: string;
};

export async function POST(request: Request) {
  let body: EnquiryBody;

  try {
    body = (await request.json()) as EnquiryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const message = (body.message ?? "").trim();
  const partySizeRaw = body.partySize;
  const partySize =
    partySizeRaw === undefined || partySizeRaw === ""
      ? null
      : Number(partySizeRaw);
  const preferredAt = (body.preferredAt ?? "").trim() || null;

  if (!name || !message) {
    return NextResponse.json(
      { error: "Name and message are required." },
      { status: 400 },
    );
  }

  if (partySize !== null && (!Number.isFinite(partySize) || partySize < 1)) {
    return NextResponse.json(
      { error: "Party size must be a positive number." },
      { status: 400 },
    );
  }

  try {
    const supabase = createBrowserClient();
    const { error } = await supabase.from("enquiries").insert({
      name,
      email,
      phone,
      party_size: partySize,
      preferred_at: preferredAt,
      message,
      source: "website",
      status: "new",
    });

    if (error) {
      console.error("[myjiefun] enquiry insert failed", error.message);
      return NextResponse.json(
        { error: "Could not save your enquiry. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[myjiefun] enquiry route error", err);
    return NextResponse.json(
      {
        error:
          "Supabase is not configured for Myjiefun yet. Add the myjiefun project keys.",
      },
      { status: 503 },
    );
  }
}
