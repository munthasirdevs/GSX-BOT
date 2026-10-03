"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@discord-hub/database";
import { auth } from "@/lib/auth";

export async function updateGuildSettingsAction(guildId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const reportChannelId = (formData.get("reportChannelId") as string) || null;
  const ticketCategoryId = (formData.get("ticketCategoryId") as string) || null;
  const ticketTranscriptId = (formData.get("ticketTranscriptId") as string) || null;
  const supportRoleId = (formData.get("supportRoleId") as string) || null;

  await prisma.guildConfig.upsert({
    where: { id: guildId },
    update: {
      reportChannelId,
      ticketCategoryId,
      ticketTranscriptId,
      supportRoleId,
    },
    create: {
      id: guildId,
      reportChannelId,
      ticketCategoryId,
      ticketTranscriptId,
      supportRoleId,
    },
  });

  revalidatePath(`/dashboard/${guildId}/settings`);
  revalidatePath(`/dashboard/${guildId}/tickets`);
  return { success: true };
}
