"use client";

import { RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface RoleOption {
  id: string;
  name: string;
  position: number;
}

interface RoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function RoleSelector({ value, onChange, disabled = false }: RoleSelectorProps) {
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/discord/roles", {
        method: "GET",
        cache: "no-store"
      });

      const body = (await response.json()) as { roles?: RoleOption[]; error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Failed to load server roles.");
      }

      setRoles(body.roles ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unable to fetch roles.");
      setRoles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRoles();
  }, [loadRoles]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor="roleId" className="text-sm font-medium text-[#dce7f5]">
          Role
        </label>
        <button
          type="button"
          onClick={() => void loadRoles()}
          disabled={loading || disabled}
          className="inline-flex items-center gap-1 text-xs text-[#8fb1cf] transition hover:text-[#cce2f8] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <select
        id="roleId"
        name="roleId"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled || loading}
        className="input-shell w-full rounded-xl px-3 py-2 text-sm"
      >
        <option value="">Select a role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>

      {loading && <p className="text-xs text-[#8aa0b9]">Loading roles from your Discord server...</p>}
      {error && <p className="text-xs text-[#ff9d9d]">{error}</p>}
    </div>
  );
}
