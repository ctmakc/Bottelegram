'use strict';

/**
 * Pure-bot order flow.
 *
 * The order "form" is a single Telegram message that gets EDITED on every
 * ➕/➖ tap.  Layout per product row (inline keyboard):
 *
 *   [ Vainilla         ] [ 0 ] [ ➖ ] [ ➕ ]
 *   [ Chocolate        ] [ 3 ] [ ➖ ] [ ➕ ]
 *   ...
 *   [   ✅ Confirmar (3 ud)   ]
 *   [      🔄 Resetear        ]
 */

const { Markup } = require('telegraf');
const db  = require('../db/database');
const { t } = require('../i18n/translations');
const { safeSend } = require('./bot');

const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;

// ── In-memory draft state  Map<telegramId, Map<productId, quantity>> ──────────
const drafts = new Map();

function getDraft(telegramId) {
  if (!drafts.has(telegramId)) drafts.set(telegramId, new Map());
  return drafts.get(telegramId);
}
function clearDraft(telegramId) { drafts.delete(telegramId); }
function loadDraftFromItems(telegramId, items) {
  const m = new Map();
  items.forEach(i => { if (i.quantity > 0) m.set(i.product_id, i.quantity); });
  drafts.set(telegramId, m);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDT(iso) {
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });
}

function buildItemsSummary(items, lang) {
  return items
    .filter(i => i.quantity > 0)
    .map(i => {
      const name = lang === 'ru' ? (i.name_ru || i.name_es) : i.name_es;
      const unit = lang === 'ru' ? 'шт' : 'ud';
      return `• ${name}: *${i.quantity} ${unit}*`;
    })
    .join('\n');
}

function computeDeadlines(user) {
  let deadlineIso = null, cancelDeadlineIso = null;
  if (user.group_id) {
    const g = db.getGroupById(user.group_id);
    if (g) {
      const d1 = new Date(); d1.setHours(d1.getHours() + g.order_deadline_hours);
      deadlineIso = d1.toISOString();
      const d2 = new Date(); d2.setHours(d2.getHours() + (g.cancel_deadline_hours || 1));
      cancelDeadlineIso = d2.toISOString();
    }
  }
  if (!cancelDeadlineIso) {
    const d2 = new Date(); d2.setHours(d2.getHours() + 1);
    cancelDeadlineIso = d2.toISOString();
  }
  return { deadlineIso, cancelDeadlineIso };
}

// ── Order FORM message ────────────────────────────────────────────────────────
function buildFormText(lang, total, deadlineIso) {
  const lines = [ lang === 'ru' ? '🍦 *Заказ Mini Melts*' : '🍦 *Pedido Mini Melts*', '' ];
  if (deadlineIso) {
    lines.push(lang === 'ru'
      ? `⏰ _Срок подачи: ${fmtDT(deadlineIso)}_`
      : `⏰ _Plazo: ${fmtDT(deadlineIso)}_`);
    lines.push('');
  }
  lines.push(total > 0
    ? (lang === 'ru' ? `📦 _Выбрано: *${total} шт*_` : `📦 _Seleccionado: *${total} ud*_`)
    : (lang === 'ru' ? '_Нажмите ➕ чтобы добавить товар:_' : '_Pulsa ➕ para añadir productos:_'));
  return lines.join('\n');
}

function buildFormKeyboard(products, draft, lang) {
  const rows = products.map(p => {
    const qty   = draft.get(p.id) || 0;
    const name  = (lang === 'ru' ? (p.name_ru || p.name_es) : p.name_es);
    const short = name.length > 19 ? name.slice(0, 18) + '…' : name;
    return [
      Markup.button.callback(short,              'noop'),
      Markup.button.callback(qty > 0 ? `${qty}` : '·', 'noop'),
      Markup.button.callback('➖', `op-${p.id}`),
      Markup.button.callback('➕', `op+${p.id}`),
    ];
  });

  const total = [...draft.values()].reduce((s, v) => s + v, 0);
  if (total > 0) {
    rows.push([Markup.button.callback(
      lang === 'ru' ? `✅ Подтвердить (${total} шт)` : `✅ Confirmar (${total} ud)`,
      'oc',
    )]);
  }
  rows.push([Markup.button.callback(lang === 'ru' ? '🔄 Сбросить' : '🔄 Resetear', 'ox')]);
  return Markup.inlineKeyboard(rows);
}

// ── Order SUMMARY message (after submission) ──────────────────────────────────
function buildSummaryText(lang, order, items) {
  const statusIcon = { submitted: '📤', confirmed: '✅', cancelled: '❌' }[order.status] || '📝';
  const statusText = {
    submitted: lang === 'ru' ? 'Отправлен' : 'Enviado',
    confirmed: lang === 'ru' ? 'Подтверждён командой' : 'Confirmado por el equipo',
    cancelled: lang === 'ru' ? 'Отменён' : 'Cancelado',
  }[order.status] || order.status;

  const lines = [`${statusIcon} *${statusText}*`, ''];
  let total = 0;
  items.filter(i => i.quantity > 0).forEach(i => {
    const name = lang === 'ru' ? (i.name_ru || i.name_es) : i.name_es;
    const unit = lang === 'ru' ? 'шт' : 'ud';
    lines.push(`• ${name}: *${i.quantity} ${unit}*`);
    total += i.quantity;
  });
  lines.push('', lang === 'ru' ? `📦 *Итого: ${total} шт*` : `📦 *Total: ${total} ud*`);

  const now = new Date();
  if (order.status === 'submitted') {
    if (order.deadline) {
      lines.push('', lang === 'ru'
        ? `✏️ _Редактирование до: ${fmtDT(order.deadline)}_`
        : `✏️ _Edición hasta: ${fmtDT(order.deadline)}_`);
    }
    if (order.cancel_deadline && new Date(order.cancel_deadline) > now) {
      lines.push(lang === 'ru'
        ? `⏱ _Отмена до: ${fmtDT(order.cancel_deadline)}_`
        : `⏱ _Cancelación hasta: ${fmtDT(order.cancel_deadline)}_`);
    }
  }
  return lines.join('\n');
}

function buildSummaryKeyboard(lang, order) {
  const now = new Date();
  const canEdit   = order.status === 'submitted' && (!order.deadline || new Date(order.deadline) > now);
  const canCancel = order.status === 'submitted' && order.cancel_deadline && new Date(order.cancel_deadline) > now;
  const btns = [];
  if (canEdit)   btns.push(Markup.button.callback(lang === 'ru' ? '✏️ Редактировать' : '✏️ Editar pedido', 'edit_order'));
  if (canCancel) btns.push(Markup.button.callback(lang === 'ru' ? '❌ Отменить заказ' : '❌ Cancelar pedido', 'cancel_order'));
  return btns.length ? Markup.inlineKeyboard([btns]) : null;
}

// ── Public handlers ───────────────────────────────────────────────────────────

/**
 * Entry point: called when user taps "Make Order" or sends /order.
 * Shows the form, or the summary if an order already exists for today.
 */
async function handleStartOrder(ctx) {
  const user = db.findUserByTelegramId(ctx.from.id);

  if (!user) {
    const msg = 'No estás registrado. Envía /start para comenzar.';
    if (ctx.callbackQuery) return ctx.answerCbQuery(msg, { show_alert: true });
    return ctx.reply(msg);
  }

  if (!user.is_approved && !user.is_admin) {
    const lang = user.language || 'es';
    const msg = user.is_pending
      ? (lang === 'ru' ? '⏳ Ваш запрос на рассмотрении.' : '⏳ Tu acceso está pendiente de aprobación.')
      : (lang === 'ru' ? '❌ Ваш запрос не был одобрён.' : '❌ Tu acceso no fue aprobado.');
    if (ctx.callbackQuery) return ctx.answerCbQuery(msg, { show_alert: true });
    return ctx.reply(msg);
  }

  const products = db.getActiveProducts();
  const period   = db.getTodayPeriod();
  const existing = db.getOrderForUser(user.id, period);
  const lang     = user.language || 'es';

  // Existing submitted order → show summary
  if (existing && existing.status !== 'draft') {
    const full = db.getOrderWithItems(existing.id);
    const text = buildSummaryText(lang, existing, full.items);
    const kb   = buildSummaryKeyboard(lang, existing);
    const opts = { parse_mode: 'Markdown', ...(kb || {}) };
    if (ctx.callbackQuery) {
      try { await ctx.editMessageText(text, opts); } catch (_) { await ctx.reply(text, opts); }
      return ctx.answerCbQuery();
    }
    return ctx.reply(text, opts);
  }

  // Fresh form
  clearDraft(ctx.from.id);
  if (existing) {
    const full = db.getOrderWithItems(existing.id);
    loadDraftFromItems(ctx.from.id, full.items);
  }

  const { deadlineIso } = computeDeadlines(user);
  const draft  = getDraft(ctx.from.id);
  const total  = [...draft.values()].reduce((s, v) => s + v, 0);
  const text   = buildFormText(lang, total, deadlineIso);
  const kb     = buildFormKeyboard(products, draft, lang);

  if (ctx.callbackQuery) {
    try { await ctx.editMessageText(text, { parse_mode: 'Markdown', ...kb }); } catch (_) { await ctx.reply(text, { parse_mode: 'Markdown', ...kb }); }
    return ctx.answerCbQuery();
  }
  return ctx.reply(text, { parse_mode: 'Markdown', ...kb });
}

/** Handle ➕ / ➖ button press */
async function handleOrderButton(ctx) {
  const user = db.findUserByTelegramId(ctx.from.id);
  if (!user || (!user.is_approved && !user.is_admin)) return ctx.answerCbQuery();

  const data = ctx.callbackQuery.data; // op+5 or op-5
  const delta = data[2] === '+' ? 1 : -1;
  const productId = Number(data.slice(3));

  const draft = getDraft(ctx.from.id);
  const cur   = draft.get(productId) || 0;
  const next  = Math.max(0, Math.min(999, cur + delta));
  if (next === 0) draft.delete(productId); else draft.set(productId, next);

  const products = db.getActiveProducts();
  const lang     = user.language || 'es';
  const { deadlineIso } = computeDeadlines(user);
  const total = [...draft.values()].reduce((s, v) => s + v, 0);

  try {
    await ctx.editMessageText(buildFormText(lang, total, deadlineIso), {
      parse_mode: 'Markdown',
      ...buildFormKeyboard(products, draft, lang),
    });
  } catch (_) {}
  return ctx.answerCbQuery();
}

/** Handle ✅ Confirmar */
async function handleOrderConfirm(ctx) {
  const user = db.findUserByTelegramId(ctx.from.id);
  if (!user || (!user.is_approved && !user.is_admin)) return ctx.answerCbQuery();

  const lang  = user.language || 'es';
  const draft = getDraft(ctx.from.id);
  const items = [];
  draft.forEach((quantity, product_id) => { if (quantity > 0) items.push({ product_id, quantity }); });

  if (items.length === 0) {
    return ctx.answerCbQuery(lang === 'ru' ? '⚠️ Добавьте хотя бы один товар' : '⚠️ Añade al menos un producto', { show_alert: true });
  }

  const period = db.getTodayPeriod();
  const { deadlineIso, cancelDeadlineIso } = computeDeadlines(user);
  const { order, isNew } = db.createOrUpdateOrder(user.id, period, items, deadlineIso, cancelDeadlineIso);
  const fullOrder = db.getOrderWithItems(order.id);
  clearDraft(ctx.from.id);

  // Notify manager
  if (MANAGER_CHAT_ID) {
    const summary = buildItemsSummary(fullOrder.items, 'es');
    const total   = fullOrder.items.reduce((s, i) => s + i.quantity, 0);
    const group   = user.group_id ? db.getGroupById(user.group_id) : null;
    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const text = t('es', isNew ? 'order_received_manager' : 'order_updated_manager', {
      client: user.full_name || user.username || String(user.telegram_id),
      group: group?.name || '—',
      date: dateStr,
      items: summary,
      total,
    });
    const mgrKb = Markup.inlineKeyboard([[
      Markup.button.callback('✅ Confirmar recepción', `mgr_confirm_${order.id}`),
    ]]);
    await safeSend(MANAGER_CHAT_ID, text, { parse_mode: 'Markdown', ...mgrKb });
  }
  db.logNotification({ user_id: user.id, order_id: order.id, type: isNew ? 'order_new' : 'order_update' });

  // Show summary to client
  const summaryText = buildSummaryText(lang, fullOrder, fullOrder.items);
  const summaryKb   = buildSummaryKeyboard(lang, fullOrder);
  const opts = { parse_mode: 'Markdown', ...(summaryKb || {}) };
  try { await ctx.editMessageText(summaryText, opts); } catch (_) { await ctx.reply(summaryText, opts); }
  return ctx.answerCbQuery(lang === 'ru' ? '✅ Заказ отправлен!' : '✅ ¡Pedido enviado!');
}

/** Handle 🔄 Reset */
async function handleOrderReset(ctx) {
  const user = db.findUserByTelegramId(ctx.from.id);
  if (!user) return ctx.answerCbQuery();
  clearDraft(ctx.from.id);
  const products = db.getActiveProducts();
  const lang     = user.language || 'es';
  const { deadlineIso } = computeDeadlines(user);
  try {
    await ctx.editMessageText(buildFormText(lang, 0, deadlineIso), {
      parse_mode: 'Markdown',
      ...buildFormKeyboard(products, getDraft(ctx.from.id), lang),
    });
  } catch (_) {}
  return ctx.answerCbQuery();
}

/** Handle ✏️ Edit (re-opens the form pre-filled) */
async function handleEditOrder(ctx) {
  const user = db.findUserByTelegramId(ctx.from.id);
  if (!user) return ctx.answerCbQuery();

  const lang  = user.language || 'es';
  const period = db.getTodayPeriod();
  const order  = db.getOrderForUser(user.id, period);

  if (!order || order.status !== 'submitted') {
    return ctx.answerCbQuery(lang === 'ru' ? 'Заказ больше не редактируется' : 'El pedido ya no es editable', { show_alert: true });
  }
  if (order.deadline && new Date(order.deadline) < new Date()) {
    return ctx.answerCbQuery(lang === 'ru' ? 'Срок редактирования истёк' : 'Plazo de edición superado', { show_alert: true });
  }

  const full = db.getOrderWithItems(order.id);
  loadDraftFromItems(ctx.from.id, full.items);
  const products = db.getActiveProducts();
  const draft    = getDraft(ctx.from.id);
  const total    = [...draft.values()].reduce((s, v) => s + v, 0);

  try {
    await ctx.editMessageText(buildFormText(lang, total, order.deadline), {
      parse_mode: 'Markdown',
      ...buildFormKeyboard(products, draft, lang),
    });
  } catch (_) {}
  return ctx.answerCbQuery();
}

/** Handle ❌ Cancel order */
async function handleCancelOrder(ctx) {
  const user = db.findUserByTelegramId(ctx.from.id);
  if (!user) return ctx.answerCbQuery();

  const lang  = user.language || 'es';
  const period = db.getTodayPeriod();
  const order  = db.getOrderForUser(user.id, period);

  if (!order || order.status !== 'submitted') return ctx.answerCbQuery();
  if (order.cancel_deadline && new Date(order.cancel_deadline) < new Date()) {
    return ctx.answerCbQuery(lang === 'ru' ? 'Время отмены истекло' : 'Plazo de cancelación superado', { show_alert: true });
  }

  db.cancelOrder(order.id);

  if (MANAGER_CHAT_ID) {
    const group   = user.group_id ? db.getGroupById(user.group_id) : null;
    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    await safeSend(MANAGER_CHAT_ID, t('es', 'order_cancelled_manager', {
      client: user.full_name || user.username || String(user.telegram_id),
      group: group?.name || '—',
      date: dateStr,
    }), { parse_mode: 'Markdown' });
  }
  db.logNotification({ user_id: user.id, order_id: order.id, type: 'order_cancel' });

  const cancelledText = lang === 'ru' ? '❌ *Заказ отменён*' : '❌ *Pedido cancelado*';
  try { await ctx.editMessageText(cancelledText, { parse_mode: 'Markdown' }); } catch (_) {}
  return ctx.answerCbQuery(lang === 'ru' ? 'Заказ отменён' : 'Pedido cancelado');
}

module.exports = {
  handleStartOrder,
  handleOrderButton,
  handleOrderConfirm,
  handleOrderReset,
  handleEditOrder,
  handleCancelOrder,
};
