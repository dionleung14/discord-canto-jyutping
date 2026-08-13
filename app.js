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

const textOption = option =>
  option
    .setName("text")
    .setDescription("The text to translate")
    .setRequired(true);

const slashCommands = [
  new SlashCommandBuilder()
    .setName("jyutping")
    .setDescription("Translate text to Cantonese characters and Jyutping")
    .addStringOption(textOption),
  new SlashCommandBuilder()
    .setName("simplified")
    .setDescription("Translate text to Simplified Chinese")
    .addStringOption(textOption),
];

const translateTargets = {
  jyutping: {
    to: "yue",
    romanizationLabel: "Jyutping",
    emptyMessage: "No Cantonese translation was returned.",
  },
  simplified: {
    to: "zh-CN",
    romanizationLabel: "Pinyin",
    emptyMessage: "No Simplified Chinese translation was returned.",
  },
};

client.once(Events.ClientReady, async readyClient => {
  console.log(`Logged in as ${readyClient.user.tag}`);

  try {
    // Register per-guild so the command appears immediately (global can take up to an hour).
    await Promise.all(
      readyClient.guilds.cache.map(guild =>
        guild.commands.set(slashCommands),
      ),
    );
    console.log("Registered /jyutping and /simplified slash commands");
  } catch (err) {
    console.error("Failed to register slash commands:", err);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const target = translateTargets[interaction.commandName];
  if (!target) return;

  const content = interaction.options.getString("text");
  if (!content) return;

  try {
    await interaction.deferReply();

    // forceBatch: false hits the single endpoint (dt=rm), which includes romanization.
    const result = await translate(content, {
      to: target.to,
      client: "gtx",
      forceBatch: false,
    });
    const chinese = result.text || "";
    const romanization = result.pronunciation;

    if (!chinese) {
      await interaction.editReply(target.emptyMessage);
      return;
    }

    const reply = romanization
      ? `English: ${content}\nChinese: ${chinese}\n${target.romanizationLabel}: ${romanization}`
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
