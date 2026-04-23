import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getSessionFromRequest, hasPaidAccessInRequest } from "@/lib/auth";
import { createSchedule, getScheduleById, listSchedulesByCreator, updateSchedule } from "@/lib/database";
import { addRoleToMember, removeRoleFromMember } from "@/lib/discord";

export const runtime = "nodejs";

const createScheduleSchema = z.object({
  memberId: z.string().min(5, "Member ID is required."),
  roleId: z.string().min(5, "Role is required."),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  reason: z.string().trim().min(8, "Reason should be at least 8 characters.").max(220)
});

function getGuildId(): string {
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!guildId) {
    throw new Error("Missing DISCORD_GUILD_ID environment variable.");
  }

  return guildId;
}

function assertAuthorized(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) };
  }

  if (!hasPaidAccessInRequest(request, session.userId)) {
    return {
      error: NextResponse.json(
        { error: "Active subscription required. Complete checkout and unlock access first." },
        { status: 402 }
      )
    };
  }

  return { session };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = assertAuthorized(request);

  if (auth.error) {
    return auth.error;
  }

  const schedules = await listSchedulesByCreator(auth.session.userId);

  return NextResponse.json({ schedules });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = assertAuthorized(request);

  if (auth.error) {
    return auth.error;
  }

  const body = await request.json();
  const parsed = createScheduleSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const payload = parsed.data;
  const startAt = new Date(payload.startAt);
  const endAt = new Date(payload.endAt);

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Invalid schedule dates." }, { status: 400 });
  }

  if (startAt >= endAt) {
    return NextResponse.json({ error: "End time must be after start time." }, { status: 400 });
  }

  if (endAt <= new Date()) {
    return NextResponse.json({ error: "End time must be in the future." }, { status: 400 });
  }

  const shouldStartImmediately = startAt <= new Date();
  const schedule = await createSchedule({
    guildId: getGuildId(),
    memberId: payload.memberId,
    roleId: payload.roleId,
    startAt: startAt.toISOString(),
    endAt: endAt.toISOString(),
    reason: payload.reason,
    status: shouldStartImmediately ? "active" : "pending",
    createdBy: auth.session.userId,
    lastError: undefined
  });

  if (shouldStartImmediately) {
    try {
      await addRoleToMember(
        schedule.guildId,
        schedule.memberId,
        schedule.roleId,
        `Immediate grant from dashboard schedule (${schedule.id})`
      );
    } catch (error) {
      const failed = await updateSchedule(schedule.id, (current) => ({
        ...current,
        status: "failed",
        lastError: error instanceof Error ? error.message : "Failed to assign role immediately."
      }));

      return NextResponse.json(
        {
          error: "Could not assign role immediately. Check bot permissions and role hierarchy.",
          schedule: failed
        },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ schedule }, { status: 201 });
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const auth = assertAuthorized(request);

  if (auth.error) {
    return auth.error;
  }

  const scheduleId = request.nextUrl.searchParams.get("id");

  if (!scheduleId) {
    return NextResponse.json({ error: "Schedule id is required." }, { status: 400 });
  }

  const existing = await getScheduleById(scheduleId);

  if (!existing || existing.createdBy !== auth.session.userId) {
    return NextResponse.json({ error: "Schedule not found." }, { status: 404 });
  }

  if (existing.status === "active") {
    try {
      await removeRoleFromMember(
        existing.guildId,
        existing.memberId,
        existing.roleId,
        `Manual cancellation from dashboard (${existing.id})`
      );
    } catch (error) {
      await updateSchedule(existing.id, (current) => ({
        ...current,
        status: "failed",
        lastError: error instanceof Error ? error.message : "Failed to remove active role during cancel."
      }));

      return NextResponse.json(
        {
          error: "Could not remove active role while cancelling the schedule.",
          detail: "Bot permissions or role hierarchy prevented revocation."
        },
        { status: 502 }
      );
    }
  }

  const cancelled = await updateSchedule(existing.id, (current) => ({
    ...current,
    status: "cancelled",
    lastError: undefined
  }));

  return NextResponse.json({ schedule: cancelled });
}
