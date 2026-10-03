import { Queue, Worker, Job } from "bullmq";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { prisma } from "@discord-hub/database";
import { redisConnectionOptions } from "./connection";
import { ActivityTracker, DailyActivitySummary } from "../services/activityTracker";
import { logger } from "../utils/logger";

export const ANALYTICS_QUEUE_NAME = "guild_analytics_queue";
export const analyticsQueue = new Queue(ANALYTICS_QUEUE_NAME, {
  connection: redisConnectionOptions,
});

/**
 * Setup the repeatable daily cron job at midnight UTC
 */
export async function scheduleDailyAnalyticsJob(): Promise<void> {
  // Clear any existing repeatable jobs with this name to avoid duplicates
  const repeatableJobs = await analyticsQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === "daily_24h_analytics_cycle") {
      await analyticsQueue.removeRepeatableByKey(job.key);
    }
  }

  // Schedule repeatable job at 00:00 UTC every day
  await analyticsQueue.add(
    "daily_24h_analytics_cycle",
    {},
    {
      repeat: {
        pattern: "0 0 * * *", // Midnight UTC
        utc: true,
      },
      jobId: "daily_24h_analytics_cycle",
    }
  );

  logger.info("Initialized 24-hour daily analytics repeatable BullMQ cron job (0 0 * * * UTC)");
}

/**
 * Executes analytics aggregation and report dispatch for a specific guild
 */
export async function processGuildAnalytics(
  guildId: string,
  dateStr: string,
  client: Client
): Promise<{ persisted: boolean; dispatched: boolean }> {
  try {
    const config = await prisma.guildConfig.findUnique({
      where: { id: guildId },
    });

    const summary: DailyActivitySummary = await ActivityTracker.getDailySummary(
      guildId,
      dateStr
    );

    // Parse date for database storage
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    // 1. Persist summary into PostgreSQL DailyAnalytics table
    await prisma.dailyAnalytics.create({
      data: {
        guildId,
        date: targetDate,
        totalMessages: summary.totalMessages,
        humanMessages: summary.humanMessages,
        botMessages: summary.botMessages,
        topUsersJson: summary.allTopUsersJson as any,
        channelStatsJson: summary.channelStatsJson as any,
      },
    });

    logger.info({ guildId, date: dateStr }, "Saved daily analytics record to database");

    // 2. Dispatch rich Discord Embed if reportChannelId is configured
    let dispatched = false;
    if (config?.reportChannelId) {
      try {
        const channel = await client.channels.fetch(config.reportChannelId);
        if (channel && channel.isTextBased()) {
          const textChannel = channel as TextChannel;

          const total = summary.totalMessages;
          const humanPct = total > 0 ? ((summary.humanMessages / total) * 100).toFixed(1) : "0";
          const botPct = total > 0 ? ((summary.botMessages / total) * 100).toFixed(1) : "0";

          // Format Top 5 Members
          const topMembersList = summary.topUsers.slice(0, 5).map((u, i) => {
            return `**${i + 1}.** <@${u.userId}> — \`${u.count}\` msgs`;
          }).join("\n") || "*No human message activity recorded.*";

          // Format Top 3 Bots
          const topBotsList = summary.topBots.slice(0, 3).map((b, i) => {
            return `**${i + 1}.** <@${b.userId}> — \`${b.count}\` msgs`;
          }).join("\n") || "*No bot message activity recorded.*";

          // Busiest channel
          const busiestChannelStr = summary.busiestChannelId
            ? `<#${summary.busiestChannelId}> (\`${summary.channelStatsJson[summary.busiestChannelId]} msgs\`)`
            : "*N/A*";

          const embed = new EmbedBuilder()
            .setTitle(`📊 24-Hour Server Activity Report`)
            .setDescription(`Activity analysis for **${dateStr} (UTC)**`)
            .setColor(0x5865f2) // Blurple
            .addFields(
              {
                name: "📈 Overview",
                value: `• **Total Messages:** \`${total}\`\n• 👤 **Humans:** \`${summary.humanMessages}\` (${humanPct}%)\n• 🤖 **Bots:** \`${summary.botMessages}\` (${botPct}%)`,
                inline: false,
              },
              {
                name: "🏆 Top 5 Active Members",
                value: topMembersList,
                inline: true,
              },
              {
                name: "🤖 Top 3 Active Bots",
                value: topBotsList,
                inline: true,
              },
              {
                name: "🔥 Busiest Channel",
                value: busiestChannelStr,
                inline: false,
              }
            )
            .setFooter({ text: "Discord Hub Analytics • Automated 24h Intelligence" })
            .setTimestamp();

          await textChannel.send({ embeds: [embed] });
          dispatched = true;
          logger.info({ guildId, channelId: config.reportChannelId }, "Dispatched daily analytics report embed");
        }
      } catch (sendError) {
        logger.error({ sendError, guildId }, "Failed to send report embed to configured channel");
      }
    }

    return { persisted: true, dispatched };
  } catch (error) {
    logger.error({ error, guildId, date: dateStr }, "Error processing guild analytics");
    throw error;
  }
}

/**
 * Initializes the BullMQ Analytics Worker
 */
export function initAnalyticsWorker(client: Client): Worker {
  const worker = new Worker(
    ANALYTICS_QUEUE_NAME,
    async (job: Job) => {
      logger.info({ jobId: job.id, jobName: job.name }, "Running daily analytics aggregation job");

      // Target previous day in UTC
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dateStr = ActivityTracker.formatDate(yesterday);

      // Fetch all registered guilds
      const configs = await prisma.guildConfig.findMany();

      for (const config of configs) {
        try {
          await processGuildAnalytics(config.id, dateStr, client);
        } catch (err) {
          logger.error({ err, guildId: config.id }, "Error processing daily analytics for guild");
        }
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 2,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Analytics worker completed job");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Analytics worker job failed");
  });

  return worker;
}
