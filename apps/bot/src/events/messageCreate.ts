import { Events, Message } from "discord.js";
import { ActivityTracker } from "../services/activityTracker";

export const name = Events.MessageCreate;

export async function execute(message: Message) {
  // Ignore DMs and messages without guilds
  if (!message.guild || !message.guildId) return;

  // High-throughput Redis counter ingestion (non-blocking)
  ActivityTracker.recordMessage(message).catch(() => {});
}
