import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserGuilds, getBotGuild, getGuildIconUrl } from "@/lib/discord";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Bot, ArrowRight, PlusCircle, ShieldAlert } from "lucide-react";

export default async function DashboardGuildSelectorPage() {
  const session = await auth();

  let guilds: any[] = [];
  let errorMsg = "";

  if (session?.accessToken) {
    try {
      guilds = await getUserGuilds(session.accessToken);
    } catch (err: any) {
      errorMsg = err.message || "Failed to load Discord servers.";
    }
  }

  // Check bot presence in parallel for each guild
  const botPresenceMap: Record<string, boolean> = {};
  if (guilds.length > 0) {
    await Promise.all(
      guilds.map(async (g) => {
        const botGuild = await getBotGuild(g.id);
        botPresenceMap[g.id] = botGuild !== null;
      })
    );
  }

  const clientId = process.env.DISCORD_CLIENT_ID || "";
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Select a Server</h1>
        <p className="text-gray-400 text-sm mt-1">
          Servers where you hold Administrator or Manage Server permissions
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {guilds.length === 0 && !errorMsg ? (
        <Card className="text-center py-16">
          <Bot className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">No Manageable Servers Found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            You must have Administrator or Manage Server permissions in a Discord guild to access its dashboard.
          </p>
          <a href="https://discord.com" target="_blank" rel="noreferrer">
            <Button variant="primary">Create or Join a Discord Server</Button>
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {guilds.map((guild) => {
            const hasBot = botPresenceMap[guild.id] ?? false;
            const iconUrl = getGuildIconUrl(guild.id, guild.icon);

            return (
              <Card
                key={guild.id}
                className="flex flex-col justify-between hover:border-white/20 transition-all group"
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
                      <div className="mt-1">
                        {hasBot ? (
                          <Badge variant="success">Bot Installed</Badge>
                        ) : (
                          <Badge variant="warning">Bot Not Present</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5">
                  {hasBot ? (
                    <Link href={`/dashboard/${guild.id}/analytics`}>
                      <Button variant="primary" className="w-full gap-2">
                        <span>Open Dashboard</span>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  ) : (
                    <a
                      href={`${inviteUrl}&guild_id=${guild.id}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button variant="outline" className="w-full gap-2 text-indigo-400 hover:text-white">
                        <PlusCircle className="w-4 h-4" />
                        <span>Invite Bot to Server</span>
                      </Button>
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
