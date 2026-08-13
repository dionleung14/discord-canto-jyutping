import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import translate, { speak } from "google-translate-api-x";

const DISCORD_MESSAGE_LIMIT = 2000;
const SPEAK_CHAR_LIMIT = 200;

const textOption = option =>
  option
    .setName("text")
    .setDescription("The text to translate")
    .setRequired(true);

const jyutpingTarget = {
  to: "yue",
  romanizationLabel: "Jyutping",
  emptyMessage: "No Cantonese translation was returned.",
};

const simplifiedTarget = {
  to: "zh-CN",
  romanizationLabel: "Pinyin",
  emptyMessage: "No Simplified Chinese translation was returned.",
};

export const commands = [
  {
    data: new SlashCommandBuilder()
      .setName("tjyp")
      .setDescription("Translate to Cantonese characters and Jyutping")
      .addStringOption(textOption),
    ...jyutpingTarget,
    withAudio: false,
  },
  {
    data: new SlashCommandBuilder()
      .setName("ajyp")
      .setDescription("Translate to Cantonese characters, Jyutping, and audio")
      .addStringOption(textOption),
    ...jyutpingTarget,
    withAudio: true,
  },
  {
    data: new SlashCommandBuilder()
      .setName("tsimp")
      .setDescription("Translate to Simplified Chinese")
      .addStringOption(textOption),
    ...simplifiedTarget,
    withAudio: false,
  },
  {
    data: new SlashCommandBuilder()
      .setName("asimp")
      .setDescription("Translate to Simplified Chinese with audio")
      .addStringOption(textOption),
    ...simplifiedTarget,
    withAudio: true,
  },
];

export const slashCommands = commands.map(command => command.data);

const commandsByName = Object.fromEntries(
  commands.map(command => [command.data.name, command]),
);

async function speakTranslation(text, to) {
  const chunks = [];
  for (let i = 0; i < text.length; i += SPEAK_CHAR_LIMIT) {
    chunks.push(text.slice(i, i + SPEAK_CHAR_LIMIT));
  }

  const audio = chunks.length === 1
    ? await speak(chunks[0], { to })
    : await speak(chunks, { to });
  const parts = Array.isArray(audio) ? audio : [audio];

  return Buffer.concat(parts.map(part => Buffer.from(part, "base64")));
}

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
    const payload = { content: reply.slice(0, DISCORD_MESSAGE_LIMIT) };

    if (command.withAudio) {
      try {
        const audio = await speakTranslation(chinese, command.to);
        payload.files = [
          new AttachmentBuilder(audio, { name: `${command.data.name}.mp3` }),
        ];
      } catch (err) {
        console.error("Failed to generate speech:", err);
      }
    }

    await interaction.editReply(payload);
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
