import { NextRequest, NextResponse } from "next/server";

import {
  createOAuthState,
  createPaidAccessToken,
  createPaidCookieOptions,
  createSessionCookieOptions,
  createSessionToken,
  getOAuthStateCookieOptions,
  OAUTH_STATE_COOKIE_NAME,
  PAID_COOKIE_NAME,
  SESSION_COOKIE_NAME
} from "@/lib/auth";
import { hasPaidEmail } from "@/lib/database";
import { exchangeCodeForToken, getDiscordOAuthUrl, getDiscordUserProfile } from "@/lib/discord";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");
  const baseUrl = getBaseUrl(request);

  if (oauthError) {
    return NextResponse.redirect(new URL(`/?auth=${encodeURIComponent(oauthError)}`, baseUrl));
  }

  if (!code) {
    const state = createOAuthState();
    const oauthUrl = getDiscordOAuthUrl(baseUrl, state);
    const response = NextResponse.redirect(oauthUrl);

    response.cookies.set(OAUTH_STATE_COOKIE_NAME, state, getOAuthStateCookieOptions());

    return response;
  }

  const state = url.searchParams.get("state");
  const storedState = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(new URL("/?auth=invalid_state", baseUrl));
  }

  try {
    const accessToken = await exchangeCodeForToken(code, baseUrl);
    const profile = await getDiscordUserProfile(accessToken);

    const response = NextResponse.redirect(new URL("/dashboard", baseUrl));

    response.cookies.set(
      SESSION_COOKIE_NAME,
      createSessionToken({
        userId: profile.id,
        username: profile.username,
        email: profile.email,
        avatarUrl: profile.avatarUrl
      }),
      createSessionCookieOptions()
    );

    response.cookies.delete(OAUTH_STATE_COOKIE_NAME);

    if (profile.email && (await hasPaidEmail(profile.email))) {
      response.cookies.set(
        PAID_COOKIE_NAME,
        createPaidAccessToken({
          userId: profile.id,
          email: profile.email
        }),
        createPaidCookieOptions()
      );
    } else {
      response.cookies.delete(PAID_COOKIE_NAME);
    }

    return response;
  } catch (error) {
    console.error("Discord OAuth failed", error);
    return NextResponse.redirect(new URL("/?auth=oauth_failed", baseUrl));
  }
}
