'use strict';

const { Telegraf } = require('telegraf');
const { message } = require('telegraf/filters');

let botInstance = null;

function createBot(token) {
  const bot = new Telegraf(token);
  botInstance = bot;
  return bot;
}

function getBot() {
  if (!botInstance) throw new Error('Bot not initialized');
  return botInstance;
}

/**
 * Send a message to a Telegram chat (safe — catches errors).
 */
async function safeSend(chatId, text, extra = {}) {
  try {
    return await getBot().telegram.sendMessage(chatId, text, { parse_mode: 'Markdown', ...extra });
  } catch (err) {
    console.error(`[bot] Failed to send message to ${chatId}:`, err.message);
    return null;
  }
}

module.exports = { createBot, getBot, safeSend };
