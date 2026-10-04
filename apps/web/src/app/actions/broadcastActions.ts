"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";

const DISCORD_API = "https://discord.com/api/v10";

/**
 * Sends a direct message or custom embed to a Discord channel via Discord REST API
 */
export async function sendBroadcastAction(guildId: string, formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id || "dashboard-admin";

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    throw new Error("Bot token is not configured on the server.");
  }

  const channelId = formData.get("channelId") as string;
  const content = formData.get("content") as string;
  const title = (formData.get("title") as string) || null;
  const colorHex = (formData.get("color") as string) || "#5865F2";
  const isEmbed = formData.get("isEmbed") === "true";
  const mentionEveryone = formData.get("mentionEveryone") === "true";

  if (!channelId || !content) {
    throw new Error("Target channel and message content are required.");
  }

  // Convert hex color to integer
  const colorInt = parseInt(colorHex.replace("#", ""), 16) || 0x5865f2;

  let body: any = {};

  if (isEmbed || title) {
    const embed: any = {
      description: content,
      color: colorInt,
      timestamp: new Date().toISOString(),
      footer: {
        text: "Sent from Discord Hub Dashboard",
      },
    };

    if (title) {
      embed.title = title;
    }

    body = {
      content: mentionEveryone ? "@everyone" : undefined,
      embeds: [embed],
    };
  } else {
    body = {
      content: mentionEveryone ? `@everyone\n${content}` : content,
    };
  }

  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to send message: ${response.statusText}`);
  }

  revalidatePath(`/dashboard/${guildId}/broadcast`);
  return { success: true };
}

/**
 * Deploys the interactive "Create Ticket" panel to any channel directly from the Web Dashboard
 */
export async function deployTicketPanelAction(guildId: string, channelId: string) {
  const session = await auth();
  const userId = session?.user?.id || "dashboard-admin";

  const botToken = process.env.DISCORD_TOKEN;
  if (!botToken) {
    throw new Error("Bot token is not configured on the server.");
  }

  const embed = {
    title: "🎫 Customer Support & Assistance",
    description:
      "Need help, have an inquiry, or wish to report an issue?\n\nClick the button below to create a private support ticket with our staff team.",
    color: 0x5865f2,
    footer: {
      text: "Discord Hub Support Desk",
    },
    timestamp: new Date().toISOString(),
  };

  const components = [
    {
      type: 1, // ActionRow
      components: [
        {
          type: 2, // Button
          style: 1, // Primary (Blurple)
          custom_id: "ticket_create",
          label: "Create Ticket",
          emoji: {
            name: "📩",
          },
        },
      ],
    },
  ];

  const response = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      embeds: [embed],
      components,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Failed to deploy ticket panel: ${response.statusText}`);
  }

  revalidatePath(`/dashboard/${guildId}/tickets`);
  return { success: true };
}
