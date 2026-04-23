export type ScheduleStatus = "pending" | "active" | "completed" | "cancelled" | "failed";

export interface RoleSchedule {
  id: string;
  guildId: string;
  memberId: string;
  roleId: string;
  startAt: string;
  endAt: string;
  reason: string;
  status: ScheduleStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface PaymentRecord {
  id: string;
  provider: "stripe";
  email: string;
  eventId: string;
  createdAt: string;
}

export interface DatabaseShape {
  schedules: RoleSchedule[];
  payments: PaymentRecord[];
  processedWebhookEvents: string[];
}

export interface AuthSession {
  userId: string;
  username: string;
  email?: string;
  avatarUrl?: string;
  expiresAt: number;
}

export interface PaidAccessToken {
  userId: string;
  email?: string;
  expiresAt: number;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}
