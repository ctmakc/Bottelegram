'use strict';

const { Markup } = require('telegraf');
const db = require('../db/database');
const { t } = require('../i18n/translations');
const { safeSend } = require('./bot');

const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'msconsult';

function buildOrderKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'open_order_btn'), 'start_order')],
  ]);
}

function buildAdminKeyboard(lang) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(t(lang, 'open_order_btn'), 'start_order')],
  ]);
}

/**
 * Handle /start command.
 * Flow: show language picker → register as pending → notify manager.
 */
async function handleStart(ctx) {
  const tgUser = ctx.from;
  const existingUser = db.findUserByTelegramId(tgUser.id);

  if (existingUser) {
    // Already in the system
    const lang = existingUser.language || 'es';
    if (existingUser.is_approved) {
      const keyboard = existingUser.is_admin ? buildAdminKeyboard(lang) : buildOrderKeyboard(lang);
      await ctx.reply(t(lang, 'already_approved'), keyboard);
      if (existingUser.is_admin) {
        const hint = lang === 'ru'
          ? '⚙️ *Команды:* /orders · /clients · /products · /groups'
          : '⚙️ *Comandos:* /orders · /clients · /products · /groups';
        await ctx.reply(hint, { parse_mode: 'Markdown' });
      }
      return;
    } else if (existingUser.is_pending) {
      return ctx.reply(t(lang, 'already_pending'));
    } else {
      return ctx.reply(t(lang, 'welcome_rejected'));
    }
  }

  // New user — show language selector
  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
  const msg = t('es', 'select_language', { name: fullName });

  return ctx.reply(msg, Markup.inlineKeyboard([
    [
      Markup.button.callback(t('es', 'btn_es'), `lang_es_${tgUser.id}`),
      Markup.button.callback(t('ru', 'btn_ru'), `lang_ru_${tgUser.id}`),
    ],
  ]));
}

/**
 * Called when user clicks the language button.
 * Registers the user, notifies manager.
 */
async function handleLanguageSelection(ctx, lang, telegramId) {
  const tgUser = ctx.from;

  // Ensure this is the same user who started (not someone else clicking)
  if (tgUser.id !== telegramId) return ctx.answerCbQuery();

  const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
  const username = tgUser.username || '';

  // Check if already registered (race condition safety)
  let user = db.findUserByTelegramId(telegramId);
  if (!user) {
    // Is this the designated admin username?
    const isAdmin = username.toLowerCase() === ADMIN_USERNAME.toLowerCase() ? 1 : 0;

    user = db.createUser({
      telegram_id: telegramId,
      username,
      full_name: fullName,
      language: lang,
      is_admin: isAdmin,
    });

    // Auto-approve admin
    if (isAdmin) {
      db.approveUser(telegramId);
      user = db.findUserByTelegramId(telegramId);
    }
  } else {
    db.updateUserLanguage(telegramId, lang);
  }

  await ctx.editMessageText(t(lang, 'welcome_pending', { name: fullName }));

  // If admin — auto-approve, no need to notify manager
  if (user.is_admin) {
    await safeSend(telegramId, t(lang, 'welcome_approved'), buildAdminKeyboard(lang));
    const hint = lang === 'ru'
      ? '⚙️ *Команды администратора:*\n/orders — заказы дня\n/clients — клиенты\n/products — продукты\n/groups — группы доставки'
      : '⚙️ *Comandos de administración:*\n/orders — pedidos del día\n/clients — clientes\n/products — productos\n/groups — grupos de entrega';
    await safeSend(telegramId, hint);
    return ctx.answerCbQuery();
  }

  // Notify manager
  if (MANAGER_CHAT_ID) {
    const date = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const msgText = t('es', 'approval_request', {
      name: fullName,
      username: username || '—',
      telegram_id: telegramId,
      date,
    });

    await safeSend(MANAGER_CHAT_ID, msgText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback(`✅ Aprobar / Одобрить`, `approve_${telegramId}`),
          Markup.button.callback(`❌ Rechazar / Отклонить`, `reject_${telegramId}`),
        ],
      ]),
    });
  }

  return ctx.answerCbQuery();
}

/**
 * Manager approves a client.
 */
async function handleApprove(ctx, telegramId) {
  db.approveUser(telegramId);
  const user = db.findUserByTelegramId(telegramId);
  const lang = user?.language || 'es';

  // Notify the approved user
  const keyboard = buildOrderKeyboard(lang);
  await safeSend(telegramId, t(lang, 'welcome_approved'), keyboard);

  // Update manager's message
  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (_) {}

  return ctx.answerCbQuery(t('es', 'approved_answer'));
}

/**
 * Manager rejects a client.
 */
async function handleReject(ctx, telegramId) {
  db.rejectUser(telegramId);
  const user = db.findUserByTelegramId(telegramId);
  const lang = user?.language || 'es';

  // Notify the rejected user
  await safeSend(telegramId, t(lang, 'welcome_rejected'));

  try {
    await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
  } catch (_) {}

  return ctx.answerCbQuery(t('es', 'rejected_answer'));
}

module.exports = {
  handleStart,
  handleLanguageSelection,
  handleApprove,
  handleReject,
  buildOrderKeyboard,
  buildAdminKeyboard,
};
