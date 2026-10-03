import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} from "discord.js";
import { prisma } from "@discord-hub/database";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("setup")
  .setDescription("Configure Discord Hub server settings (Reports, Tickets, Roles)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addChannelOption((option) =>
    option
      .setName("report_channel")
      .setDescription("Channel where the 24h automated analytics report is posted")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addChannelOption((option) =>
    option
      .setName("ticket_category")
      .setDescription("Category where new support ticket channels will be created")
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(false)
  )
  .addChannelOption((option) =>
    option
      .setName("transcript_channel")
      .setDescription("Channel where closed ticket transcripts will be sent")
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)
  )
  .addRoleOption((option) =>
    option
      .setName("support_role")
      .setDescription("Staff role granted access to all support tickets")
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  await interaction.deferReply({ ephemeral: true });

  const reportChannel = interaction.options.getChannel("report_channel");
  const ticketCategory = interaction.options.getChannel("ticket_category");
  const transcriptChannel = interaction.options.getChannel("transcript_channel");
  const supportRole = interaction.options.getRole("support_role");

  try {
    const current = await prisma.guildConfig.upsert({
      where: { id: interaction.guildId },
      update: {
        ...(reportChannel ? { reportChannelId: reportChannel.id } : {}),
        ...(ticketCategory ? { ticketCategoryId: ticketCategory.id } : {}),
        ...(transcriptChannel ? { ticketTranscriptId: transcriptChannel.id } : {}),
        ...(supportRole ? { supportRoleId: supportRole.id } : {}),
      },
      create: {
        id: interaction.guildId,
        reportChannelId: reportChannel?.id || null,
        ticketCategoryId: ticketCategory?.id || null,
        ticketTranscriptId: transcriptChannel?.id || null,
        supportRoleId: supportRole?.id || null,
      },
    });

    const embed = new EmbedBuilder()
      .setTitle("⚙️ Server Configuration Updated")
      .setColor(0x57f287)
      .addFields(
        {
          name: "📊 24h Report Channel",
          value: current.reportChannelId ? `<#${current.reportChannelId}>` : "*Not Set*",
          inline: true,
        },
        {
          name: "📁 Ticket Category",
          value: current.ticketCategoryId ? `<#${current.ticketCategoryId}>` : "*Not Set*",
          inline: true,
        },
        {
          name: "📑 Ticket Transcripts",
          value: current.ticketTranscriptId ? `<#${current.ticketTranscriptId}>` : "*Not Set*",
          inline: true,
        },
        {
          name: "🛡️ Support Staff Role",
          value: current.supportRoleId ? `<@&${current.supportRoleId}>` : "*Not Set*",
          inline: true,
        }
      )
      .setFooter({ text: "Use the Web Dashboard for comprehensive controls." })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error({ error, guildId: interaction.guildId }, "Error running /setup command");
    await interaction.editReply({ content: "❌ Failed to update guild configuration. Please check bot permissions." });
  }
}
