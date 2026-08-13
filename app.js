import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const jyutpingCommand = new SlashCommandBuilder()
  .setName("jyutping")
  .setDescription("Echo the text you send")
  .addStringOption(option =>
    option.setName("text").setDescription("The text to echo").setRequired(true),
  );

client.once(Events.ClientReady, async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    // Register per-guild so the command appears immediately (global can take up to an hour).
    await Promise.all(
      readyClient.guilds.cache.map(guild =>
        guild.commands.set([jyutpingCommand]),
      ),
    );
    console.log("Registered /jyutping slash command");
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName !== "jyutping") return;

  const content = interaction.options.getString("text");
  if (!content) return;

  try {
    await interaction.reply(content);
  } catch (err) {
    console.error("Failed to echo message:", err);
  }
});

client.login(token);
