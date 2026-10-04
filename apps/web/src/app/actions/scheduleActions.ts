"use server";

import { revalidatePath } from "next/cache";
import { parseExpression } from "cron-parser";
import { Queue } from "bullmq";
import { prisma } from "@discord-hub/database";
import { auth } from "@/lib/auth";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
let scheduleQueue: Queue | null = null;

try {
  scheduleQueue = new Queue("scheduled_messages_queue", {
    connection: {
      url: redisUrl,
    },
  });
} catch {
  scheduleQueue = null;
}

const DISCORD_API = "https://discord.com/api/v10";

export async function createScheduleAction(guildId: string, formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id || "dashboard-admin";

  const channelId = formData.get("channelId") as string;
  const title = (formData.get("title") as string) || null;
  const content = formData.get("content") as string;
  const mode = (formData.get("mode") as string) || "datetime"; // "buffer" | "datetime" | "cron"
  const dateStr = formData.get("datetime") as string;
  const cronExpression = (formData.get("cronExpression") as string) || null;
  const dripMinutes = parseInt((formData.get("dripMinutes") as string) || "15", 10);
  const isRecurring = mode === "cron" || formData.get("isRecurring") === "true";

  if (!channelId || !content) {
    throw new Error("Channel and message content are required.");
  }

  let executeAt: Date;

  if (mode === "buffer") {
    // Buffer mode: Find latest pending message to queue in sequence
    const latest = await prisma.scheduledMessage.findFirst({
      where: {
        guildId,
        isActive: true,
        isRecurring: false,
      },
      orderBy: { executeAt: "desc" },
    });

    const now = Date.now();
    if (latest && latest.executeAt.getTime() > now) {
      executeAt = new Date(latest.executeAt.getTime() + dripMinutes * 60 * 1000);
    } else {
      executeAt = new Date(now + dripMinutes * 60 * 1000);
    }
  } else if (dateStr) {
    executeAt = new Date(dateStr);
  } else {
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
      createdById: userId,
    },
  });

  // Enqueue into BullMQ
  if (scheduleQueue) {
    try {
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
    } catch (qErr) {
      console.warn("Could not add to BullMQ queue:", qErr);
    }
  }

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true, scheduleId: record.id };
}

/**
 * Instantly sends a buffered or scheduled message right now
 */
export async function sendScheduleNowAction(guildId: string, scheduleId: string) {
  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) throw new Error("Bot token missing");

  const record = await prisma.scheduledMessage.findUnique({
    where: { id: scheduleId, guildId },
  });

  if (!record) throw new Error("Schedule not found");

  // Construct Discord payload
  let payload: any = {};
  if (record.title) {
    payload = {
      embeds: [
        {
          title: record.title,
          description: record.content,
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    };
  } else {
    payload = { content: record.content };
  }

  const res = await fetch(`${DISCORD_API}/channels/${record.channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Discord API error: ${errText}`);
  }

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
    } catch {}
  } else {
    await prisma.scheduledMessage.update({
      where: { id: record.id },
      data: { isActive: false },
    });
  }

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true };
}

/**
 * Dispatches the next earliest buffered message immediately
 */
export async function flushNextBufferAction(guildId: string) {
  const nextItem = await prisma.scheduledMessage.findFirst({
    where: {
      guildId,
      isActive: true,
    },
    orderBy: { executeAt: "asc" },
  });

  if (!nextItem) {
    throw new Error("No pending messages in buffer queue.");
  }

  return await sendScheduleNowAction(guildId, nextItem.id);
}

export async function deleteScheduleAction(guildId: string, scheduleId: string) {
  await prisma.scheduledMessage.delete({
    where: { id: scheduleId, guildId },
  });

  if (scheduleQueue) {
    try {
      const delayed = await scheduleQueue.getDelayed();
      for (const job of delayed) {
        if (job.data?.scheduleId === scheduleId) {
          await job.remove();
        }
      }
    } catch {}
  }

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true };
}

export async function clearBufferAction(guildId: string) {
  await prisma.scheduledMessage.deleteMany({
    where: {
      guildId,
      isActive: true,
      isRecurring: false,
    },
  });

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true };
}

export async function toggleScheduleAction(
  guildId: string,
  scheduleId: string,
  currentStatus: boolean
) {
  const newStatus = !currentStatus;

  await prisma.scheduledMessage.update({
    where: { id: scheduleId, guildId },
    data: { isActive: newStatus },
  });

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true, isActive: newStatus };
}

/**
 * Toggle whether the server's buffer drip is paused or running
 */
export async function toggleBufferPauseAction(guildId: string) {
  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    update: {},
    create: { id: guildId },
  });

  const updated = await prisma.guildConfig.update({
    where: { id: guildId },
    data: { bufferPaused: !config.bufferPaused },
  });

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true, bufferPaused: updated.bufferPaused };
}

/**
 * Update default channel and drip interval spacing for server buffer
 */
export async function updateBufferSettingsAction(guildId: string, formData: FormData) {
  const bufferChannelId = (formData.get("bufferChannelId") as string) || null;
  const bufferInterval = parseInt((formData.get("bufferInterval") as string) || "15", 10);

  await prisma.guildConfig.upsert({
    where: { id: guildId },
    update: {
      bufferChannelId,
      bufferInterval: isNaN(bufferInterval) ? 15 : bufferInterval,
    },
    create: {
      id: guildId,
      bufferChannelId,
      bufferInterval: isNaN(bufferInterval) ? 15 : bufferInterval,
    },
  });

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true };
}

/**
 * Quick 1-click add to buffer from the composer bar
 */
export async function quickAddBufferAction(guildId: string, formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id || "dashboard-admin";

  const content = formData.get("content") as string;
  let channelId = (formData.get("channelId") as string) || "";
  const title = (formData.get("title") as string) || null;

  if (!content || !content.trim()) {
    throw new Error("Message content cannot be empty.");
  }

  const config = await prisma.guildConfig.upsert({
    where: { id: guildId },
    update: {},
    create: { id: guildId },
  });

  if (!channelId) {
    channelId = config.bufferChannelId || "";
  }

  if (!channelId) {
    throw new Error("Please select a target channel or configure a default buffer channel.");
  }

  const dripMinutes = config.bufferInterval || 15;

  // Find latest active buffer message to queue after
  const latest = await prisma.scheduledMessage.findFirst({
    where: {
      guildId,
      isActive: true,
      isRecurring: false,
    },
    orderBy: { executeAt: "desc" },
  });

  const now = Date.now();
  let executeAt: Date;
  if (latest && latest.executeAt.getTime() > now) {
    executeAt = new Date(latest.executeAt.getTime() + dripMinutes * 60 * 1000);
  } else {
    executeAt = new Date(now + dripMinutes * 60 * 1000);
  }

  const record = await prisma.scheduledMessage.create({
    data: {
      guildId,
      channelId,
      title,
      content,
      executeAt,
      isRecurring: false,
      isActive: true,
      createdById: userId,
    },
  });

  if (scheduleQueue) {
    try {
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
    } catch {}
  }

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true, scheduleId: record.id };
}

/**
 * Reorder a buffer message up or down in the drip queue
 */
export async function reorderBufferItemAction(
  guildId: string,
  scheduleId: string,
  direction: "up" | "down"
) {
  const items = await prisma.scheduledMessage.findMany({
    where: {
      guildId,
      isActive: true,
      isRecurring: false,
    },
    orderBy: { executeAt: "asc" },
  });

  const currentIndex = items.findIndex((i) => i.id === scheduleId);
  if (currentIndex === -1) return { success: false };

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= items.length) return { success: false };

  const currentItem = items[currentIndex];
  const targetItem = items[targetIndex];

  // Swap their executeAt times
  await prisma.$transaction([
    prisma.scheduledMessage.update({
      where: { id: currentItem.id },
      data: { executeAt: targetItem.executeAt },
    }),
    prisma.scheduledMessage.update({
      where: { id: targetItem.id },
      data: { executeAt: currentItem.executeAt },
    }),
  ]);

  revalidatePath(`/dashboard/${guildId}/schedules`);
  return { success: true };
}
