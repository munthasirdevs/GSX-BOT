import { z } from "zod";
import { parseExpression } from "cron-parser";
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
    const delayedJobs = await scheduleQueue.getDelayed();
    for (const job of delayedJobs) {
      if (job.data?.scheduleId === scheduleId) {
        await job.remove();
      }
    }

    return true;
  }
}
