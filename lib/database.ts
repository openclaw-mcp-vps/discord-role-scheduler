import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { DatabaseShape, PaymentRecord, RoleSchedule, ScheduleStatus } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = process.env.DATA_FILE_PATH ?? path.join(DATA_DIR, "store.json");

let writeQueue: Promise<void> = Promise.resolve();

const EMPTY_DB: DatabaseShape = {
  schedules: [],
  payments: [],
  processedWebhookEvents: []
};

async function ensureDatabaseFile(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });

  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, `${JSON.stringify(EMPTY_DB, null, 2)}\n`, "utf8");
  }
}

async function readDatabase(): Promise<DatabaseShape> {
  await ensureDatabaseFile();
  const raw = await readFile(DATA_FILE, "utf8");

  try {
    const parsed = JSON.parse(raw) as Partial<DatabaseShape>;
    return {
      schedules: parsed.schedules ?? [],
      payments: parsed.payments ?? [],
      processedWebhookEvents: parsed.processedWebhookEvents ?? []
    };
  } catch {
    return structuredClone(EMPTY_DB);
  }
}

async function writeDatabase(data: DatabaseShape): Promise<void> {
  await ensureDatabaseFile();
  await writeFile(DATA_FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function withDatabaseWrite<T>(fn: (db: DatabaseShape) => T | Promise<T>): Promise<T> {
  const operation = writeQueue
    .catch(() => undefined)
    .then(async () => {
      const db = await readDatabase();
      const result = await fn(db);
      await writeDatabase(db);
      return result;
    });

  writeQueue = operation.then(
    () => undefined,
    () => undefined
  );

  return operation;
}

export async function listSchedulesByCreator(createdBy: string): Promise<RoleSchedule[]> {
  const db = await readDatabase();
  return db.schedules
    .filter((schedule) => schedule.createdBy === createdBy)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createSchedule(
  input: Omit<RoleSchedule, "id" | "createdAt" | "updatedAt">
): Promise<RoleSchedule> {
  return withDatabaseWrite((db) => {
    const now = new Date().toISOString();
    const schedule: RoleSchedule = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now
    };

    db.schedules.push(schedule);
    return schedule;
  });
}

export async function updateSchedule(
  id: string,
  updater: (schedule: RoleSchedule) => RoleSchedule
): Promise<RoleSchedule | null> {
  return withDatabaseWrite((db) => {
    const index = db.schedules.findIndex((schedule) => schedule.id === id);

    if (index === -1) {
      return null;
    }

    const updated = updater(db.schedules[index]);
    updated.updatedAt = new Date().toISOString();
    db.schedules[index] = updated;
    return updated;
  });
}

export async function getScheduleById(id: string): Promise<RoleSchedule | null> {
  const db = await readDatabase();
  return db.schedules.find((schedule) => schedule.id === id) ?? null;
}

export async function listSchedulesByStatus(statuses: ScheduleStatus[]): Promise<RoleSchedule[]> {
  const statusSet = new Set(statuses);
  const db = await readDatabase();

  return db.schedules
    .filter((schedule) => statusSet.has(schedule.status))
    .sort((a, b) => new Date(a.endAt).getTime() - new Date(b.endAt).getTime());
}

export async function savePayment(email: string, eventId: string): Promise<PaymentRecord | null> {
  return withDatabaseWrite((db) => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || db.processedWebhookEvents.includes(eventId)) {
      return null;
    }

    db.processedWebhookEvents.push(eventId);

    const existing = db.payments.find((payment) => payment.email === normalizedEmail);

    if (existing) {
      return existing;
    }

    const payment: PaymentRecord = {
      id: randomUUID(),
      provider: "stripe",
      email: normalizedEmail,
      eventId,
      createdAt: new Date().toISOString()
    };

    db.payments.push(payment);
    return payment;
  });
}

export async function hasPaidEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    return false;
  }

  const db = await readDatabase();
  return db.payments.some((payment) => payment.email === normalizedEmail);
}

export async function cancelSchedulesForRole(guildId: string, roleId: string): Promise<number> {
  return withDatabaseWrite((db) => {
    let cancelled = 0;

    for (const schedule of db.schedules) {
      if (
        schedule.guildId === guildId &&
        schedule.roleId === roleId &&
        (schedule.status === "pending" || schedule.status === "active")
      ) {
        schedule.status = "cancelled";
        schedule.lastError = "Role was deleted or revoked at the server level.";
        schedule.updatedAt = new Date().toISOString();
        cancelled += 1;
      }
    }

    return cancelled;
  });
}

export async function overwriteSchedules(nextSchedules: RoleSchedule[]): Promise<void> {
  await withDatabaseWrite((db) => {
    db.schedules = nextSchedules.map((schedule) => ({
      ...schedule,
      updatedAt: new Date().toISOString()
    }));
  });
}
