import { redirect } from "next/navigation";
import { getBotGuild, getGuildIconUrl } from "@/lib/discord";
import { Sidebar } from "@/components/ui/Sidebar";

export const dynamic = "force-dynamic";

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  // Fetch guild directly via Bot Token
  const botGuild = await getBotGuild(guildId);

  const guildName = botGuild?.name || "Terminal GSX";
  const iconUrl = botGuild?.icon ? getGuildIconUrl(guildId, botGuild.icon) : undefined;

  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
      <Sidebar
        guildId={guildId}
        guildName={guildName}
        guildIconUrl={iconUrl}
      />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
