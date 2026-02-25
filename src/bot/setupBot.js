'use strict';

/**
 * Registers all bot commands and callback handlers on the Telegraf instance.
 */

const {
  handleStart,
  handleLanguageSelection,
  handleApprove,
  handleReject,
} = require('./commands');

function setupBot(bot) {
  // ── /start ─────────────────────────────────────────────────────────────────
  bot.start(handleStart);

  // ── Language selection callbacks ───────────────────────────────────────────
  bot.action(/^lang_(es|ru)_(\d+)$/, async (ctx) => {
    const lang = ctx.match[1];
    const telegramId = Number(ctx.match[2]);
    await handleLanguageSelection(ctx, lang, telegramId);
  });

  // ── Manager approval callbacks ─────────────────────────────────────────────
  bot.action(/^approve_(\d+)$/, async (ctx) => {
    const telegramId = Number(ctx.match[1]);
    await handleApprove(ctx, telegramId);
  });

  bot.action(/^reject_(\d+)$/, async (ctx) => {
    const telegramId = Number(ctx.match[1]);
    await handleReject(ctx, telegramId);
  });

  // ── Error handler ──────────────────────────────────────────────────────────
  bot.catch((err, ctx) => {
    console.error(`[bot] Error for ${ctx.updateType}:`, err.message);
  });
}

module.exports = { setupBot };
