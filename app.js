import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleSlashCommand, slashCommands } from "./commands.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    // Register per-guild so the command appears immediately (global can take up to an hour).
    await Promise.all(
      readyClient.guilds.cache.map(guild =>
        guild.commands.set(slashCommands),
      ),
    );
    console.log(
      `Registered slash commands: ${slashCommands.map(command => `/${command.name}`).join(", ")}`,
    );
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
});

client.on(Events.InteractionCreate, handleSlashCommand);

client.login(token);
