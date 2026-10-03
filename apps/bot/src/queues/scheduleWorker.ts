import { Queue, Worker, Job } from "bullmq";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { parseExpression } from "cron-parser";
import { prisma } from "@discord-hub/database";
import { redisConnectionOptions } from "./connection";
import { logger } from "../utils/logger";

export const SCHEDULE_QUEUE_NAME = "scheduled_messages_queue";
export const scheduleQueue = new Queue(SCHEDULE_QUEUE_NAME, {
  connection: redisConnectionOptions,
});

export interface ScheduleJobData {
  scheduleId: string;
}

/**
 * Enqueue a delayed job into BullMQ for a scheduled message
 */
export async function enqueueScheduledMessage(scheduleId: string, executeAt: Date): Promise<void> {
  const delay = Math.max(0, executeAt.getTime() - Date.now());

  await scheduleQueue.add(
    "send_scheduled_msg",
    { scheduleId },
    {
      delay,
      jobId: `schedule_${scheduleId}_${executeAt.getTime()}`,
      removeOnComplete: true,
      removeOnFail: false,
    }
  );

  logger.info({ scheduleId, executeAt: executeAt.toISOString(), delayMs: delay }, "Enqueued scheduled message into BullMQ");
}

/**
 * Initializes the BullMQ Scheduled Message Worker
 */
export function initScheduleWorker(client: Client): Worker {
  const worker = new Worker(
    SCHEDULE_QUEUE_NAME,
    async (job: Job<ScheduleJobData>) => {
      const { scheduleId } = job.data;
      logger.info({ jobId: job.id, scheduleId }, "Processing scheduled message execution");

      // 1. Resolve schedule from PostgreSQL
      const record = await prisma.scheduledMessage.findUnique({
        where: { id: scheduleId },
      });

      if (!record || !record.isActive) {
        logger.info({ scheduleId }, "Scheduled message is missing or inactive. Skipping.");
        return;
      }

      // 2. Fetch target Discord channel and dispatch payload
      try {
        const channel = await client.channels.fetch(record.channelId);
        if (!channel || !channel.isTextBased()) {
          logger.warn({ channelId: record.channelId }, "Target channel not found or not text-based");
          return;
        }

        const textChannel = channel as TextChannel;

        // Determine if content is structured JSON or plain text
        let sendPayload: any = {};
        let parsedJson: any = null;

        try {
          if (record.content.trim().startsWith("{") && record.content.trim().endsWith("}")) {
            parsedJson = JSON.parse(record.content);
          }
        } catch {
          parsedJson = null;
        }

        if (parsedJson && (parsedJson.embeds || parsedJson.content)) {
          sendPayload = parsedJson;
        } else if (record.title) {
          const embed = new EmbedBuilder()
            .setTitle(record.title)
            .setDescription(record.content)
            .setColor(0x5865f2)
            .setTimestamp();
          sendPayload = { embeds: [embed] };
        } else {
          sendPayload = { content: record.content };
        }

        await textChannel.send(sendPayload);
        logger.info({ scheduleId, channelId: record.channelId }, "Successfully dispatched scheduled message");

        // 3. Handle recurring vs one-time messages
        if (record.isRecurring && record.cronExpression) {
          try {
            const interval = parseExpression(record.cronExpression, {
              currentDate: new Date(),
              utc: true,
            });
            const nextExecution = interval.next().toDate();

            await prisma.scheduledMessage.update({
              where: { id: record.id },
              data: { executeAt: nextExecution },
            });

            await enqueueScheduledMessage(record.id, nextExecution);
            logger.info({ scheduleId: record.id, nextExecution: nextExecution.toISOString() }, "Rescheduled recurring message");
          } catch (cronErr) {
            logger.error({ cronErr, scheduleId: record.id }, "Failed to parse cron expression for recurring schedule");
          }
        } else {
          // One-time message: mark inactive
          await prisma.scheduledMessage.update({
            where: { id: record.id },
            data: { isActive: false },
          });
          logger.info({ scheduleId: record.id }, "Marked one-time scheduled message as completed");
        }
      } catch (dispatchErr) {
        logger.error({ dispatchErr, scheduleId }, "Failed to send scheduled message to Discord");
        throw dispatchErr;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: 5,
    }
  );

  worker.on("completed", (job) => {
    logger.info({ jobId: job.id }, "Schedule worker job completed");
  });

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Schedule worker job failed");
  });

  return worker;
}
