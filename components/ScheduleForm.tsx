"use client";

import { Loader2, Play, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import RoleSelector from "@/components/RoleSelector";
import type { RoleSchedule } from "@/lib/types";

interface ScheduleFormProps {
  initialSchedules: RoleSchedule[];
}

function toDatetimeLocalValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - offset);
  return localDate.toISOString().slice(0, 16);
}

function statusClass(status: RoleSchedule["status"]): string {
  if (status === "pending") {
    return "status-pending";
  }

  if (status === "active") {
    return "status-active";
  }

  if (status === "completed") {
    return "status-completed";
  }

  return "status-cancelled";
}

export default function ScheduleForm({ initialSchedules }: ScheduleFormProps) {
  const now = useMemo(() => new Date(), []);
  const [memberId, setMemberId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [startAt, setStartAt] = useState(toDatetimeLocalValue(new Date(now.getTime() + 5 * 60_000)));
  const [endAt, setEndAt] = useState(toDatetimeLocalValue(new Date(now.getTime() + 65 * 60_000)));
  const [reason, setReason] = useState("Event access window");
  const [schedules, setSchedules] = useState<RoleSchedule[]>(initialSchedules);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshSchedules(): Promise<void> {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/schedules", {
        method: "GET",
        cache: "no-store"
      });
      const body = (await response.json()) as { schedules?: RoleSchedule[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to refresh schedules.");
      }

      setSchedules(body.schedules ?? []);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh schedules.");
    } finally {
      setRefreshing(false);
    }
  }

  async function createSchedule(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          memberId: memberId.trim(),
          roleId,
          startAt: new Date(startAt).toISOString(),
          endAt: new Date(endAt).toISOString(),
          reason: reason.trim()
        })
      });

      const body = (await response.json()) as {
        schedule?: RoleSchedule;
        error?: string;
        detail?: string;
      };

      if (!response.ok) {
        throw new Error(body.error ?? body.detail ?? "Could not create schedule.");
      }

      if (body.schedule) {
        setSchedules((current) => [body.schedule!, ...current]);
      }

      setMessage("Schedule created successfully.");
      setMemberId("");
      setRoleId("");
      setReason("Event access window");
      setStartAt(toDatetimeLocalValue(new Date(Date.now() + 5 * 60_000)));
      setEndAt(toDatetimeLocalValue(new Date(Date.now() + 65 * 60_000)));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create schedule.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelSchedule(id: string): Promise<void> {
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/schedules?id=${encodeURIComponent(id)}`, {
        method: "DELETE"
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not cancel schedule.");
      }

      setSchedules((current) =>
        current.map((schedule) => (schedule.id === id ? { ...schedule, status: "cancelled" } : schedule))
      );
      setMessage("Schedule cancelled.");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel schedule.");
    }
  }

  async function runNow(): Promise<void> {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/cron", {
        method: "POST"
      });
      const body = (await response.json()) as {
        error?: string;
        checked?: number;
        activated?: number;
        completed?: number;
      };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not trigger cron processing.");
      }

      setMessage(
        `Processed ${body.checked ?? 0} schedules. Activated ${body.activated ?? 0}, completed ${body.completed ?? 0}.`
      );
      await refreshSchedules();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "Could not trigger cron processing.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createSchedule} className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Create Role Schedule</h2>
        <p className="text-sm text-[#9eb0c6]">
          Set the member, role, and timeline. The bot assigns and then revokes automatically.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#dce7f5]">Discord Member ID</span>
            <input
              type="text"
              value={memberId}
              onChange={(event) => setMemberId(event.target.value)}
              placeholder="Example: 246813579024681357"
              className="input-shell w-full rounded-xl px-3 py-2 text-sm"
              required
            />
          </label>

          <RoleSelector value={roleId} onChange={setRoleId} disabled={loading} />

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#dce7f5]">Start Time</span>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
              className="input-shell w-full rounded-xl px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#dce7f5]">End Time</span>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
              className="input-shell w-full rounded-xl px-3 py-2 text-sm"
              required
            />
          </label>
        </div>

        <label className="space-y-2">
          <span className="text-sm font-medium text-[#dce7f5]">Reason / Context</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="input-shell min-h-20 w-full rounded-xl px-3 py-2 text-sm"
            required
            maxLength={220}
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading}
            className="button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Schedule
          </button>

          <button
            type="button"
            onClick={() => void runNow()}
            disabled={refreshing}
            className="button-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          >
            <Play className="h-4 w-4" />
            Run Due Jobs Now
          </button>

          <button
            type="button"
            onClick={() => void refreshSchedules()}
            disabled={refreshing}
            className="button-secondary rounded-xl px-4 py-2.5 text-sm"
          >
            {refreshing ? "Refreshing..." : "Refresh List"}
          </button>
        </div>

        {message ? <p className="text-sm text-[#8ee1bf]">{message}</p> : null}
        {error ? <p className="text-sm text-[#ff9d9d]">{error}</p> : null}
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Your Schedules</h3>
          <span className="text-xs text-[#8fa7c1]">{schedules.length} total</span>
        </div>

        {schedules.length === 0 ? (
          <div className="card p-5 text-sm text-[#9eb0c6]">
            No schedules yet. Create one above to automate your next event access window.
          </div>
        ) : (
          <div className="grid gap-3">
            {schedules.map((schedule) => (
              <article key={schedule.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">Member `{schedule.memberId}`</p>
                    <p className="mt-1 text-xs text-[#9eb0c6]">Role `{schedule.roleId}`</p>
                  </div>

                  <span className={`status-pill rounded-full px-2.5 py-1 text-xs font-medium ${statusClass(schedule.status)}`}>
                    {schedule.status}
                  </span>
                </div>

                <p className="mt-3 text-sm text-[#cfdfee]">{schedule.reason}</p>

                <div className="mt-3 grid gap-2 text-xs text-[#90a8c3] sm:grid-cols-2">
                  <p>Starts: {new Date(schedule.startAt).toLocaleString()}</p>
                  <p>Ends: {new Date(schedule.endAt).toLocaleString()}</p>
                </div>

                {schedule.lastError ? (
                  <p className="mt-2 text-xs text-[#ff9d9d]">Last error: {schedule.lastError}</p>
                ) : null}

                {(schedule.status === "pending" || schedule.status === "active") && (
                  <button
                    type="button"
                    onClick={() => void cancelSchedule(schedule.id)}
                    className="button-secondary mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Cancel Schedule
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
