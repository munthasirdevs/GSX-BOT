import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserGuilds, getGuildIconUrl } from "@/lib/discord";
import { Sidebar } from "@/components/ui/Sidebar";

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const session = await auth();
  if (!session?.user || !session.accessToken) {
    redirect("/api/auth/signin");
  }

  // Security check: verify user has permissions to this guild
  let userGuilds: any[] = [];
  try {
    userGuilds = await getUserGuilds(session.accessToken);
  } catch {
    redirect("/dashboard");
  }

  const currentGuild = userGuilds.find((g) => g.id === guildId);
  if (!currentGuild) {
    // Unauthorized or not an admin
    redirect("/dashboard");
  }

  const iconUrl = currentGuild.icon
    ? getGuildIconUrl(currentGuild.id, currentGuild.icon)
    : undefined;

  return (
    <div className="flex flex-1 min-h-[calc(100vh-4rem)]">
      <Sidebar
        guildId={guildId}
        guildName={currentGuild.name}
        guildIconUrl={iconUrl}
      />
      <main className="flex-1 p-6 lg:p-10 max-w-7xl w-full mx-auto overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
