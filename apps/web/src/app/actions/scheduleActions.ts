"use server";

import { revalidatePath } from "next/cache";
import { parseExpression } from "cron-parser";
import { Queue } from "bullmq";
import { prisma } from "@discord-hub/database";
import { auth } from "@/lib/auth";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const scheduleQueue = new Queue("scheduled_messages_queue", {
  connection: {
    url: redisUrl,
  },
});

export async function createScheduleAction(guildId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const channelId = formData.get("channelId") as string;
  const title = (formData.get("title") as string) || null;
  const content = formData.get("content") as string;
  const dateStr = formData.get("datetime") as string;
  const cronExpression = (formData.get("cronExpression") as string) || null;
  const isRecurring = formData.get("isRecurring") === "true";

  if (!channelId || !content) {
    throw new Error("Channel and message content are required.");
  }

  let executeAt: Date;
  if (dateStr) {
    executeAt = new Date(dateStr);
  } else {
    // default to 2 minutes from now
    executeAt = new Date(Date.now() + 2 * 60 * 1000);
  }

  if (isRecurring && cronExpression) {
    try {
      parseExpression(cronExpression);
    } catch {
      throw new Error(`Invalid cron format: ${cronExpression}`);
    }
  }

  // Ensure GuildConfig exists
  await prisma.guildConfig.upsert({
    where: { id: guildId },
    update: {},
    create: { id: guildId },
  });

  const record = await prisma.scheduledMessage.create({
    data: {
      guildId,
      channelId,
      title,
      content,
      cronExpression,
      executeAt,
      isRecurring,
      isActive: true,
      createdById: session.user.id || "dashboard-user",
    },
  });

  // Enqueue delayed job into BullMQ
  const delay = Math.max(0, executeAt.getTime() - Date.now());
  await scheduleQueue.add(
    "send_scheduled_msg",
    { scheduleId: record.id },
    {
      delay,
      jobId: `schedule_${record.id}_${executeAt.getTime()}`,
      removeOnComplete: true,
    }
  );

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true, scheduleId: record.id };
}

export async function deleteScheduleAction(guildId: string, scheduleId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  await prisma.scheduledMessage.delete({
    where: { id: scheduleId, guildId },
  });

  // Remove from queue if delayed
  try {
    const delayed = await scheduleQueue.getDelayed();
    for (const job of delayed) {
      if (job.data?.scheduleId === scheduleId) {
        await job.remove();
      }
    }
  } catch {}

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true };
}

export async function toggleScheduleAction(
  guildId: string,
  scheduleId: string,
  currentStatus: boolean
) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const newStatus = !currentStatus;

  await prisma.scheduledMessage.update({
    where: { id: scheduleId, guildId },
    data: { isActive: newStatus },
  });

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true, isActive: newStatus };
}
