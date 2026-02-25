'use strict';

require('dotenv').config();

const { initDb } = require('./db/database');
const { createBot } = require('./bot/bot');
const { setupBot } = require('./bot/setupBot');
const { createServer } = require('./api/server');
const { startScheduler } = require('./scheduler/scheduler');

const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './data/bot.db';

if (!BOT_TOKEN) {
  console.error('ERROR: BOT_TOKEN is not set. Copy .env.example to .env and fill in the values.');
  process.exit(1);
}

if (!process.env.MANAGER_CHAT_ID) {
  console.warn('WARNING: MANAGER_CHAT_ID is not set. Order notifications will not be sent to manager.');
}

if (!process.env.WEBAPP_URL) {
  console.warn('WARNING: WEBAPP_URL is not set. Mini App buttons will not work correctly.');
}

// ── Database ──────────────────────────────────────────────────────────────────
console.log('[db] Initializing database at', DB_PATH);
initDb(DB_PATH);
console.log('[db] Database ready.');

// ── Telegram Bot ──────────────────────────────────────────────────────────────
const bot = createBot(BOT_TOKEN);
setupBot(bot);

// ── Express API + Static files ────────────────────────────────────────────────
const app = createServer();
app.listen(PORT, () => {
  console.log(`[api] Server running on http://localhost:${PORT}`);
  console.log(`[webapp] Mini App served at http://localhost:${PORT}/`);
});

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
