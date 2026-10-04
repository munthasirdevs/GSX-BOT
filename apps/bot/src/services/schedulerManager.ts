import { z } from "zod";
import { parseExpression } from "cron-parser";
import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { prisma, ScheduledMessage } from "@discord-hub/database";
import { enqueueScheduledMessage, scheduleQueue } from "../queues/scheduleWorker";
import { logger } from "../utils/logger";

export const CreateScheduleSchema = z.object({
  guildId: z.string().min(1, "Guild ID is required"),
  channelId: z.string().min(1, "Channel ID is required"),
  title: z.string().optional().nullable(),
  content: z.string().min(1, "Message content is required"),
  cronExpression: z.string().optional().nullable(),
  executeAt: z.date(),
  isRecurring: z.boolean().default(false),
  createdById: z.string().min(1, "Creator ID is required"),
});

export type CreateScheduleInput = z.infer<typeof CreateScheduleSchema>;

export class SchedulerManager {
  /**
   * Create a new scheduled message in DB and register delayed job in BullMQ
   */
  public static async createSchedule(input: CreateScheduleInput): Promise<ScheduledMessage> {
    const validated = CreateScheduleSchema.parse(input);

    // Validate cron expression if recurring
    if (validated.isRecurring && validated.cronExpression) {
      try {
        parseExpression(validated.cronExpression);
      } catch (err) {
        throw new Error(`Invalid cron expression format: ${validated.cronExpression}`);
      }
    }

    // Ensure GuildConfig exists
    await prisma.guildConfig.upsert({
      where: { id: validated.guildId },
      update: {},
      create: { id: validated.guildId },
    });

    const record = await prisma.scheduledMessage.create({
      data: {
        guildId: validated.guildId,
        channelId: validated.channelId,
        title: validated.title,
        content: validated.content,
        cronExpression: validated.cronExpression,
        executeAt: validated.executeAt,
        isRecurring: validated.isRecurring,
        isActive: true,
        createdById: validated.createdById,
      },
    });

    await enqueueScheduledMessage(record.id, record.executeAt);
    return record;
  }

  /**
   * Dispatches a single scheduled or buffered message to Discord
   */
  public static async dispatchMessage(client: Client, scheduleId: string): Promise<boolean> {
    const record = await prisma.scheduledMessage.findUnique({
      where: { id: scheduleId },
      include: { guild: true },
    });

    if (!record || !record.isActive) {
      return false;
    }

    // Check if buffer is paused for this guild
    const isBuffer = !record.isRecurring && !record.cronExpression;
    if (isBuffer && record.guild?.bufferPaused) {
      logger.info({ scheduleId, guildId: record.guildId }, "Buffer paused for guild; skipping delivery");
      return false;
    }

    try {
      const channel = await client.channels.fetch(record.channelId);
      if (!channel || !channel.isTextBased()) {
        logger.warn({ channelId: record.channelId }, "Target channel not text-based or accessible");
        return false;
      }

      const textChannel = channel as TextChannel;

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
      logger.info({ scheduleId, channelId: record.channelId }, "Successfully dispatched message to Discord");

      if (record.isRecurring && record.cronExpression) {
        try {
          const interval = parseExpression(record.cronExpression, {
            currentDate: new Date(),
            utc: true,
          });
          const nextExec = interval.next().toDate();
          await prisma.scheduledMessage.update({
            where: { id: record.id },
            data: { executeAt: nextExec },
          });
          await enqueueScheduledMessage(record.id, nextExec);
          logger.info({ scheduleId: record.id, nextExec: nextExec.toISOString() }, "Rescheduled recurring message");
        } catch (cronErr) {
          logger.error({ cronErr, scheduleId: record.id }, "Failed to reschedule recurring job");
        }
      } else {
        await prisma.scheduledMessage.update({
          where: { id: record.id },
          data: { isActive: false },
        });
      }

      return true;
    } catch (err) {
      logger.error({ err, scheduleId }, "Error sending message to Discord channel");
      throw err;
    }
  }

  /**
   * Resilient background ticker to ensure due messages are never missed or delayed,
   * even if Redis restarts or delayed jobs shift.
   */
  public static startBufferDispatcher(client: Client, intervalMs = 15000): NodeJS.Timeout {
    logger.info({ intervalMs }, "Starting Scheduler & Buffer resilient background dispatcher");

    return setInterval(async () => {
      try {
        const now = new Date();
        const dueMessages = await prisma.scheduledMessage.findMany({
          where: {
            isActive: true,
            executeAt: { lte: now },
          },
          include: { guild: true },
          orderBy: { executeAt: "asc" },
          take: 10,
        });

        for (const msg of dueMessages) {
          try {
            await SchedulerManager.dispatchMessage(client, msg.id);
          } catch (err) {
            logger.error({ err, msgId: msg.id }, "Error dispatching due message in background ticker");
          }
        }
      } catch (err) {
        logger.error({ err }, "Error checking due messages in buffer dispatcher");
      }
    }, intervalMs);
  }

  /**
   * Hydrates all active scheduled messages on bot start to ensure persistence across restarts
   */
  public static async hydratePendingSchedules(): Promise<void> {
    try {
      const pendingSchedules = await prisma.scheduledMessage.findMany({
        where: {
          isActive: true,
        },
      });

      logger.info({ count: pendingSchedules.length }, "Hydrating pending schedules into BullMQ queue");

      for (const schedule of pendingSchedules) {
        const now = Date.now();
        if (schedule.executeAt.getTime() <= now) {
          // If past due and recurring, calculate next execution
          if (schedule.isRecurring && schedule.cronExpression) {
            try {
              const interval = parseExpression(schedule.cronExpression, { currentDate: new Date() });
              const nextExec = interval.next().toDate();
              await prisma.scheduledMessage.update({
                where: { id: schedule.id },
                data: { executeAt: nextExec },
              });
              await enqueueScheduledMessage(schedule.id, nextExec);
            } catch (err) {
              logger.error({ err, scheduleId: schedule.id }, "Failed to reschedule overdue recurring job");
            }
          } else {
            // Immediate dispatch
            await enqueueScheduledMessage(schedule.id, new Date());
          }
        } else {
          await enqueueScheduledMessage(schedule.id, schedule.executeAt);
        }
      }
    } catch (error) {
      logger.error({ error }, "Error hydrating pending schedules");
    }
  }

  /**
   * Delete or deactivate a schedule
   */
  public static async deleteSchedule(scheduleId: string, guildId: string): Promise<boolean> {
    const existing = await prisma.scheduledMessage.findFirst({
      where: { id: scheduleId, guildId },
    });

    if (!existing) return false;

    await prisma.scheduledMessage.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });

    // Remove any queued jobs
    try {
      const delayedJobs = await scheduleQueue.getDelayed();
      for (const job of delayedJobs) {
        if (job.data?.scheduleId === scheduleId) {
          await job.remove();
        }
      }
    } catch {}

    return true;
  }
}
