import { NextRequest, NextResponse } from "next/server";

import { processDueSchedules } from "@/lib/scheduler";

export const runtime = "nodejs";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  const bearer = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");

  return bearer === `Bearer ${secret}` || headerSecret === secret;
}

async function runCron(request: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueSchedules();
  return NextResponse.json(result);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return runCron(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return runCron(request);
}
