import { NextRequest, NextResponse } from "next/server";

import { cancelSchedulesForRole } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const expectedSecret = process.env.DISCORD_WEBHOOK_SECRET;

  if (expectedSecret) {
    const provided = request.headers.get("x-discord-webhook-secret");

    if (provided !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized webhook signature." }, { status: 401 });
    }
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const event = payload as {
    type?: string;
    event?: string;
    data?: { guildId?: string; roleId?: string };
  };

  if (event.type === "PING") {
    return NextResponse.json({ type: "PONG" });
  }

  if (event.event === "role.deleted" && event.data?.guildId && event.data?.roleId) {
    const cancelled = await cancelSchedulesForRole(event.data.guildId, event.data.roleId);
    return NextResponse.json({ received: true, cancelledSchedules: cancelled });
  }

  return NextResponse.json({ received: true });
}
