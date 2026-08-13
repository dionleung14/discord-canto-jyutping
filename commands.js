import { SlashCommandBuilder } from "discord.js";
import translate from "google-translate-api-x";

const DISCORD_MESSAGE_LIMIT = 2000;

const textOption = option =>
  option
    .setName("text")
    .setDescription("The text to translate")
    .setRequired(true);

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("jyutping")
      .setDescription("Translate text to Cantonese characters and Jyutping")
      .addStringOption(textOption),
    to: "yue",
    romanizationLabel: "Jyutping",
    emptyMessage: "No Cantonese translation was returned.",
  },
  {
    data: new SlashCommandBuilder()
      .setName("simplified")
      .setDescription("Translate text to Simplified Chinese")
      .addStringOption(textOption),
    to: "zh-CN",
    romanizationLabel: "Pinyin",
    emptyMessage: "No Simplified Chinese translation was returned.",
  },
];

export const slashCommands = commands.map(command => command.data);

const commandsByName = Object.fromEntries(
  commands.map(command => [command.data.name, command]),
);

export async function handleSlashCommand(interaction) {
  if (!interaction.isChatInputCommand()) return;

  const command = commandsByName[interaction.commandName];
  if (!command) return;

  const content = interaction.options.getString("text");
  if (!content) return;

  try {
    await interaction.deferReply();

    // forceBatch: false hits the single endpoint (dt=rm), which includes romanization.
    const result = await translate(content, {
      to: command.to,
      client: "gtx",
      forceBatch: false,
    });
    const chinese = result.text || "";
    const romanization = result.pronunciation;

    if (!chinese) {
      await interaction.editReply(command.emptyMessage);
      return;
    }

    const reply = romanization
      ? `English: ${content}\nChinese: ${chinese}\n${command.romanizationLabel}: ${romanization}`
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
}
