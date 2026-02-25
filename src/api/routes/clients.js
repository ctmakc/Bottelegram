'use strict';

const { Router } = require('express');
const db = require('../../db/database');
const { requireAdminOrViewer, requireAdmin } = require('../middleware/auth');
const { t } = require('../../i18n/translations');
const { safeSend } = require('../../bot/bot');
const { buildOrderKeyboard } = require('../../bot/commands');

const router = Router();

// GET /api/clients — list all clients (admin/viewer)
router.get('/', requireAdminOrViewer, (req, res) => {
  const users = db.getAllUsers();
  res.json(users);
});

// POST /api/clients/:id/approve — approve a pending client (admin only)
router.post('/:id/approve', requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const users = db.getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.approveUser(user.telegram_id);
  const lang = user.language || 'es';
  const keyboard = buildOrderKeyboard(lang);
  await safeSend(user.telegram_id, t(lang, 'welcome_approved'), keyboard);

  res.json({ ok: true });
});

// POST /api/clients/:id/reject — reject a client (admin only)
router.post('/:id/reject', requireAdmin, async (req, res) => {
  const userId = Number(req.params.id);
  const users = db.getAllUsers();
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.rejectUser(user.telegram_id);
  const lang = user.language || 'es';
  await safeSend(user.telegram_id, t(lang, 'welcome_rejected'));

  res.json({ ok: true });
});

// PATCH /api/clients/:id/group — assign client to a group (admin only)
router.patch('/:id/group', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const { group_id } = req.body;
  db.setUserGroup(userId, group_id || null);
  res.json({ ok: true });
});

// PATCH /api/clients/:id/viewer — toggle viewer access (admin only)
router.patch('/:id/viewer', requireAdmin, (req, res) => {
  const userId = Number(req.params.id);
  const { is_viewer } = req.body;
  db.setUserViewer(userId, !!is_viewer);
  res.json({ ok: true });
});

module.exports = router;
