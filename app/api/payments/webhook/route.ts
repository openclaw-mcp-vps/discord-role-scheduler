import { createHmac, timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { savePayment } from "@/lib/database";

export const runtime = "nodejs";

function parseStripeSignatureHeader(header: string): { timestamp: string; signatures: string[] } | null {
  const chunks = header.split(",").map((part) => part.trim());

  const timestamp = chunks.find((part) => part.startsWith("t="))?.replace("t=", "");
  const signatures = chunks
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.replace("v1=", ""));

  if (!timestamp || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parsed = parseStripeSignatureHeader(signatureHeader);

  if (!parsed) {
    return false;
  }

  const timestampNumber = Number(parsed.timestamp);

  if (!Number.isFinite(timestampNumber)) {
    return false;
  }

  const ageSeconds = Math.floor(Date.now() / 1000) - timestampNumber;

  if (ageSeconds > 300) {
    return false;
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  const expectedBuffer = Buffer.from(expected);

  return parsed.signatures.some((signature) => {
    const providedBuffer = Buffer.from(signature);

    return (
      providedBuffer.length === expectedBuffer.length &&
      timingSafeEqual(providedBuffer, expectedBuffer)
    );
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: "STRIPE_WEBHOOK_SECRET is missing."
      },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  let event: unknown;

  try {
    event = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Invalid webhook JSON payload." }, { status: 400 });
  }

  const typedEvent = event as {
    id?: string;
    type?: string;
    data?: {
      object?: {
        customer_email?: string;
        customer_details?: {
          email?: string;
        };
      };
    };
  };

  if (typedEvent.type === "checkout.session.completed") {
    const email =
      typedEvent.data?.object?.customer_details?.email ?? typedEvent.data?.object?.customer_email;

    if (email && typedEvent.id) {
      await savePayment(email, typedEvent.id);
    }
  }

  return NextResponse.json({ received: true });
}
