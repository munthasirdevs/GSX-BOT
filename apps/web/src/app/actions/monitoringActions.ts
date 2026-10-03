"use server";

import { revalidatePath } from "next/cache";
import { Queue } from "bullmq";
import { auth } from "@/lib/auth";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const analyticsQueue = new Queue("guild_analytics_queue", {
  connection: {
    url: redisUrl,
  },
});

/**
 * Triggers an immediate 24h analytics aggregation cycle for the guild
 */
export async function triggerManualReportAction(guildId: string) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  // Add job to BullMQ analytics queue to process immediately
  await analyticsQueue.add(
    "manual_guild_analytics_trigger",
    { guildId },
    {
      jobId: `manual_report_${guildId}_${Date.now()}`,
      removeOnComplete: true,
    }
  );

  revalidatePath(`/dashboard/${guildId}/monitoring`);
  revalidatePath(`/dashboard/${guildId}/analytics`);
  return { success: true };
}
