import Link from "next/link";
import { getBotAllGuilds, getGuildIconUrl } from "@/lib/discord";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Bot, ArrowRight, PlusCircle, ShieldCheck } from "lucide-react";

export default async function DashboardGuildSelectorPage() {
  const guilds = await getBotAllGuilds();

  const clientId = process.env.DISCORD_CLIENT_ID || "1555595154184732672";
  const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Bot className="w-8 h-8 text-[#5865F2]" />
            Bot Control Hub
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Select an active Discord server to manage messages, tickets, announcements, and monitoring
          </p>
        </div>

        <a href={inviteUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" className="gap-2 text-indigo-400 hover:text-white">
            <PlusCircle className="w-4 h-4" />
            <span>Invite Bot to Another Server</span>
          </Button>
        </a>
      </div>

      {guilds.length === 0 ? (
        <Card className="text-center py-16">
          <Bot className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-white mb-2">Bot Is Not in Any Server Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
            Invite your bot to your Discord server to start controlling it from this dashboard.
          </p>
          <a href={inviteUrl} target="_blank" rel="noreferrer">
            <Button variant="primary">Invite Bot Now</Button>
          </a>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {guilds.map((guild) => {
            const iconUrl = getGuildIconUrl(guild.id, guild.icon);

            return (
              <Card
                key={guild.id}
                className="flex flex-col justify-between hover:border-[#5865F2]/50 transition-all group"
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
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="success">Online & Ready</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 space-y-2">
                  <Link href={`/dashboard/${guild.id}/broadcast`}>
                    <Button variant="primary" className="w-full gap-2">
                      <span>Open Control Panel</span>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Link href={`/dashboard/${guild.id}/tickets`}>
                      <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white">
                        Tickets
                      </Button>
                    </Link>
                    <Link href={`/dashboard/${guild.id}/monitoring`}>
                      <Button variant="ghost" size="sm" className="w-full text-gray-400 hover:text-white">
                        Monitoring
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
  );
}
