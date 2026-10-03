import { REST, Routes } from "discord.js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from workspace root or local
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import * as setupCmd from "./commands/admin/setup";
import * as reportCmd from "./commands/admin/report";
import * as ticketCmd from "./commands/tickets/ticket";
import * as scheduleCmd from "./commands/schedule/schedule";
import { logger } from "./utils/logger";

const commands = [
  setupCmd.data.toJSON(),
  reportCmd.data.toJSON(),
  ticketCmd.data.toJSON(),
  scheduleCmd.data.toJSON(),
];

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_DEV_GUILD_ID;

if (!token || !clientId) {
  logger.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment variables");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

async function deploy() {
  try {
    logger.info(`Started refreshing ${commands.length} application (/) commands.`);

    if (guildId) {
      logger.info(`Deploying commands instantly to development guild: ${guildId}`);
      await rest.put(Routes.applicationGuildCommands(clientId!, guildId), {
        body: commands,
      });
      logger.info("Successfully deployed commands to development guild.");
    } else {
      logger.info("Deploying commands globally across all servers.");
      await rest.put(Routes.applicationCommands(clientId!), {
        body: commands,
      });
      logger.info("Successfully deployed commands globally.");
    }
  } catch (error) {
    logger.error({ error }, "Failed to deploy application commands");
    process.exit(1);
  }
}

deploy();
