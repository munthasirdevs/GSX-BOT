import { prisma } from "@discord-hub/database";
import { AnalyticsCharts, AnalyticsRecord } from "@/components/AnalyticsCharts";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  // Fetch historical analytics records from PostgreSQL
  const dbRecords = await prisma.dailyAnalytics.findMany({
    where: { guildId },
    orderBy: { date: "asc" },
    take: 60,
  });

  const formattedHistory: AnalyticsRecord[] = dbRecords.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    totalMessages: r.totalMessages,
    humanMessages: r.humanMessages,
    botMessages: r.botMessages,
    topUsersJson: (r.topUsersJson as any) || [],
    channelStatsJson: (r.channelStatsJson as any) || {},
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Server Analytics</h1>
        <p className="text-sm text-gray-400 mt-1">
          Historical trends, human vs bot message distribution, and 24-hour activity snapshots
        </p>
      </div>

      <AnalyticsCharts history={formattedHistory} />
    </div>
  );
}
