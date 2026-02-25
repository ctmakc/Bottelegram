'use strict';

const { Markup } = require('telegraf');
const db = require('../db/database');
const { sendGroupReminder } = require('../scheduler/scheduler');

function getUser(ctx) {
  return db.findUserByTelegramId(ctx.from.id);
}

function checkAccess(ctx) {
  const u = getUser(ctx);
  return u && (u.is_admin || u.is_viewer);
}

function checkAdmin(ctx) {
  const u = getUser(ctx);
  return u && u.is_admin;
}

// ── /orders [YYYY-MM-DD] ──────────────────────────────────────────────────────
async function handleAdminOrders(ctx) {
  if (!checkAccess(ctx)) return;

  const args = (ctx.message?.text || '').split(/\s+/);
  const period = args[1] && /^\d{4}-\d{2}-\d{2}$/.test(args[1])
    ? args[1]
    : db.getTodayPeriod();

  const orders = db.getOrdersForPeriod(period);
  const dateStr = new Date(period + 'T12:00:00Z').toLocaleDateString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Madrid',
  });

  if (orders.length === 0) {
    return ctx.reply(
      `📋 *Pedidos — ${dateStr}*\n\n_Sin pedidos para esta fecha._\n\nUsa: /orders YYYY-MM-DD`,
      { parse_mode: 'Markdown' },
    );
  }

  const lines = [`📋 *Pedidos — ${dateStr}* (${orders.length})`, ''];
  const rows = [];
  const isAdm = checkAdmin(ctx);

  for (const o of orders) {
    const icon = { submitted: '📤', confirmed: '✅', cancelled: '❌' }[o.status] || '📝';
    const full = db.getOrderWithItems(o.id);
    const total = full.items.reduce((s, i) => s + i.quantity, 0);
    const items = full.items
      .filter(i => i.quantity > 0)
      .map(i => `  • ${i.name_es}: ${i.quantity}`)
      .join('\n');
    const name = o.full_name || o.username || String(o.telegram_id);
    lines.push(`${icon} *${name}* — ${o.group_name || '—'}`);
    if (items) lines.push(items);
    lines.push(`  _Total: ${total} ud_`);
    lines.push('');
    if (o.status === 'submitted' && isAdm) {
      rows.push([Markup.button.callback(`✅ ${name.slice(0, 25)}`, `mgr_confirm_${o.id}`)]);
    }
  }

  const text = lines.join('\n');
  const extra = { parse_mode: 'Markdown' };
  if (rows.length) extra.reply_markup = Markup.inlineKeyboard(rows).reply_markup;

  // Split if too long
  if (text.length > 4000) {
    const chunks = [];
    let cur = '';
    for (const line of lines) {
      if ((cur + line + '\n').length > 4000) { chunks.push(cur); cur = ''; }
      cur += line + '\n';
    }
    if (cur) chunks.push(cur);
    for (let i = 0; i < chunks.length; i++) {
      const opts = { parse_mode: 'Markdown' };
      if (i === chunks.length - 1 && rows.length) opts.reply_markup = Markup.inlineKeyboard(rows).reply_markup;
      await ctx.reply(chunks[i], opts);
    }
  } else {
    await ctx.reply(text, extra);
  }
}

// ── /clients ──────────────────────────────────────────────────────────────────
async function handleAdminClients(ctx) {
  if (!checkAdmin(ctx)) return;

  const users = db.getAllUsers();
  const pending = users.filter(u => u.is_pending);
  const approved = users.filter(u => u.is_approved);

  const lines = [`👥 *Clientes* (${users.length} total)`, ''];
  const rows = [];

  if (pending.length > 0) {
    lines.push('*⏳ Pendientes de aprobación:*');
    for (const u of pending) {
      const name = u.full_name || u.username || String(u.telegram_id);
      lines.push(`  • ${name} (@${u.username || '—'})`);
      rows.push([
        Markup.button.callback(`✅ ${name.slice(0, 20)}`, `approve_${u.telegram_id}`),
        Markup.button.callback('❌ Rechazar', `reject_${u.telegram_id}`),
      ]);
    }
    lines.push('');
  }

  if (approved.length > 0) {
    lines.push('*✅ Aprobados:*');
    for (const u of approved) {
      const name = u.full_name || u.username || String(u.telegram_id);
      const group = u.group_name || '—';
      const viewer = u.is_viewer ? ' 👁' : '';
      lines.push(`  • ${name} — ${group}${viewer}`);
    }
  } else {
    lines.push('_No hay clientes aprobados._');
  }

  const extra = { parse_mode: 'Markdown' };
  if (rows.length) extra.reply_markup = Markup.inlineKeyboard(rows).reply_markup;
  await ctx.reply(lines.join('\n'), extra);
}

// ── /products ─────────────────────────────────────────────────────────────────
async function handleAdminProducts(ctx) {
  if (!checkAdmin(ctx)) return;

  const products = db.getAllProducts();
  const lines = [`🍦 *Productos* (${products.length})`, ''];
  const rows = [];

  for (const p of products) {
    lines.push(`${p.active ? '✅' : '❌'} ${p.name_es} / ${p.name_ru || '—'}`);
    rows.push([Markup.button.callback(
      `${p.active ? '🔴 Desactivar' : '🟢 Activar'}: ${p.name_es.slice(0, 22)}`,
      `toggle_product_${p.id}`,
    )]);
  }

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(rows),
  });
}

// ── /groups ───────────────────────────────────────────────────────────────────
async function handleAdminGroups(ctx) {
  if (!checkAdmin(ctx)) return;

  const groups = db.getAllGroups();
  if (groups.length === 0) {
    return ctx.reply('📍 *Grupos*\n\n_No hay grupos configurados._', { parse_mode: 'Markdown' });
  }

  const lines = [`📍 *Grupos* (${groups.length})`, ''];
  const rows = [];

  for (const g of groups) {
    lines.push(`*${g.name}* — ${g.location || '—'}`);
    lines.push(`  Clientes: ${g.client_count} | Recordatorio: ${g.reminder_time} | Plazo: ${g.order_deadline_hours}h`);
    lines.push('');
    rows.push([Markup.button.callback(`📣 Recordatorio: ${g.name.slice(0, 22)}`, `send_reminder_${g.id}`)]);
  }

  await ctx.reply(lines.join('\n'), {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(rows),
  });
}

// ── Callback: manager confirm order ──────────────────────────────────────────
async function handleManagerConfirmOrder(ctx) {
  if (!checkAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos');

  const orderId = Number(ctx.match[1]);
  const order = db.getOrderWithItems(orderId);
  if (!order) return ctx.answerCbQuery('Pedido no encontrado');

  db.confirmOrder(orderId);
  try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch (_) {}
  return ctx.answerCbQuery('✅ Pedido confirmado');
}

// ── Callback: toggle product active ──────────────────────────────────────────
async function handleProductToggle(ctx) {
  if (!checkAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos');

  const productId = Number(ctx.match[1]);
  const products = db.getAllProducts();
  const p = products.find(x => x.id === productId);
  if (!p) return ctx.answerCbQuery('Producto no encontrado');

  db.updateProduct(productId, { active: p.active ? 0 : 1 });

  const updated = db.getAllProducts();
  const lines = [`🍦 *Productos* (${updated.length})`, ''];
  const rows = [];
  for (const prod of updated) {
    lines.push(`${prod.active ? '✅' : '❌'} ${prod.name_es} / ${prod.name_ru || '—'}`);
    rows.push([Markup.button.callback(
      `${prod.active ? '🔴 Desactivar' : '🟢 Activar'}: ${prod.name_es.slice(0, 22)}`,
      `toggle_product_${prod.id}`,
    )]);
  }
  try {
    await ctx.editMessageText(lines.join('\n'), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(rows),
    });
  } catch (_) {}

  return ctx.answerCbQuery(p.active ? '🔴 Desactivado' : '🟢 Activado');
}

// ── Callback: send group reminder manually ────────────────────────────────────
async function handleSendGroupReminder(ctx) {
  if (!checkAdmin(ctx)) return ctx.answerCbQuery('⛔ Sin permisos');

  const groupId = Number(ctx.match[1]);
  const group = db.getGroupById(groupId);
  if (!group) return ctx.answerCbQuery('Grupo no encontrado');

  await sendGroupReminder(group);
  return ctx.answerCbQuery('✅ Recordatorio enviado');
}

module.exports = {
  handleAdminOrders,
  handleAdminClients,
  handleAdminProducts,
  handleAdminGroups,
  handleManagerConfirmOrder,
  handleProductToggle,
  handleSendGroupReminder,
};
