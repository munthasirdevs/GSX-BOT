import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { ActivityTracker } from "../../services/activityTracker";
import { processGuildAnalytics } from "../../queues/analyticsWorker";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("report")
  .setDescription("Generate and dispatch 24h activity reports")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("generate")
      .setDescription("Compile and post the server activity report for today or yesterday")
      .addStringOption((opt) =>
        opt
          .setName("target")
          .setDescription("Target date period")
          .addChoices(
            { name: "Today (Live)", value: "today" },
            { name: "Yesterday (24h Full Cycle)", value: "yesterday" }
          )
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  await interaction.deferReply({ ephemeral: true });

  const target = interaction.options.getString("target") || "today";
  const targetDate = target === "yesterday"
    ? new Date(Date.now() - 24 * 60 * 60 * 1000)
    : new Date();

  const dateStr = ActivityTracker.formatDate(targetDate);

  try {
    const result = await processGuildAnalytics(
      interaction.guildId,
      dateStr,
      interaction.client
    );

    await interaction.editReply({
      content: `✅ 24h Activity report compiled for **${dateStr}**.\n• Saved to Database: **${result.persisted ? "Yes" : "No"}**\n• Dispatched to Report Channel: **${result.dispatched ? "Yes" : "No (Verify reportChannelId with /setup)"}**`,
    });
  } catch (error) {
    logger.error({ error, guildId: interaction.guildId }, "Error running /report generate");
    await interaction.editReply({
      content: "❌ An error occurred while generating the activity report.",
    });
  }
}
