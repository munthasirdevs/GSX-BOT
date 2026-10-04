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
  .setDescription("Discord message buffer queue & drip delivery system")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add an announcement to the server's buffer drip queue")
      .addStringOption((opt) =>
        opt
          .setName("content")
          .setDescription("Message content or text")
          .setRequired(true)
      )
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Target channel (defaults to server buffer channel)")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
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
          .setDescription("Spacing after previous buffered message (default: server interval)")
          .setMinValue(1)
          .setMaxValue(1440)
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
      .setName("pause")
      .setDescription("Pause automatic buffer drip deliveries for this server")
  )
  .addSubcommand((sub) =>
    sub
      .setName("resume")
      .setDescription("Resume automatic buffer drip deliveries for this server")
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Clear and cancel all pending buffered messages in the server")
  )
  .addSubcommand((sub) =>
    sub
      .setName("config")
      .setDescription("Configure default buffer delivery channel and drip spacing")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("Default channel for buffered messages")
          .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("interval")
          .setDescription("Default spacing between buffer messages (in minutes, e.g. 15)")
          .setMinValue(1)
          .setMaxValue(1440)
          .setRequired(false)
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  if (!interaction.guildId) return;

  const subcommand = interaction.options.getSubcommand();

  // Ensure GuildConfig exists
  const guildConfig = await prisma.guildConfig.upsert({
    where: { id: interaction.guildId },
    update: {},
    create: { id: interaction.guildId },
  });

  if (subcommand === "add") {
    await interaction.deferReply({ ephemeral: true });

    const content = interaction.options.getString("content", true);
    const title = interaction.options.getString("title");
    const channelOption = interaction.options.getChannel("channel");
    const targetChannelId = channelOption?.id || guildConfig.bufferChannelId;

    if (!targetChannelId) {
      await interaction.editReply({
        content:
          "❌ No target channel specified and no default buffer channel configured.\nPlease specify a `channel` option or configure the default channel using `/buffer config channel:#your-channel`.",
      });
      return;
    }

    const dripMinutes =
      interaction.options.getInteger("drip_minutes") || guildConfig.bufferInterval || 15;

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
        channelId: targetChannelId,
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

      const isPaused = guildConfig.bufferPaused;
      const statusNote = isPaused
        ? "⚠️ **Buffer is currently PAUSED.** Delivery will hold until `/buffer resume`."
        : `⚡ Queued at position **#${totalQueued}** (dripping in ~${dripMinutes}m)`;

      const embed = new EmbedBuilder()
        .setTitle("⚡ Message Added to Buffer Queue")
        .setColor(isPaused ? 0xf59e0b : 0x5865f2)
        .setDescription(statusNote)
        .addFields(
          { name: "Target Channel", value: `<#${targetChannelId}>`, inline: true },
          { name: "Queue Position", value: `#${totalQueued}`, inline: true },
          {
            name: "Scheduled Delivery",
            value: `<t:${Math.floor(executeAt.getTime() / 1000)}:R>`,
            inline: true,
          },
          { name: "Buffer ID", value: `\`${schedule.id}\``, inline: false },
          {
            name: "Preview",
            value: content.length > 250 ? `${content.slice(0, 247)}...` : content,
            inline: false,
          }
        )
        .setFooter({
          text: "Use /buffer flush to send immediately, /buffer pause to hold, or /buffer list to view queue.",
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error buffering message");
      await interaction.editReply({
        content: `❌ Failed to add message to buffer: ${err.message}`,
      });
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
        await interaction.editReply({
          content:
            "ℹ️ The buffer queue is currently empty. Use `/buffer add` or the web dashboard to queue announcements.",
        });
        return;
      }

      const isPaused = guildConfig.bufferPaused;
      const defaultChannel = guildConfig.bufferChannelId
        ? `<#${guildConfig.bufferChannelId}>`
        : "*None set*";

      const embed = new EmbedBuilder()
        .setTitle("⚡ Server Message Buffer & Queue")
        .setColor(isPaused ? 0xf59e0b : 0x5865f2)
        .setDescription(
          `**Buffer Status:** ${isPaused ? "⏸️ PAUSED (Hold)" : "🟢 ACTIVE (Auto-drip)"}\n**Default Channel:** ${defaultChannel} | **Drip Spacing:** ${guildConfig.bufferInterval}m\n\n` +
            items
              .map((item, idx) => {
                const typeStr = item.isRecurring
                  ? `🔄 Recurring (${item.cronExpression})`
                  : `⚡ Buffer #${idx + 1}`;
                return `**#${idx + 1}. \`${item.id}\`** | ${typeStr}\n• Channel: <#${item.channelId}>\n• Delivery: <t:${Math.floor(item.executeAt.getTime() / 1000)}:R> (<t:${Math.floor(item.executeAt.getTime() / 1000)}:F>)\n• Preview: *${item.content.slice(0, 75).replace(/\n/g, " ")}...*`;
              })
              .join("\n\n")
        )
        .setFooter({
          text: "Use /buffer flush to send next immediately, or /buffer pause to pause drip.",
        })
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
        await interaction.editReply({
          content: "ℹ️ No pending messages in the buffer queue to flush.",
        });
        return;
      }

      // Fetch target channel and send
      const channel = await interaction.client.channels.fetch(nextItem.channelId);
      if (!channel || !channel.isTextBased()) {
        await interaction.editReply({
          content: "❌ Target channel is invalid or not accessible.",
        });
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

      // Mark completed or reschedule if recurring
      if (nextItem.isRecurring) {
        // Recalculate
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
      await interaction.editReply({
        content: `❌ Failed to flush buffer message: ${err.message}`,
      });
    }
  } else if (subcommand === "pause") {
    await interaction.deferReply({ ephemeral: true });

    try {
      await prisma.guildConfig.update({
        where: { id: interaction.guildId },
        data: { bufferPaused: true },
      });

      await interaction.editReply({
        content:
          "⏸️ **Buffer Delivery Paused.** Pending messages will remain safely queued in the outbox and will not dispatch until you run `/buffer resume`.",
      });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error pausing buffer");
      await interaction.editReply({ content: `❌ Failed to pause buffer: ${err.message}` });
    }
  } else if (subcommand === "resume") {
    await interaction.deferReply({ ephemeral: true });

    try {
      await prisma.guildConfig.update({
        where: { id: interaction.guildId },
        data: { bufferPaused: false },
      });

      await interaction.editReply({
        content:
          "▶️ **Buffer Delivery Resumed.** Due and pending messages will now drip to their channels automatically according to their schedule!",
      });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error resuming buffer");
      await interaction.editReply({ content: `❌ Failed to resume buffer: ${err.message}` });
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
  } else if (subcommand === "config") {
    await interaction.deferReply({ ephemeral: true });

    const channelOption = interaction.options.getChannel("channel");
    const intervalOption = interaction.options.getInteger("interval");

    if (!channelOption && !intervalOption) {
      const currentChannel = guildConfig.bufferChannelId
        ? `<#${guildConfig.bufferChannelId}>`
        : "*None configured*";
      await interaction.editReply({
        content: `⚙️ **Current Buffer Configuration:**\n• Default Channel: ${currentChannel}\n• Drip Spacing Interval: **${guildConfig.bufferInterval} minutes**\n• Status: ${guildConfig.bufferPaused ? "⏸️ Paused" : "🟢 Active"}\n\nTo update, pass \`channel\` or \`interval\` to \`/buffer config\`.`,
      });
      return;
    }

    try {
      const updateData: any = {};
      if (channelOption) updateData.bufferChannelId = channelOption.id;
      if (intervalOption) updateData.bufferInterval = intervalOption;

      const updated = await prisma.guildConfig.update({
        where: { id: interaction.guildId },
        data: updateData,
      });

      const updatedChannel = updated.bufferChannelId
        ? `<#${updated.bufferChannelId}>`
        : "*None configured*";

      await interaction.editReply({
        content: `✅ **Buffer Settings Updated:**\n• Default Channel: ${updatedChannel}\n• Drip Interval: **${updated.bufferInterval} minutes**`,
      });
    } catch (err: any) {
      logger.error({ err, guildId: interaction.guildId }, "Error configuring buffer");
      await interaction.editReply({
        content: `❌ Failed to update buffer configuration: ${err.message}`,
      });
    }
  }
}
