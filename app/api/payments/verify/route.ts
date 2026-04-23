import { NextRequest, NextResponse } from "next/server";

import {
  createPaidAccessToken,
  createPaidCookieOptions,
  getSessionFromRequest,
  PAID_COOKIE_NAME
} from "@/lib/auth";
import { hasPaidEmail } from "@/lib/database";

export const runtime = "nodejs";

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  if (configured) {
    return configured;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);
  const baseUrl = getBaseUrl(request);

  if (!session) {
    return NextResponse.redirect(new URL("/?auth=required", baseUrl));
  }

  const contentType = request.headers.get("content-type") ?? "";
  let manualEmail: string | undefined;

  if (contentType.includes("application/json")) {
    const body = (await request.json()) as { email?: string };
    manualEmail = body.email;
  } else {
    const formData = await request.formData();
    manualEmail = (formData.get("email") as string | null) ?? undefined;
  }

  const candidateEmails = [session.email, manualEmail]
    .map((email) => email?.trim().toLowerCase())
    .filter((email): email is string => Boolean(email));

  for (const email of candidateEmails) {
    if (await hasPaidEmail(email)) {
      const response = NextResponse.redirect(new URL("/dashboard?unlocked=1", baseUrl));

      response.cookies.set(
        PAID_COOKIE_NAME,
        createPaidAccessToken({
          userId: session.userId,
          email
        }),
        createPaidCookieOptions()
      );

      return response;
    }
  }

  return NextResponse.redirect(new URL("/dashboard?payment=not_found", baseUrl));
}
