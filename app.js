import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  SlashCommandBuilder,
} from "discord.js";
import translate from "google-translate-api-x";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const DISCORD_MESSAGE_LIMIT = 2000;

const jyutpingCommand = new SlashCommandBuilder()
  .setName("jyutping")
  .setDescription("Translate text to Cantonese and return Chinese characters")
  .addStringOption(option =>
    option
      .setName("text")
      .setDescription("The text to translate into Cantonese")
      .setRequired(true),
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
    await interaction.deferReply();

    // forceBatch: false hits the single endpoint (dt=rm), which includes Jyutping.
    const result = await translate(content, {
      to: "yue",
      client: "gtx",
      forceBatch: false,
    });
    const chinese = result.text || "";
    const jyutping = result.pronunciation;

    if (!chinese) {
      await interaction.editReply("No Cantonese translation was returned.");
      return;
    }

    const reply = jyutping
      ? `English: ${content}\nChinese: ${chinese}\nJyutping: ${jyutping}`
      : chinese;
    await interaction.editReply(reply.slice(0, DISCORD_MESSAGE_LIMIT));
  } catch (err) {
    console.error("Failed to translate message:", err);
    const errorMessage = "Could not translate that text. Please try again.";
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyErr) {
      console.error("Failed to send error reply:", replyErr);
    }
  }
});

client.login(token);
