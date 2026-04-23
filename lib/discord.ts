import type { DiscordRole } from "@/lib/types";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
}

interface DiscordUserResponse {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
  email?: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getDiscordApiBaseUrl(): string {
  return "https://discord.com/api/v10";
}

function getBotToken(): string {
  return getRequiredEnv("DISCORD_BOT_TOKEN");
}

function getOAuthClientId(): string {
  return getRequiredEnv("DISCORD_CLIENT_ID");
}

function getOAuthClientSecret(): string {
  return getRequiredEnv("DISCORD_CLIENT_SECRET");
}

async function discordBotRequest<T>(
  endpoint: string,
  init: RequestInit = {},
  reason?: string
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bot ${getBotToken()}`);

  if (reason) {
    headers.set("X-Audit-Log-Reason", encodeURIComponent(reason));
  }

  const response = await fetch(`${getDiscordApiBaseUrl()}${endpoint}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Discord API error (${response.status}): ${message}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function getDiscordOAuthUrl(baseUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: getOAuthClientId(),
    response_type: "code",
    redirect_uri: `${baseUrl}/api/auth/discord`,
    scope: "identify email",
    state,
    prompt: "consent"
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string, baseUrl: string): Promise<string> {
  const params = new URLSearchParams({
    client_id: getOAuthClientId(),
    client_secret: getOAuthClientSecret(),
    grant_type: "authorization_code",
    code,
    redirect_uri: `${baseUrl}/api/auth/discord`
  });

  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params.toString(),
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Discord token exchange failed (${response.status}): ${errorBody}`);
  }

  const tokenData = (await response.json()) as DiscordTokenResponse;
  return tokenData.access_token;
}

export async function getDiscordUserProfile(accessToken: string): Promise<{
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}> {
  const response = await fetch(`${getDiscordApiBaseUrl()}/users/@me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to load Discord user profile (${response.status}): ${errorBody}`);
  }

  const user = (await response.json()) as DiscordUserResponse;
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
    : undefined;

  return {
    id: user.id,
    username: user.global_name ?? user.username,
    email: user.email,
    avatarUrl
  };
}

export async function listGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const roles = await discordBotRequest<DiscordRole[]>(`/guilds/${guildId}/roles`);

  return roles
    .filter((role) => role.name !== "@everyone")
    .sort((a, b) => b.position - a.position);
}

export async function addRoleToMember(
  guildId: string,
  memberId: string,
  roleId: string,
  reason: string
): Promise<void> {
  await discordBotRequest<void>(
    `/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
    {
      method: "PUT"
    },
    reason
  );
}

export async function removeRoleFromMember(
  guildId: string,
  memberId: string,
  roleId: string,
  reason: string
): Promise<void> {
  await discordBotRequest<void>(
    `/guilds/${guildId}/members/${memberId}/roles/${roleId}`,
    {
      method: "DELETE"
    },
    reason
  );
}
