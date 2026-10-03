import Link from "next/link";
import { auth } from "@/lib/auth";
import { getBotAllGuilds, getUserGuilds, getGuildIconUrl, DiscordGuild } from "@/lib/discord";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Bot, ArrowRight, PlusCircle, CheckCircle, ExternalLink, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardGuildSelectorPage() {
  const session = await auth();
  const clientId = process.env.DISCORD_CLIENT_ID || "1555595154184732672";

  // 1. Fetch bot's active guilds
  const botGuilds = await getBotAllGuilds();
  const botGuildMap = new Map<string, DiscordGuild>(botGuilds.map((g) => [g.id, g]));

  // 2. If user is signed in via Discord OAuth, fetch user's administrable guilds
  let userGuilds: DiscordGuild[] = [];
  if (session?.accessToken) {
    try {
      userGuilds = await getUserGuilds(session.accessToken);
    } catch {
      userGuilds = [];
    }
  }

  // 3. Categorize guilds
  // Connected guilds: bot is in these guilds
  const connectedGuilds: DiscordGuild[] = [];
  // Unconnected guilds: user is admin/owner, but bot is not in them yet
  const unconnectedGuilds: DiscordGuild[] = [];

  const seenIds = new Set<string>();

  // If user is logged in, their manageable guilds take precedence
  if (userGuilds.length > 0) {
    for (const ug of userGuilds) {
      seenIds.add(ug.id);
      if (botGuildMap.has(ug.id)) {
        connectedGuilds.push(botGuildMap.get(ug.id)!);
      } else {
        unconnectedGuilds.push(ug);
      }
    }
  }

  // Also include any bot guilds that the current user wasn't directly identified as admin for (e.g. system owner)
  for (const bg of botGuilds) {
    if (!seenIds.has(bg.id)) {
      connectedGuilds.push(bg);
      seenIds.add(bg.id);
    }
  }

  const defaultInviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-[#5865F2]" />
            Discord Server Control Center
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Manage announcements, deploy ticket systems, track real-time analytics, and monitor bot health
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2 text-gray-400 hover:text-white">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </Link>
          <a href={defaultInviteUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-2 text-indigo-400 hover:text-white">
              <PlusCircle className="w-4 h-4" />
              <span>Invite Bot</span>
            </Button>
          </a>
        </div>
      </div>

      {/* Connected Servers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Connected Servers ({connectedGuilds.length})
          </h2>
          <span className="text-xs text-gray-400">Click any server to launch its control center</span>
        </div>

        {connectedGuilds.length === 0 ? (
          <Card className="text-center py-14">
            <Bot className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">No Active Discord Servers Connected</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              Invite your bot to a Discord server with Administrator permissions to start managing it.
            </p>
            <a href={defaultInviteUrl} target="_blank" rel="noreferrer">
              <Button variant="primary" className="gap-2">
                <PlusCircle className="w-4 h-4" />
                <span>Invite Bot to Server</span>
              </Button>
            </a>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {connectedGuilds.map((guild) => {
              const iconUrl = getGuildIconUrl(guild.id, guild.icon);

              return (
                <Card
                  key={guild.id}
                  className="flex flex-col justify-between hover:border-[#5865F2]/50 transition-all group bg-[#16181d]/80 backdrop-blur-sm"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      {guild.icon ? (
                        <img
                          src={iconUrl}
                          alt={guild.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-md group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#5865F2] to-[#4752C4] flex items-center justify-center font-bold text-white text-lg shadow-md group-hover:scale-105 transition-transform">
                          {guild.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-white truncate">{guild.name}</h3>
                        <p className="text-[11px] text-gray-500 font-mono truncate">ID: {guild.id}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="success" className="text-[10px] px-2 py-0.5">
                            Bot Online
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <Link href={`/dashboard/${guild.id}/broadcast`}>
                      <Button variant="primary" className="w-full gap-2 shadow-lg shadow-[#5865F2]/20">
                        <span>Open Control Panel</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>

                    <div className="grid grid-cols-3 gap-1.5 text-xs">
                      <Link href={`/dashboard/${guild.id}/broadcast`}>
                        <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white px-1">
                          Messages
                        </Button>
                      </Link>
                      <Link href={`/dashboard/${guild.id}/tickets`}>
                        <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white px-1">
                          Tickets
                        </Button>
                      </Link>
                      <Link href={`/dashboard/${guild.id}/monitoring`}>
                        <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white px-1">
                          Monitor
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Available Servers to Add Bot (When User has logged in and has other guilds) */}
      {unconnectedGuilds.length > 0 && (
        <div className="space-y-4 pt-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-400" />
              Your Other Servers ({unconnectedGuilds.length})
            </h2>
            <span className="text-xs text-gray-400">Add bot to these servers to enable control panel</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {unconnectedGuilds.map((guild) => {
              const iconUrl = getGuildIconUrl(guild.id, guild.icon);
              const serverInviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&guild_id=${guild.id}&permissions=8&scope=bot%20applications.commands`;

              return (
                <Card
                  key={guild.id}
                  className="flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity bg-[#16181d]/50"
                >
                  <div className="flex items-center gap-4 mb-4">
                    {guild.icon ? (
                      <img
                        src={iconUrl}
                        alt={guild.name}
                        className="w-12 h-12 rounded-xl object-cover border border-white/10 grayscale group-hover:grayscale-0 transition-all"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-gray-300 text-sm">
                        {guild.name.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-200 truncate">{guild.name}</h3>
                      <p className="text-[11px] text-gray-500 font-mono truncate">ID: {guild.id}</p>
                      <div className="mt-1">
                        <Badge variant="neutral" className="text-[10px] text-gray-400 border-gray-700">
                          Not Installed
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <a href={serverInviteUrl} target="_blank" rel="noreferrer">
                    <Button variant="secondary" size="sm" className="w-full gap-2 text-indigo-400 hover:text-white">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Add Bot to Server</span>
                    </Button>
                  </a>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
