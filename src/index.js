'use strict';

require('dotenv').config();

const { initDb } = require('./db/database');
const { createBot } = require('./bot/bot');
const { setupBot } = require('./bot/setupBot');
const { startScheduler } = require('./scheduler/scheduler');

const BOT_TOKEN = process.env.BOT_TOKEN;
const DB_PATH = process.env.DB_PATH || './data/bot.db';

if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN is not set. Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

if (!process.env.MANAGER_CHAT_ID) {
  console.warn('WARNING: MANAGER_CHAT_ID is not set. Order notifications will not be sent to manager.');
}

// ── Database ──────────────────────────────────────────────────────────────────
console.log('[db] Initializing database at', DB_PATH);
initDb(DB_PATH);
console.log('[db] Database ready.');

// ── Telegram Bot ──────────────────────────────────────────────────────────────
const bot = createBot(BOT_TOKEN);
setupBot(bot);

// ── Scheduler ─────────────────────────────────────────────────────────────────
startScheduler();

// ── Start bot ─────────────────────────────────────────────────────────────────
bot.launch()
  .then(() => console.log('[bot] Bot started via long polling'))
  .catch(err => {
    console.error('[bot] Failed to start:', err.message);
    process.exit(1);
  });

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
