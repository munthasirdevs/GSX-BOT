export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
}

export interface DiscordChannel {
  id: string;
  name: string;
  type: number;
  parent_id?: string | null;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Checks if user has Administrator (0x8) or Manage Guild (0x20) permission
 */
export function hasAdminOrManagePermission(guild: DiscordGuild): boolean {
  if (guild.owner) return true;
  const permissions = BigInt(guild.permissions || "0");
  const ADMINISTRATOR = BigInt(0x8);
  const MANAGE_GUILD = BigInt(0x20);

  return (permissions & ADMINISTRATOR) === ADMINISTRATOR || (permissions & MANAGE_GUILD) === MANAGE_GUILD;
}

/**
 * Fetch guilds that the authenticated user belongs to
 */
export async function getUserGuilds(accessToken: string): Promise<DiscordGuild[]> {
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user guilds: ${res.statusText}`);
  }

  const guilds: DiscordGuild[] = await res.json();
  return guilds.filter(hasAdminOrManagePermission);
}

/**
 * Fetch all guilds the bot is currently in using Bot Token
 */
export async function getBotAllGuilds(): Promise<DiscordGuild[]> {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return [];

  try {
    const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: { revalidate: 15 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Check if the bot is a member of a guild and fetch basic metadata
 */
export async function getBotGuild(guildId: string): Promise<DiscordGuild | null> {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return null;

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch channels for a guild using Bot token
 */
export async function getGuildChannels(guildId: string): Promise<DiscordChannel[]> {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return [];

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Fetch roles for a guild using Bot token
 */
export async function getGuildRoles(guildId: string): Promise<DiscordRole[]> {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) return [];

  try {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/roles`, {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: { revalidate: 30 },
    });

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

/**
 * Construct Discord icon URL
 */
export function getGuildIconUrl(guildId: string, iconHash: string | null): string {
  if (!iconHash) return "/placeholder-server.png";
  const ext = iconHash.startsWith("a_") ? "gif" : "webp";
  return `https://cdn.discordapp.com/icons/${guildId}/${iconHash}.${ext}?size=128`;
}
