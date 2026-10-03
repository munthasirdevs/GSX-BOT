import { Message } from "discord.js";
import { redisClient } from "../queues/connection";
import { logger } from "../utils/logger";

const KEY_TTL_SECONDS = 48 * 60 * 60; // 48 Hours

export interface UserActivityStat {
  userId: string;
  tag: string;
  isBot: boolean;
  count: number;
}

export interface DailyActivitySummary {
  totalMessages: number;
  humanMessages: number;
  botMessages: number;
  topUsers: UserActivityStat[];
  topBots: UserActivityStat[];
  allTopUsersJson: UserActivityStat[];
  channelStatsJson: Record<string, number>;
  busiestChannelId: string | null;
}

export class ActivityTracker {
  /**
   * Helper to format UTC date string as YYYY-MM-DD
   */
  public static formatDate(date: Date = new Date()): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Record a single message into Redis in-memory counters (Zero DB locking)
   */
  public static async recordMessage(message: Message): Promise<void> {
    if (!message.guildId) return;

    try {
      const guildId = message.guildId;
      const dateStr = this.formatDate(message.createdAt);
      const userId = message.author.id;
      const isBot = message.author.bot;
      const channelId = message.channelId;

      const userKey = `activity:${guildId}:${dateStr}:users`;
      const typeKey = `activity:${guildId}:${dateStr}:types`;
      const channelKey = `activity:${guildId}:${dateStr}:channels`;
      const metaKey = `user_meta:${userId}`;

      const pipeline = redisClient.pipeline();

      // Increments
      pipeline.hincrby(userKey, userId, 1);
      pipeline.hincrby(typeKey, isBot ? "bot" : "human", 1);
      pipeline.hincrby(channelKey, channelId, 1);

      // Save user metadata
      pipeline.hset(metaKey, {
        tag: message.author.tag || message.author.username,
        isBot: isBot ? "true" : "false",
      });

      // Apply TTL to daily activity keys (48h)
      pipeline.expire(userKey, KEY_TTL_SECONDS);
      pipeline.expire(typeKey, KEY_TTL_SECONDS);
      pipeline.expire(channelKey, KEY_TTL_SECONDS);

      await pipeline.exec();
    } catch (error) {
      logger.error({ error, guildId: message.guildId }, "Failed to record message activity in Redis");
    }
  }

  /**
   * Extract and aggregate Redis metrics for a specific guild and date
   */
  public static async getDailySummary(
    guildId: string,
    dateStr: string
  ): Promise<DailyActivitySummary> {
    const userKey = `activity:${guildId}:${dateStr}:users`;
    const typeKey = `activity:${guildId}:${dateStr}:types`;
    const channelKey = `activity:${guildId}:${dateStr}:channels`;

    const [rawUsers, rawTypes, rawChannels] = await Promise.all([
      redisClient.hgetall(userKey),
      redisClient.hgetall(typeKey),
      redisClient.hgetall(channelKey),
    ]);

    const humanCount = parseInt(rawTypes["human"] || "0", 10);
    const botCount = parseInt(rawTypes["bot"] || "0", 10);
    const totalCount = humanCount + botCount;

    // Parse channel stats
    const channelStatsJson: Record<string, number> = {};
    let busiestChannelId: string | null = null;
    let maxChannelCount = -1;

    for (const [chId, countStr] of Object.entries(rawChannels)) {
      const cnt = parseInt(countStr, 10);
      channelStatsJson[chId] = cnt;
      if (cnt > maxChannelCount) {
        maxChannelCount = cnt;
        busiestChannelId = chId;
      }
    }

    // Parse user stats and resolve metadata from user_meta:<userId>
    const userEntries = Object.entries(rawUsers);
    const userStats: UserActivityStat[] = [];

    if (userEntries.length > 0) {
      const metaPipeline = redisClient.pipeline();
      for (const [uId] of userEntries) {
        metaPipeline.hgetall(`user_meta:${uId}`);
      }
      const metaResults = await metaPipeline.exec();

      userEntries.forEach(([uId, countStr], idx) => {
        const count = parseInt(countStr, 10);
        const meta = (metaResults && metaResults[idx] && metaResults[idx][1]) as Record<string, string> || {};
        const tag = meta.tag || `User-${uId}`;
        const isBot = meta.isBot === "true";

        userStats.push({
          userId: uId,
          tag,
          isBot,
          count,
        });
      });
    }

    // Sort descending by count
    userStats.sort((a, b) => b.count - a.count);

    const topUsers = userStats.filter((u) => !u.isBot).slice(0, 10);
    const topBots = userStats.filter((u) => u.isBot).slice(0, 5);

    return {
      totalMessages: totalCount,
      humanMessages: humanCount,
      botMessages: botCount,
      topUsers,
      topBots,
      allTopUsersJson: userStats.slice(0, 20),
      channelStatsJson,
      busiestChannelId,
    };
  }

  /**
   * Explicitly purge activity keys for a guild and date after persisting
   */
  public static async purgeDailyKeys(guildId: string, dateStr: string): Promise<void> {
    const userKey = `activity:${guildId}:${dateStr}:users`;
    const typeKey = `activity:${guildId}:${dateStr}:types`;
    const channelKey = `activity:${guildId}:${dateStr}:channels`;

    await redisClient.del(userKey, typeKey, channelKey);
  }
}
