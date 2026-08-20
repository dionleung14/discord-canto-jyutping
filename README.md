# Discord Canto Jyutping Bot

A Discord bot for translating English text into Cantonese and Mandarin, with automatic romanization and optional spoken audio.

This project is built with Node.js and Discord.js. It registers slash commands in each guild and translates user input into Chinese text with either Jyutping or Pinyin output.

## Features

- Translate English text into Cantonese
- Show Cantonese romanization in Jyutping
- Optionally output simplified Chinese characters for Cantonese
- Translate into Mandarin with Pinyin
- Attach generated MP3 audio for audio-enabled commands
- Register slash commands automatically when the bot starts

## Commands

- `/tjyp` — Translate to Cantonese characters and Jyutping
- `/ajyp` — Translate to Cantonese characters, Jyutping, and audio
- `/tsimp` — Translate to simplified Cantonese characters and Jyutping
- `/asimp` — Translate to simplified Cantonese characters, Jyutping, and audio
- `/tmand` — Translate to Mandarin characters and Pinyin
- `/amand` — Translate to Mandarin characters, Pinyin, and audio

Example usage:

```text
/tjyp text:hello everyone
/amand text:how are you?
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file in the project root:

   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   ```

3. Start the bot:

   ```bash
   npm start
   ```

For local development with automatic restarts:

```bash
npm run dev
```

## Discord bot setup

Before running the bot, make sure:

- you created a Discord application and bot in the Discord Developer Portal
- the bot token is placed in `.env`
- the bot is invited to your server with permission to use slash commands

The bot registers its commands per guild when it starts, which makes them appear in the server quickly.

## Project files

- `app.js` — creates the Discord client and registers slash commands
- `commands.js` — defines all command handlers and translation logic
- `package.json` — project scripts and dependencies

## Notes

- The bot uses the `Guilds` intent only.
- Audio generation is attempted only for the `a*` command variants.
- Responses are trimmed to Discord's 2000-character message limit.
- This project does not currently include a license file.
