'use strict';

const crypto = require('crypto');
const db = require('../../db/database');

const BOT_TOKEN = process.env.BOT_TOKEN;

/**
 * Validate Telegram Mini App initData using HMAC-SHA256.
 * Returns the parsed user object or null if invalid.
 */
function validateTelegramInitData(initData) {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const receivedHash = params.get('hash');
    if (!receivedHash) return null;

    params.delete('hash');

    // Sort params and build data-check-string
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');

    // Secret key = HMAC-SHA256("WebAppData", BOT_TOKEN)
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();

    const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    if (computedHash !== receivedHash) return null;

    // Parse user field
    const userRaw = params.get('user');
    if (!userRaw) return null;

    return JSON.parse(userRaw);
  } catch {
    return null;
  }
}

/**
 * Express middleware that authenticates Telegram Mini App requests.
 *
 * Expects:
 *   - Header: x-telegram-init-data  (the raw initData string from Telegram.WebApp.initDataUnsafe)
 *   OR
 *   - Query:  ?initData=...
 *
 * Sets req.tgUser (Telegram user object) and req.dbUser (database user row).
 *
 * In development mode (BOT_TOKEN starts with "dev_"), skips HMAC verification
 * and uses X-Dev-User-Id header for testing.
 */
async function authMiddleware(req, res, next) {
  const initData = req.headers['x-telegram-init-data'] || req.query.initData;

  // ── Dev mode bypass ────────────────────────────────────────────────────────
  if (BOT_TOKEN && BOT_TOKEN.startsWith('dev_')) {
    const devId = Number(req.headers['x-dev-user-id'] || 0);
    req.tgUser = { id: devId, first_name: 'Dev', last_name: 'User', username: 'devuser' };
    req.dbUser = devId ? db.findUserByTelegramId(devId) : null;
    return next();
  }

  // ── Production validation ──────────────────────────────────────────────────
  const tgUser = validateTelegramInitData(initData);
  if (!tgUser) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const dbUser = db.findUserByTelegramId(tgUser.id);
  req.tgUser = tgUser;
  req.dbUser = dbUser;
  next();
}

/**
 * Middleware that requires the user to be an approved client, admin, or viewer.
 */
function requireApproved(req, res, next) {
  if (!req.dbUser || (!req.dbUser.is_approved && !req.dbUser.is_admin)) {
    return res.status(403).json({ error: 'Not approved' });
  }
  next();
}

/**
 * Middleware that requires admin or viewer access.
 */
function requireAdminOrViewer(req, res, next) {
  if (!req.dbUser || (!req.dbUser.is_admin && !req.dbUser.is_viewer)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware that requires full admin access (not viewer-only).
 */
function requireAdmin(req, res, next) {
  if (!req.dbUser || !req.dbUser.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

module.exports = { authMiddleware, requireApproved, requireAdminOrViewer, requireAdmin };
