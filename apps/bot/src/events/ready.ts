import { Client, Events } from "discord.js";
import { logger } from "../utils/logger";
import {
  initAnalyticsWorker,
  scheduleDailyAnalyticsJob,
} from "../queues/analyticsWorker";
import { initScheduleWorker } from "../queues/scheduleWorker";
import { SchedulerManager } from "../services/schedulerManager";

export const name = Events.ClientReady;
export const once = true;

export async function execute(client: Client) {
  logger.info(`Discord Bot logged in as ${client.user?.tag} (ID: ${client.user?.id})`);
  logger.info(`Active in ${client.guilds.cache.size} guilds`);

  try {
    // 1. Initialize BullMQ Workers
    initAnalyticsWorker(client);
    initScheduleWorker(client);
    logger.info("BullMQ queue workers initialized successfully");

    // 2. Schedule the 24-hour midnight UTC repeatable analytics job
    await scheduleDailyAnalyticsJob();

    // 3. Hydrate any pending database scheduled messages into BullMQ
    await SchedulerManager.hydratePendingSchedules();
  } catch (error) {
    logger.error({ error }, "Error during bot post-ready initialization");
  }
}
