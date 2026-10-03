import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { prisma } from "@discord-hub/database";
import { SchedulerManager } from "../../services/schedulerManager";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("schedule")
  .setDescription("Scheduled announcement management")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("create")
      .setDescription("Schedule an announcement or automated recurring message")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Target announcement channel")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("content")
          .setDescription("Message content or text")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("title")
          .setDescription("Optional embed title (wraps content into a Discord Embed)")
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("delay_minutes")
          .setDescription("Delay execution by X minutes from now (e.g. 10)")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("datetime_iso")
          .setDescription("Exact ISO datetime (e.g. 2026-10-05T14:30:00Z)")
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName("cron")
          .setDescription("Recurring standard 5-part cron (e.g. '0 12 * * *' for daily noon)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List active upcoming scheduled announcements")
  )
  .addSubcommand((sub) =>
    sub
      .setName("delete")
      .setDescription("Cancel and delete an active scheduled announcement")
      .addStringOption((opt) =>
        opt
          .setName("schedule_id")
          .setDescription("The ID of the schedule to delete")
          .setRequired(true)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "create") {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel", true);
    const content = interaction.options.getString("content", true);
    const title = interaction.options.getString("title");
    const delayMinutes = interaction.options.getInteger("delay_minutes");
    const datetimeIso = interaction.options.getString("datetime_iso");
    const cron = interaction.options.getString("cron");

    let executeAt: Date;

    if (delayMinutes) {
      executeAt = new Date(Date.now() + delayMinutes * 60 * 1000);
    } else if (datetimeIso) {
      const parsed = new Date(datetimeIso);
      if (isNaN(parsed.getTime())) {
        await interaction.editReply({
          content: "❌ Invalid datetime format. Please use ISO-8601 (e.g. 2026-10-05T14:30:00Z).",
        });
        return;
      }
      executeAt = parsed;
    } else {
      // Default to 1 minute from now if no time specified
      executeAt = new Date(Date.now() + 60 * 1000);
    }

    try {
      const schedule = await SchedulerManager.createSchedule({
        guildId: interaction.guildId,
        channelId: channel.id,
        title,
        content,
        cronExpression: cron,
        executeAt,
        isRecurring: Boolean(cron),
        createdById: interaction.user.id,
      });

      const embed = new EmbedBuilder()
        .setTitle("🗓️ Announcement Scheduled")
        .setColor(0x57f287)
        .addFields(
          { name: "Target Channel", value: `<#${channel.id}>`, inline: true },
          { name: "Execution Time", value: `<t:${Math.floor(executeAt.getTime() / 1000)}:F>`, inline: true },
          { name: "Recurring Cron", value: cron ? `\`${cron}\`` : "*One-Time*", inline: true },
          { name: "Schedule ID", value: `\`${schedule.id}\``, inline: false },
          { name: "Message Preview", value: content.length > 200 ? `${content.slice(0, 197)}...` : content, inline: false }
        )
        .setFooter({ text: "Discord Hub Queue Architecture" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error: any) {
      logger.error({ error, guildId: interaction.guildId }, "Error scheduling message");
      await interaction.editReply({
        content: `❌ Failed to schedule message: ${error.message || "Unknown error"}`,
      });
    }
  } else if (subcommand === "list") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const schedules = await prisma.scheduledMessage.findMany({
        where: {
          guildId: interaction.guildId,
          isActive: true,
        },
        orderBy: { executeAt: "asc" },
        take: 10,
      });

      if (schedules.length === 0) {
        await interaction.editReply({ content: "ℹ️ No active scheduled announcements found in this server." });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("🗓️ Active Scheduled Announcements")
        .setColor(0x5865f2)
        .setDescription(
          schedules
            .map((s, idx) => {
              const recurringStr = s.isRecurring ? `(Recurring: \`${s.cronExpression}\`)` : `(One-Time)`;
              return `**${idx + 1}. ID: \`${s.id}\`**\n• Channel: <#${s.channelId}>\n• Time: <t:${Math.floor(s.executeAt.getTime() / 1000)}:R> ${recurringStr}\n• Preview: *${s.content.slice(0, 60)}...*`;
            })
            .join("\n\n")
        )
        .setFooter({ text: "Use /schedule delete <schedule_id> to cancel." })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, "Error listing schedules");
      await interaction.editReply({ content: "❌ Failed to retrieve schedules." });
    }
  } else if (subcommand === "delete") {
    await interaction.deferReply({ ephemeral: true });

    const scheduleId = interaction.options.getString("schedule_id", true);

    try {
      const deleted = await SchedulerManager.deleteSchedule(scheduleId, interaction.guildId);

      if (deleted) {
        await interaction.editReply({ content: `✅ Schedule \`${scheduleId}\` has been cancelled and removed.` });
      } else {
        await interaction.editReply({ content: `❌ Schedule \`${scheduleId}\` was not found or is already inactive.` });
      }
    } catch (error) {
      logger.error({ error, scheduleId }, "Error deleting schedule");
      await interaction.editReply({ content: "❌ Error occurred while deleting schedule." });
    }
  }
}
