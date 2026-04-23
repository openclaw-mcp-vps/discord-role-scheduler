import cron, { type ScheduledTask } from "node-cron";

import { listSchedulesByStatus, updateSchedule } from "@/lib/database";
import { addRoleToMember, removeRoleFromMember } from "@/lib/discord";

export interface SchedulerRunResult {
  checked: number;
  activated: number;
  completed: number;
  skipped: number;
  failed: number;
  at: string;
}

export async function processDueSchedules(now = new Date()): Promise<SchedulerRunResult> {
  const schedules = await listSchedulesByStatus(["pending", "active"]);

  let activated = 0;
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (const schedule of schedules) {
    const startAt = new Date(schedule.startAt);
    const endAt = new Date(schedule.endAt);

    if (schedule.status === "pending") {
      if (endAt <= now) {
        await updateSchedule(schedule.id, (current) => ({
          ...current,
          status: "completed",
          lastError: "Skipped because the scheduled window already ended before execution."
        }));
        skipped += 1;
        continue;
      }

      if (startAt <= now) {
        try {
          await addRoleToMember(
            schedule.guildId,
            schedule.memberId,
            schedule.roleId,
            `Scheduled grant by Discord Role Scheduler (${schedule.id})`
          );

          await updateSchedule(schedule.id, (current) => ({
            ...current,
            status: "active",
            lastError: undefined
          }));
          activated += 1;
        } catch (error) {
          await updateSchedule(schedule.id, (current) => ({
            ...current,
            status: "failed",
            lastError: error instanceof Error ? error.message : "Unknown error while assigning role."
          }));
          failed += 1;
        }
      }

      continue;
    }

    if (schedule.status === "active" && endAt <= now) {
      try {
        await removeRoleFromMember(
          schedule.guildId,
          schedule.memberId,
          schedule.roleId,
          `Scheduled revoke by Discord Role Scheduler (${schedule.id})`
        );

        await updateSchedule(schedule.id, (current) => ({
          ...current,
          status: "completed",
          lastError: undefined
        }));

        completed += 1;
      } catch (error) {
        await updateSchedule(schedule.id, (current) => ({
          ...current,
          status: "failed",
          lastError: error instanceof Error ? error.message : "Unknown error while removing role."
        }));
        failed += 1;
      }
    }
  }

  return {
    checked: schedules.length,
    activated,
    completed,
    skipped,
    failed,
    at: now.toISOString()
  };
}

let schedulerTask: ScheduledTask | null = null;

export function startInProcessScheduler(): void {
  if (schedulerTask) {
    return;
  }

  schedulerTask = cron.schedule(
    "*/1 * * * *",
    async () => {
      try {
        await processDueSchedules();
      } catch (error) {
        console.error("Failed cron tick", error);
      }
    },
    {
      timezone: "UTC"
    }
  );
}

export function stopInProcessScheduler(): void {
  schedulerTask?.stop();
  schedulerTask = null;
}
