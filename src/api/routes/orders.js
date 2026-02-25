'use strict';

const { Router } = require('express');
const db = require('../../db/database');
const { requireApproved } = require('../middleware/auth');
const { t } = require('../../i18n/translations');
const { safeSend } = require('../../bot/bot');
const { buildDeadline } = require('../../scheduler/scheduler');

const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;

const router = Router();

/**
 * Build a readable order summary for the manager notification.
 */
function buildItemsSummary(items, lang = 'es') {
  return items
    .filter(i => i.quantity > 0)
    .map(i => {
      const name = lang === 'ru' ? (i.name_ru || i.name_es) : i.name_es;
      const unit = lang === 'ru' ? (i.unit_ru || 'шт') : (i.unit_es || 'ud');
      return `• ${name}: *${i.quantity} ${unit}*`;
    })
    .join('\n');
}

// GET /api/orders/current — get the client's order for today
router.get('/current', requireApproved, (req, res) => {
  const userId = req.dbUser.id;
  const period = db.getTodayPeriod();
  const order = db.getOrderForUser(userId, period);

  if (!order) {
    return res.json({ order: null });
  }

  const full = db.getOrderWithItems(order.id);
  res.json({ order: full });
});

// POST /api/orders — submit or update an order
router.post('/', requireApproved, async (req, res) => {
  const user = req.dbUser;
  const { items } = req.body; // [{ product_id, quantity }]

  if (!Array.isArray(items) || items.filter(i => i.quantity > 0).length === 0) {
    return res.status(400).json({ error: 'No items provided' });
  }

  const period = db.getTodayPeriod();

  // Deadlines depend on group settings
  let deadlineIso = null;
  let cancelDeadlineIso = null;
  if (user.group_id) {
    const group = db.getGroupById(user.group_id);
    if (group) {
      deadlineIso = buildDeadline(group.order_deadline_hours);
      cancelDeadlineIso = buildDeadline(group.cancel_deadline_hours || 1);
    }
  } else {
    // No group: default cancel window = 1 hour
    cancelDeadlineIso = buildDeadline(1);
  }

  const { order, isNew } = db.createOrUpdateOrder(user.id, period, items, deadlineIso, cancelDeadlineIso);

  // Load full order with items for notification
  const fullOrder = db.getOrderWithItems(order.id);

  // Notify manager
  if (MANAGER_CHAT_ID) {
    const lang = user.language || 'es';
    const summary = buildItemsSummary(fullOrder.items, lang);
    const total = fullOrder.items.reduce((s, i) => s + i.quantity, 0);
    const group = user.group_id ? db.getGroupById(user.group_id) : null;
    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    const msgKey = isNew ? 'order_received_manager' : 'order_updated_manager';
    const text = t('es', msgKey, {
      client: user.full_name || user.username || String(user.telegram_id),
      group: group?.name || '—',
      date: dateStr,
      items: summary,
      total,
    });

    await safeSend(MANAGER_CHAT_ID, text, { parse_mode: 'Markdown' });
  }

  db.logNotification({ user_id: user.id, order_id: order.id, type: isNew ? 'order_new' : 'order_update' });

  res.json({
    order: fullOrder,
    message: isNew ? 'created' : 'updated',
  });
});

// POST /api/orders/cancel — cancel a submitted order within the cancel window
router.post('/cancel', requireApproved, async (req, res) => {
  const user = req.dbUser;
  const period = db.getTodayPeriod();
  const order = db.getOrderForUser(user.id, period);

  if (!order) return res.status(404).json({ error: 'No order found' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'Already cancelled' });
  if (order.status === 'confirmed') return res.status(400).json({ error: 'Order already confirmed by manager' });

  // Enforce cancellation window
  if (order.cancel_deadline && new Date(order.cancel_deadline) < new Date()) {
    return res.status(400).json({ error: 'Cancellation window has expired' });
  }

  db.cancelOrder(order.id);

  // Notify manager
  if (MANAGER_CHAT_ID) {
    const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const group = user.group_id ? db.getGroupById(user.group_id) : null;
    const text = t('es', 'order_cancelled_manager', {
      client: user.full_name || user.username || String(user.telegram_id),
      group: group?.name || '—',
      date: dateStr,
    });
    await safeSend(MANAGER_CHAT_ID, text, { parse_mode: 'Markdown' });
  }

  db.logNotification({ user_id: user.id, order_id: order.id, type: 'order_cancel' });
  res.json({ ok: true });
});

module.exports = router;
