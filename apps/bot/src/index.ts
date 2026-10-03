import { Client, Collection, GatewayIntentBits, Partials } from "discord.js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config();

import { logger } from "./utils/logger";
import * as readyEvent from "./events/ready";
import * as messageCreateEvent from "./events/messageCreate";
import * as interactionCreateEvent from "./events/interactionCreate";

import * as setupCmd from "./commands/admin/setup";
import * as reportCmd from "./commands/admin/report";
import * as ticketCmd from "./commands/tickets/ticket";
import * as scheduleCmd from "./commands/schedule/schedule";
import * as bufferCmd from "./commands/schedule/buffer";

// Extend Client type to attach commands collection
export interface ExtendedClient extends Client {
  commands: Collection<string, any>;
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
}) as ExtendedClient;

client.commands = new Collection();

// Register Slash Commands
const commandList = [setupCmd, reportCmd, ticketCmd, scheduleCmd, bufferCmd];
for (const cmd of commandList) {
  client.commands.set(cmd.data.name, cmd);
}

// Register Event Handlers
client.once(readyEvent.name, (...args) => readyEvent.execute(...args));
client.on(messageCreateEvent.name, (...args) => messageCreateEvent.execute(...args));
client.on(interactionCreateEvent.name, (...args) => interactionCreateEvent.execute(...args));

// Handle Process Signals
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled Rejection detected");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught Exception occurred");
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  logger.warn("DISCORD_TOKEN is not set in environment. Please provide it in .env before running the bot.");
} else {
  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to login to Discord Gateway");
  });
}

export { client };
