import Redis from "ioredis";
import { prisma, TicketStatus } from "@discord-hub/database";
import { SystemMonitoringView } from "@/components/SystemMonitoringView";

const DISCORD_API = "https://discord.com/api/v10";
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ guildId: string }> | { guildId: string };
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  // 1. Measure Discord REST API latency
  let botPingMs = 0;
  const botToken = process.env.DISCORD_TOKEN;
  if (botToken) {
    const start = Date.now();
    try {
      await fetch(`${DISCORD_API}/users/@me`, {
        headers: { Authorization: `Bot ${botToken}` },
        cache: "no-store",
      });
      botPingMs = Date.now() - start;
    } catch {
      botPingMs = -1;
    }
  }

  // 2. Measure MySQL database latency and row counts
  const dbStart = Date.now();
  const [ticketCount, openTicketCount, scheduleCount, analyticsCount] = await Promise.all([
    prisma.ticket.count({ where: { guildId } }),
    prisma.ticket.count({ where: { guildId, status: TicketStatus.OPEN } }),
    prisma.scheduledMessage.count({ where: { guildId, isActive: true } }),
    prisma.dailyAnalytics.count({ where: { guildId } }),
  ]);
  const dbPingMs = Date.now() - dbStart;

  // 3. Fetch live Redis counters for today
  let redisHealthy = false;
  let todayStats = { total: 0, humans: 0, bots: 0, channelCount: 0 };

  try {
    const redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });
    await redis.connect();

    const todayStr = new Date().toISOString().split("T")[0];
    const typeKey = `activity:${guildId}:${todayStr}:types`;
    const channelKey = `activity:${guildId}:${todayStr}:channels`;

    const [typesRaw, channelsRaw] = await Promise.all([
      redis.hgetall(typeKey),
      redis.hgetall(channelKey),
    ]);

    const humans = parseInt(typesRaw["human"] || "0", 10);
    const bots = parseInt(typesRaw["bot"] || "0", 10);
    const channelCount = Object.keys(channelsRaw).length;

    todayStats = {
      total: humans + bots,
      humans,
      bots,
      channelCount,
    };
    redisHealthy = true;
    redis.disconnect();
  } catch (err) {
    redisHealthy = false;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">System & Bot Monitoring</h1>
        <p className="text-sm text-gray-400 mt-1">
          Live infrastructure telemetry, Redis message ingestion buffers, and database status
        </p>
      </div>

      <SystemMonitoringView
        guildId={guildId}
        botPingMs={botPingMs}
        dbPingMs={dbPingMs}
        redisHealthy={redisHealthy}
        todayStats={todayStats}
        dbTotals={{
          tickets: ticketCount,
          openTickets: openTicketCount,
          schedules: scheduleCount,
          analyticsSnapshots: analyticsCount,
        }}
      />
    </div>
  );
}
