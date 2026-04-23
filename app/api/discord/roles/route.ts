import { NextRequest, NextResponse } from "next/server";

import { getSessionFromRequest, hasPaidAccessInRequest } from "@/lib/auth";
import { listGuildRoles } from "@/lib/discord";

export const runtime = "nodejs";

function getGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId) {
    throw new Error("Missing DISCORD_GUILD_ID environment variable.");
  }

  return guildId;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!hasPaidAccessInRequest(request, session.userId)) {
    return NextResponse.json({ error: "Active subscription required." }, { status: 402 });
  }

  try {
    const roles = await listGuildRoles(getGuildId());
    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Failed to fetch Discord roles", error);
    return NextResponse.json(
      {
        error: "Could not load roles. Ensure the bot is in your server and has Manage Roles permissions."
      },
      { status: 502 }
    );
  }
}
