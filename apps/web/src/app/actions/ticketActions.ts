"use server";

import { revalidatePath } from "next/cache";
import { prisma, TicketStatus } from "@discord-hub/database";
import { auth } from "@/lib/auth";

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Closes an active ticket directly from the dashboard
 */
export async function closeTicketFromDashboardAction(guildId: string, ticketId: string) {
  const session = await auth();
  const userId = session?.user?.id || "dashboard-admin";
  const userName = session?.user?.name || "Admin";

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    throw new Error("Bot token is not configured.");
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, guildId },
  });

  if (!ticket) {
    throw new Error("Ticket not found.");
  }

  // Update in database
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status: TicketStatus.CLOSED,
      closedAt: new Date(),
      closedById: userId,
    },
  });

  // Attempt to delete Discord channel
  try {
    await fetch(`${DISCORD_API}/channels/${ticket.channelId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bot ${botToken}`,
        "X-Audit-Log-Reason": `Ticket closed via Web Dashboard by ${userName}`,
      },
    });
  } catch (err) {
    // Channel may already be deleted or inaccessible
  }

  revalidatePath(`/dashboard/${guildId}/tickets`);
  return { success: true };
}
