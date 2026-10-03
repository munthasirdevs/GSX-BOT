import { Events, Interaction } from "discord.js";
import { TicketManager } from "../services/ticketManager";
import { logger } from "../utils/logger";

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction) {
  try {
    // 1. Slash Commands
    if (interaction.isChatInputCommand()) {
      const client = interaction.client as any;
      const command = client.commands?.get(interaction.commandName);

      if (!command) {
        logger.warn({ commandName: interaction.commandName }, "Command not found in registry");
        return;
      }

      try {
        await command.execute(interaction);
      } catch (cmdError) {
        logger.error({ cmdError, commandName: interaction.commandName }, "Error executing slash command");
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: "❌ There was an internal error executing this command.", ephemeral: true });
        } else {
          await interaction.reply({ content: "❌ There was an internal error executing this command.", ephemeral: true });
        }
      }
      return;
    }

    // 2. Button Interactions
    if (interaction.isButton()) {
      if (interaction.customId === "ticket_create") {
        const modal = TicketManager.buildCreateModal();
        await interaction.showModal(modal);
        return;
      }

      if (interaction.customId === "ticket_close") {
        await TicketManager.handleTicketClose(interaction);
        return;
      }
    }

    // 3. Modal Submissions
    if (interaction.isModalSubmit()) {
      if (interaction.customId === "modal_ticket_create") {
        await TicketManager.handleModalSubmit(interaction);
        return;
      }
    }
  } catch (error) {
    logger.error({ error }, "Unhandled error in interactionCreate handler");
  }
}
