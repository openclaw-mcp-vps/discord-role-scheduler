import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import type { AuthSession, PaidAccessToken } from "@/lib/types";

export const SESSION_COOKIE_NAME = "drs_session";
export const OAUTH_STATE_COOKIE_NAME = "drs_oauth_state";
export const PAID_COOKIE_NAME = "drs_paid";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const PAID_MAX_AGE_SECONDS = 60 * 60 * 24 * 60;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

function getSessionSecret(): string {
  return process.env.SESSION_SECRET ?? "dev_only_session_secret_change_me";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSessionSecret()).update(encodedPayload).digest("base64url");
}

function encodeSignedToken(payload: Record<string, unknown>): string {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function decodeSignedToken<T extends { expiresAt: number }>(token?: string): T | null {
  if (!token) {
    return null;
  }

  const [encodedPayload, providedSignature] = token.split(".");

  if (!encodedPayload || !providedSignature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(fromBase64Url(encodedPayload)) as T;

    if (Date.now() > parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function createOAuthState(): string {
  return randomBytes(20).toString("hex");
}

export function getOAuthStateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: OAUTH_STATE_MAX_AGE_SECONDS
  };
}

export function createSessionToken(input: {
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}): string {
  const payload: AuthSession = {
    ...input,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  };

  return encodeSignedToken(payload as unknown as Record<string, unknown>);
}

export function createSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}

export function verifySessionToken(token?: string): AuthSession | null {
  return decodeSignedToken<AuthSession>(token);
}

export function createPaidAccessToken(input: { userId: string; email?: string }): string {
  const payload: PaidAccessToken = {
    ...input,
    expiresAt: Date.now() + PAID_MAX_AGE_SECONDS * 1000
  };

  return encodeSignedToken(payload as unknown as Record<string, unknown>);
}

export function createPaidCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: PAID_MAX_AGE_SECONDS
  };
}

export function verifyPaidAccessToken(token?: string): PaidAccessToken | null {
  return decodeSignedToken<PaidAccessToken>(token);
}

export function getSessionFromRequest(request: NextRequest): AuthSession | null {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function hasPaidAccessInRequest(request: NextRequest, userId: string): boolean {
  const paid = verifyPaidAccessToken(request.cookies.get(PAID_COOKIE_NAME)?.value);
  return Boolean(paid && paid.userId === userId);
}

export async function getSessionFromServer(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export async function hasPaidAccessFromServer(userId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const paid = verifyPaidAccessToken(cookieStore.get(PAID_COOKIE_NAME)?.value);
  return Boolean(paid && paid.userId === userId);
}
