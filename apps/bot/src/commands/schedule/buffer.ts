import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { prisma } from "@discord-hub/database";
import { SchedulerManager } from "../../services/schedulerManager";
import { logger } from "../../utils/logger";

export const data = new SlashCommandBuilder()
  .setName("buffer")
  .setDescription("Discord message buffer queue & drip scheduling")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add an announcement to the server's buffer drip queue")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Target channel to receive the message")
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
          .setDescription("Optional embed title")
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("drip_minutes")
          .setDescription("Spacing after previous buffered message (default: 15 minutes)")
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("View all messages currently queued in the buffer")
  )
  .addSubcommand((sub) =>
    sub
      .setName("flush")
      .setDescription("Instantly dispatch the next queued message in the buffer right now")
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear and cancel all pending buffered messages in the server")
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "add") {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel", true);
    const content = interaction.options.getString("content", true);
    const title = interaction.options.getString("title");
    const dripMinutes = interaction.options.getInteger("drip_minutes") || 15;

    try {
      // Find latest pending buffered message to append in sequence
      const latest = await prisma.scheduledMessage.findFirst({
        where: {
          guildId: interaction.guildId,
          isActive: true,
          isRecurring: false,
        },
        orderBy: { executeAt: "desc" },
      });

      const now = Date.now();
      let executeAt: Date;

      if (latest && latest.executeAt.getTime() > now) {
        // Queue after the latest buffered message
        executeAt = new Date(latest.executeAt.getTime() + dripMinutes * 60 * 1000);
      } else {
        // Queue from now
        executeAt = new Date(now + dripMinutes * 60 * 1000);
      }

      const schedule = await SchedulerManager.createSchedule({
        guildId: interaction.guildId,
        channelId: channel.id,
        title,
        content,
        executeAt,
        isRecurring: false,
        createdById: interaction.user.id,
      });

      const totalQueued = await prisma.scheduledMessage.count({
        where: {
          guildId: interaction.guildId,
          isActive: true,
          isRecurring: false,
        },
      });

      const embed = new EmbedBuilder()
        .setTitle("⚡ Message Added to Buffer Queue")
        .setColor(0x5865f2)
        .addFields(
          { name: "Target Channel", value: `<#${channel.id}>`, inline: true },
          { name: "Queue Position", value: `#${totalQueued}`, inline: true },
          { name: "Scheduled Delivery", value: `<t:${Math.floor(executeAt.getTime() / 1000)}:R>`, inline: true },
          { name: "Buffer ID", value: `\`${schedule.id}\``, inline: false },
          { name: "Preview", value: content.length > 250 ? `${content.slice(0, 247)}...` : content, inline: false }
        )
        .setFooter({ text: "Use /buffer flush to send immediately or /buffer list to view queue." })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error buffering message");
      await interaction.editReply({ content: `❌ Failed to add message to buffer: ${err.message}` });
    }
  } else if (subcommand === "list") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const items = await prisma.scheduledMessage.findMany({
        where: {
          guildId: interaction.guildId,
          isActive: true,
        },
        orderBy: { executeAt: "asc" },
      });

      if (items.length === 0) {
        await interaction.editReply({ content: "ℹ️ The buffer queue is currently empty. Use `/buffer add` to queue messages." });
        return;
      }

      const embed = new EmbedBuilder()
        .setTitle("⚡ Server Message Buffer & Queue")
        .setColor(0x5865f2)
        .setDescription(
          items
            .map((item, idx) => {
              const typeStr = item.isRecurring ? `🔄 Recurring (${item.cronExpression})` : `⚡ Buffered`;
              return `**#${idx + 1}. \`${item.id}\`** | ${typeStr}\n• Channel: <#${item.channelId}>\n• Delivery: <t:${Math.floor(item.executeAt.getTime() / 1000)}:R> (<t:${Math.floor(item.executeAt.getTime() / 1000)}:F>)\n• Preview: *${item.content.slice(0, 70)}...*`;
            })
            .join("\n\n")
        )
        .setFooter({ text: "Use /buffer flush to send the next message immediately." })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error listing buffer");
      await interaction.editReply({ content: "❌ Failed to fetch buffer queue." });
    }
  } else if (subcommand === "flush") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const nextItem = await prisma.scheduledMessage.findFirst({
        where: {
          guildId: interaction.guildId,
          isActive: true,
        },
        orderBy: { executeAt: "asc" },
      });

      if (!nextItem) {
        await interaction.editReply({ content: "ℹ️ No pending messages in the buffer queue to flush." });
        return;
      }

      // Fetch target channel and send
      const channel = await interaction.client.channels.fetch(nextItem.channelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply({ content: "❌ Target channel is invalid or not accessible." });
        return;
      }

      const textChannel = channel as TextChannel;
      if (nextItem.title) {
        const embed = new EmbedBuilder()
          .setTitle(nextItem.title)
          .setDescription(nextItem.content)
          .setColor(0x5865f2)
          .setTimestamp();
        await textChannel.send({ embeds: [embed] });
      } else {
        await textChannel.send({ content: nextItem.content });
      }

      // Mark completed or next cron
      if (nextItem.isRecurring) {
        // Keep recurring
      } else {
        await prisma.scheduledMessage.update({
          where: { id: nextItem.id },
          data: { isActive: false },
        });
      }

      await interaction.editReply({
        content: `🚀 Successfully flushed message \`${nextItem.id}\` to <#${nextItem.channelId}> immediately!`,
      });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error flushing buffer");
      await interaction.editReply({ content: `❌ Failed to flush buffer message: ${err.message}` });
    }
  } else if (subcommand === "clear") {
    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await prisma.scheduledMessage.deleteMany({
        where: {
          guildId: interaction.guildId,
          isActive: true,
          isRecurring: false,
        },
      });

      await interaction.editReply({
        content: `🧹 Successfully cleared ${deleted.count} buffered messages from the queue.`,
      });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error clearing buffer");
      await interaction.editReply({ content: `❌ Failed to clear buffer: ${err.message}` });
    }
  }
}
