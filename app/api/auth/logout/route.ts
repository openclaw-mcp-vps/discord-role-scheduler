import { NextRequest, NextResponse } from "next/server";

import { PAID_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth";

function getBaseUrl(request: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;

  if (configured) {
    return configured;
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const protocol = request.headers.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const response = NextResponse.redirect(new URL("/", getBaseUrl(request)));
  response.cookies.delete(SESSION_COOKIE_NAME);
  response.cookies.delete(PAID_COOKIE_NAME);
  return response;
}
