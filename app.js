import "dotenv/config";
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from "discord.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env");
  process.exit(1);
}

// Gateway client — needed to receive message events from text channels.
// (The Discord quick-start HTTP interactions flow only handles slash commands.)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Ignore bots (including this one) to avoid echo loops
  if (message.author.bot) return;

  const content = message.content;
  if (!content) return;

  try {
    await message.channel.send(content);
  } catch (err) {
    console.error("Failed to echo message:", err);
  }
});

client.login(token);
