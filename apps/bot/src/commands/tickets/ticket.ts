import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { prisma, TicketStatus } from "@discord-hub/database";
import { TicketManager } from "../../services/ticketManager";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("ticket")
  .setDescription("Support ticket administration and setup")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("setup")
      .setDescription("Post the interactive 'Create Ticket' panel in a channel")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Channel to post the ticket creation panel (defaults to current)")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("stats")
      .setDescription("View ticket system metrics (open tickets, total resolved)")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "setup") {
    await interaction.deferReply({ ephemeral: true });

    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel) ||
      (interaction.channel as TextChannel);

    if (!targetChannel || !targetChannel.isTextBased()) {
      await interaction.editReply({ content: "❌ Invalid target channel." });
      return;
    }

    try {
      const payload = TicketManager.createSetupPayload();
      await targetChannel.send(payload);

      await interaction.editReply({
        content: `✅ Support ticket panel successfully posted in <#${targetChannel.id}>! Users can now click the button to open tickets.`,
      });
    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, "Failed to post ticket setup panel");
      await interaction.editReply({
        content: "❌ Failed to post ticket panel. Ensure the bot has Send Messages and Embed Links permissions in that channel.",
      });
    }
  } else if (subcommand === "stats") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const [openCount, closedCount, totalCount] = await Promise.all([
        prisma.ticket.count({ where: { guildId: interaction.guildId, status: TicketStatus.OPEN } }),
        prisma.ticket.count({ where: { guildId: interaction.guildId, status: TicketStatus.CLOSED } }),
        prisma.ticket.count({ where: { guildId: interaction.guildId } }),
      ]);

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket System Statistics")
        .setColor(0x5865f2)
        .addFields(
          { name: "🟢 Open Tickets", value: `\`${openCount}\``, inline: true },
          { name: "🔒 Closed Tickets", value: `\`${closedCount}\``, inline: true },
          { name: "📊 Total Lifetime", value: `\`${totalCount}\``, inline: true }
        )
        .setFooter({ text: "Discord Hub Tickets" })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      logger.error({ error, guildId: interaction.guildId }, "Error fetching ticket stats");
      await interaction.editReply({ content: "❌ Failed to retrieve ticket statistics." });
    }
  }
}
