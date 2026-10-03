import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  ChannelType,
  Client,
  EmbedBuilder,
  ModalBuilder,
  ModalSubmitInteraction,
  OverwriteResolvable,
  PermissionFlagsBits,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import * as discordTranscripts from "discord-html-transcripts";
import { prisma, TicketStatus } from "@discord-hub/database";
import { logger } from "../utils/logger";

export class TicketManager {
  /**
   * Generates the setup embed and ActionRow for ticket initiation
   */
  public static createSetupPayload() {
    const embed = new EmbedBuilder()
      .setTitle("🎫 Customer Support & Assistance")
      .setDescription(
        "Need help, have a inquiry, or wish to report an issue?\n\nClick the button below to create a private support ticket with our staff team."
      )
      .setColor(0x5865f2)
      .setFooter({ text: "Discord Hub Support System" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create")
        .setLabel("Create Ticket")
        .setEmoji("📩")
        .setStyle(ButtonStyle.Primary)
    );

    return { embeds: [embed], components: [row] };
  }

  /**
   * Builds the modal displayed to users clicking "Create Ticket"
   */
  public static buildCreateModal(): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId("modal_ticket_create")
      .setTitle("Open Support Ticket");

    const reasonInput = new TextInputBuilder()
      .setCustomId("ticket_reason")
      .setLabel("Describe your issue or question")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Please provide detailed information so our team can assist you...")
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(1000);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
    modal.addComponents(actionRow);

    return modal;
  }

  /**
   * Handles modal submission to create a private ticket channel
   */
  public static async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<void> {
    const guild = interaction.guild;
    if (!guild) {
      await interaction.reply({ content: "This action can only be performed in a server.", ephemeral: true });
      return;
    }

    const userId = interaction.user.id;
    const userTag = interaction.user.tag || interaction.user.username;
    const reason = interaction.fields.getTextInputValue("ticket_reason");

    // Check if user already has an active OPEN ticket
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        guildId: guild.id,
        creatorId: userId,
        status: TicketStatus.OPEN,
      },
    });

    if (existingTicket) {
      await interaction.reply({
        content: `❌ You already have an active open ticket: <#${existingTicket.channelId}>. Please resolve it before opening a new one.`,
        ephemeral: true,
      });
      return;
    }

    // Defer reply ephemerally to prevent 3-second timeout
    await interaction.deferReply({ ephemeral: true });

    try {
      // Fetch Guild configuration
      let config = await prisma.guildConfig.findUnique({
        where: { id: guild.id },
      });

      if (!config) {
        config = await prisma.guildConfig.create({
          data: { id: guild.id },
        });
      }

      // Determine ticket counter
      const ticketCount = await prisma.ticket.count({
        where: { guildId: guild.id },
      });
      const ticketNumber = ticketCount + 1;
      const channelName = `ticket-${ticketNumber.toString().padStart(4, "0")}`;

      // Build permission overwrites
      const permissionOverwrites: OverwriteResolvable[] = [
        {
          id: guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: userId,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
        {
          id: guild.members.me?.id || interaction.client.user.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.AttachFiles,
            PermissionFlagsBits.ReadMessageHistory,
          ],
        },
      ];

      // Add Support Role overwrite if configured and exists
      if (config.supportRoleId) {
        const supportRole = guild.roles.cache.get(config.supportRoleId);
        if (supportRole) {
          permissionOverwrites.push({
            id: supportRole.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          });
        }
      }

      // Create private ticket channel
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId || undefined,
        permissionOverwrites,
        topic: `Support Ticket #${ticketNumber} | Creator: ${userTag} (${userId})`,
      });

      // Persist Ticket record in PostgreSQL
      const ticketRecord = await prisma.ticket.create({
        data: {
          guildId: guild.id,
          channelId: ticketChannel.id,
          creatorId: userId,
          creatorTag: userTag,
          reason,
          status: TicketStatus.OPEN,
        },
      });

      // Send initial welcome embed in the new channel with "Close Ticket" button
      const welcomeEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket #${ticketNumber} Support Desk`)
        .setDescription(`Hello <@${userId}>, support staff have been notified.\n\n**Reason for inquiry:**\n\`\`\`\n${reason}\n\`\`\``)
        .setColor(0x57f287) // Accent green
        .addFields(
          { name: "Creator", value: `<@${userId}> (${userTag})`, inline: true },
          { name: "Ticket ID", value: `\`${ticketRecord.id}\``, inline: true }
        )
        .setFooter({ text: "Click the button below when your issue is resolved." })
        .setTimestamp();

      const closeRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("Close Ticket")
          .setEmoji("🔒")
          .setStyle(ButtonStyle.Danger)
      );

      await ticketChannel.send({
        content: config.supportRoleId ? `<@&${config.supportRoleId}> <@${userId}>` : `<@${userId}>`,
        embeds: [welcomeEmbed],
        components: [closeRow],
      });

      await interaction.editReply({
        content: `✅ Your support ticket has been created: <#${ticketChannel.id}>`,
      });

      logger.info({ ticketId: ticketRecord.id, channelId: ticketChannel.id }, "Successfully created ticket channel");
    } catch (error) {
      logger.error({ error, guildId: guild.id, userId }, "Failed to create support ticket");
      await interaction.editReply({
        content: "❌ An error occurred while creating your ticket channel. Please contact an administrator.",
      });
    }
  }

  /**
   * Handles closing of ticket: HTML transcript generation, audit channel logging, creator DM, and deletion
   */
  public static async handleTicketClose(interaction: ButtonInteraction): Promise<void> {
    const channel = interaction.channel as TextChannel;
    const guild = interaction.guild;

    if (!channel || !guild) {
      await interaction.reply({ content: "This action cannot be performed here.", ephemeral: true });
      return;
    }

    // Defer reply to handle transcript compilation and network requests safely
    await interaction.deferReply();

    try {
      const ticket = await prisma.ticket.findUnique({
        where: { channelId: channel.id },
        include: { guild: true },
      });

      if (!ticket || ticket.status === TicketStatus.CLOSED) {
        await interaction.editReply({ content: "⚠️ This channel is not an active ticket or has already been closed." });
        return;
      }

      // Generate HTML transcript
      const transcriptAttachment = await discordTranscripts.createTranscript(channel, {
        limit: -1,
        returnType: discordTranscripts.ExportReturnType.Attachment,
        filename: `transcript-${channel.name}.html`,
        saveImages: true,
        poweredBy: false,
      });

      const closedAt = new Date();
      const closerId = interaction.user.id;
      const closerTag = interaction.user.tag || interaction.user.username;

      // Update database status
      await prisma.ticket.update({
        where: { id: ticket.id },
        data: {
          status: TicketStatus.CLOSED,
          closedAt,
          closedById: closerId,
        },
      });

      // Send transcript to configured audit channel
      const auditChannelId = ticket.guild.ticketTranscriptId;
      if (auditChannelId) {
        try {
          const auditChannel = await guild.channels.fetch(auditChannelId);
          if (auditChannel && auditChannel.isTextBased()) {
            const auditEmbed = new EmbedBuilder()
              .setTitle(`📑 Ticket Closed: #${ticket.ticketNumber} (${channel.name})`)
              .setColor(0xed4245) // Danger Red
              .addFields(
                { name: "Creator", value: `<@${ticket.creatorId}> (${ticket.creatorTag})`, inline: true },
                { name: "Closed By", value: `<@${closerId}> (${closerTag})`, inline: true },
                { name: "Reason", value: ticket.reason || "No reason provided", inline: false }
              )
              .setFooter({ text: `Ticket ID: ${ticket.id}` })
              .setTimestamp(closedAt);

            await (auditChannel as TextChannel).send({
              embeds: [auditEmbed],
              files: [transcriptAttachment],
            });
            logger.info({ ticketId: ticket.id, auditChannelId }, "Posted transcript to audit channel");
          }
        } catch (auditErr) {
          logger.error({ auditErr, ticketId: ticket.id }, "Failed to send transcript to audit channel");
        }
      }

      // Attempt to DM creator with transcript
      try {
        const creatorUser = await interaction.client.users.fetch(ticket.creatorId);
        if (creatorUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle(`📬 Your Support Ticket #${ticket.ticketNumber} Has Been Closed`)
            .setDescription(`Your ticket in **${guild.name}** was closed by **${closerTag}**.\nA copy of your chat transcript is attached below.`)
            .setColor(0x5865f2)
            .setTimestamp();

          await creatorUser.send({
            embeds: [dmEmbed],
            files: [transcriptAttachment],
          });
        }
      } catch (dmErr) {
        logger.warn({ dmErr, userId: ticket.creatorId }, "Could not DM user with transcript (DMs closed or blocked)");
      }

      // Send countdown notice and schedule channel deletion in 5 seconds
      const closingEmbed = new EmbedBuilder()
        .setTitle("🔒 Ticket Closed")
        .setDescription(`Ticket closed by <@${closerId}>.\nThis channel will be automatically deleted in **5 seconds**...`)
        .setColor(0xed4245);

      await interaction.editReply({ embeds: [closingEmbed] });

      setTimeout(async () => {
        try {
          await channel.delete(`Ticket #${ticket.ticketNumber} closed by ${closerTag}`);
          logger.info({ ticketId: ticket.id, channelId: channel.id }, "Deleted ticket channel");
        } catch (delError) {
          logger.error({ delError, channelId: channel.id }, "Failed to delete ticket channel");
        }
      }, 5000);
    } catch (error) {
      logger.error({ error, channelId: channel.id }, "Error closing ticket");
      await interaction.editReply({ content: "❌ An error occurred while closing the ticket. Please try again." });
    }
  }
}
