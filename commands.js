import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import translate, { speak } from "google-translate-api-x";
import OpenCC from "opencc-js";
import { pinyin } from "pinyin-pro";
import ToJyutping from "to-jyutping";

const DISCORD_MESSAGE_LIMIT = 2000;
const SPEAK_CHAR_LIMIT = 200;
const toSimplified = OpenCC.Converter({ from: "hk", to: "cn" });

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
  to: "yue",
  romanizationLabel: "Jyutping",
  emptyMessage: "No Simplified Chinese translation was returned.",
  simplify: true,
};

const mandarinTarget = {
  to: "zh-CN",
  romanizationLabel: "Pinyin",
  emptyMessage: "No Mandarin translation was returned.",
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
      .setDescription(
        "Translate to Cantonese characters and Jyutping with audio",
      )
      .addStringOption(textOption),
    ...jyutpingTarget,
    withAudio: true,
  },
  {
    data: new SlashCommandBuilder()
      .setName("tsimp")
      .setDescription(
        "Translate to Cantonese in Simplified characters and Jyutping",
      )
      .addStringOption(textOption),
    ...simplifiedTarget,
    withAudio: false,
  },
  {
    data: new SlashCommandBuilder()
      .setName("asimp")
      .setDescription(
        "Translate to Cantonese in Simplified characters, Jyutping, and audio",
      )
      .addStringOption(textOption),
    ...simplifiedTarget,
    withAudio: true,
  },
  {
    data: new SlashCommandBuilder()
      .setName("tmand")
      .setDescription("Translate to Mandarin characters and Pinyin")
      .addStringOption(textOption),
    ...mandarinTarget,
    withAudio: false,
  },
  {
    data: new SlashCommandBuilder()
      .setName("amand")
      .setDescription("Translate to Mandarin characters, Pinyin, and audio")
      .addStringOption(textOption),
    ...mandarinTarget,
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

  const audio =
    chunks.length === 1
      ? await speak(chunks[0], { to })
      : await speak(chunks, { to });
  const parts = Array.isArray(audio) ? audio : [audio];

  return Buffer.concat(parts.map(part => Buffer.from(part, "base64")));
}

function romanize(command, displayText, speechText, googlePronunciation) {
  if (googlePronunciation) return googlePronunciation;
  if (command.romanizationLabel === "Jyutping") {
    return ToJyutping.getJyutpingText(speechText || displayText);
  }
  if (command.romanizationLabel === "Pinyin") {
    return pinyin(displayText);
  }
  return "";
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
    const speechText = result.text || "";
    const chinese = command.simplify ? toSimplified(speechText) : speechText;
    const romanization = romanize(
      command,
      chinese,
      speechText,
      result.pronunciation,
    );

    if (!chinese) {
      await interaction.editReply(command.emptyMessage);
      return;
    }

    const reply = [
      `English: ${content}`,
      `Chinese: ${chinese}`,
      ...(romanization ? [`${command.romanizationLabel}: ${romanization}`] : []),
    ].join("\n");
    const payload = { content: reply.slice(0, DISCORD_MESSAGE_LIMIT) };

    if (command.withAudio) {
      try {
        const audio = await speakTranslation(speechText, command.to);
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
