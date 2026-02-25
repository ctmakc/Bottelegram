'use strict';

const { Router } = require('express');
const db = require('../../db/database');
const { requireAdminOrViewer, requireAdmin } = require('../middleware/auth');
const { sendGroupReminder } = require('../../scheduler/scheduler');

const router = Router();

// GET /api/admin/me — get current user's role
router.get('/me', (req, res) => {
  if (!req.dbUser) return res.json({ is_admin: false, is_viewer: false, is_approved: false });
  res.json({
    id: req.dbUser.id,
    is_admin: !!req.dbUser.is_admin,
    is_viewer: !!req.dbUser.is_viewer,
    is_approved: !!req.dbUser.is_approved,
    language: req.dbUser.language || 'es',
    full_name: req.dbUser.full_name,
  });
});

// GET /api/admin/orders — today's orders (admin/viewer)
router.get('/orders', requireAdminOrViewer, (req, res) => {
  const period = req.query.period || db.getTodayPeriod();
  const orders = db.getOrdersForPeriod(period);

  // Attach items to each order
  const full = orders.map(o => {
    const items = db.getDb().prepare(`
      SELECT oi.*, p.name_es, p.name_ru, p.unit_es, p.unit_ru
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
    `).all(o.id);
    return { ...o, items };
  });

  res.json(full);
});

// POST /api/admin/orders/:id/confirm — mark order as confirmed (admin only)
router.post('/orders/:id/confirm', requireAdmin, (req, res) => {
  db.confirmOrder(Number(req.params.id));
  res.json({ ok: true });
});

// ─── Groups ────────────────────────────────────────────────────────────────────

// GET /api/admin/groups
router.get('/groups', requireAdminOrViewer, (req, res) => {
  res.json(db.getAllGroups());
});

// POST /api/admin/groups
router.post('/groups', requireAdmin, (req, res) => {
  const { name, location, reminder_time, reminder_days, order_deadline_hours } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const group = db.createGroup({ name, location, reminder_time, reminder_days, order_deadline_hours });
  res.status(201).json(group);
});

// PATCH /api/admin/groups/:id
router.patch('/groups/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name, location, reminder_time, reminder_days, order_deadline_hours } = req.body;
  db.updateGroup(id, { name, location, reminder_time, reminder_days, order_deadline_hours });
  res.json({ ok: true });
});

// POST /api/admin/groups/:id/remind — manually trigger reminder for a group
router.post('/groups/:id/remind', requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const group = db.getGroupById(id);
  if (!group) return res.status(404).json({ error: 'Group not found' });
  await sendGroupReminder(group);
  res.json({ ok: true });
});

module.exports = router;
