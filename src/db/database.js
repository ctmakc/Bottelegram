'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

function initDb(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createSchema();
  seedProducts();
  return db;
}

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      name                 TEXT    NOT NULL,
      location             TEXT,
      reminder_time        TEXT    DEFAULT '09:00',
      reminder_days        TEXT    DEFAULT '[1,2,3,4,5]',
      order_deadline_hours INTEGER DEFAULT 24,
      created_at           DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      telegram_id INTEGER UNIQUE NOT NULL,
      username    TEXT,
      full_name   TEXT,
      language    TEXT    DEFAULT 'es',
      is_admin    INTEGER DEFAULT 0,
      is_viewer   INTEGER DEFAULT 0,
      is_approved INTEGER DEFAULT 0,
      is_pending  INTEGER DEFAULT 1,
      group_id    INTEGER REFERENCES groups(id),
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name_es    TEXT NOT NULL,
      name_ru    TEXT,
      unit_es    TEXT DEFAULT 'ud',
      unit_ru    TEXT DEFAULT 'шт',
      active     INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS orders (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      status     TEXT    DEFAULT 'draft',
      deadline   DATETIME,
      period     TEXT    NOT NULL,
      notes      TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id),
      quantity   INTEGER DEFAULT 0,
      UNIQUE(order_id, product_id)
    );

    CREATE TABLE IF NOT EXISTS notifications_log (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      order_id INTEGER,
      type    TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

function seedProducts() {
  const count = db.prepare('SELECT COUNT(*) as c FROM products').get().c;
  if (count > 0) return;

  const insert = db.prepare(`
    INSERT INTO products (name_es, name_ru, unit_es, unit_ru, active, sort_order)
    VALUES (?, ?, 'ud', 'шт', 1, ?)
  `);

  const flavors = [
    ['Vainilla',              'Ваниль'],
    ['Chocolate',             'Шоколад'],
    ['Fresa',                 'Клубника'],
    ['Menta Chocolate',       'Мята с шоколадом'],
    ['Banana Split',          'Банан Сплит'],
    ['Chicle',                'Жвачка'],
    ['Algodón de Azúcar',     'Сахарная вата'],
    ['Tiramisú',              'Тирамису'],
    ['Limón',                 'Лимон-лайм'],
    ['Cookies & Cream',       'Куки со сливками'],
    ['Caramelo',              'Карамель'],
    ['Mango',                 'Манго'],
    ['Frambuesa',             'Малина'],
    ['Coco',                  'Кокос'],
    ['Pistacho',              'Фисташки'],
  ];

  const insertMany = db.transaction((items) => {
    items.forEach(([es, ru], i) => insert.run(es, ru, i));
  });
  insertMany(flavors);
}

// ─── Users ────────────────────────────────────────────────────────────────────

function findUserByTelegramId(telegramId) {
  return getDb().prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);
}

function createUser({ telegram_id, username, full_name, language = 'es', is_admin = 0, is_viewer = 0 }) {
  const stmt = getDb().prepare(`
    INSERT INTO users (telegram_id, username, full_name, language, is_admin, is_viewer)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(telegram_id, username || null, full_name || null, language, is_admin, is_viewer);
  return getDb().prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
}

function updateUserLanguage(telegramId, language) {
  getDb().prepare('UPDATE users SET language = ? WHERE telegram_id = ?').run(language, telegramId);
}

function approveUser(telegramId) {
  getDb().prepare('UPDATE users SET is_approved = 1, is_pending = 0 WHERE telegram_id = ?').run(telegramId);
}

function rejectUser(telegramId) {
  getDb().prepare('UPDATE users SET is_approved = 0, is_pending = 0 WHERE telegram_id = ?').run(telegramId);
}

function setUserGroup(userId, groupId) {
  getDb().prepare('UPDATE users SET group_id = ? WHERE id = ?').run(groupId, userId);
}

function setUserViewer(userId, isViewer) {
  getDb().prepare('UPDATE users SET is_viewer = ? WHERE id = ?').run(isViewer ? 1 : 0, userId);
}

function getAllUsers() {
  return getDb().prepare('SELECT u.*, g.name as group_name FROM users u LEFT JOIN groups g ON u.group_id = g.id ORDER BY u.created_at DESC').all();
}

function getPendingUsers() {
  return getDb().prepare('SELECT * FROM users WHERE is_pending = 1 ORDER BY created_at DESC').all();
}

function getApprovedUsersInGroup(groupId) {
  return getDb().prepare('SELECT * FROM users WHERE is_approved = 1 AND group_id = ?').all(groupId);
}

// ─── Products ─────────────────────────────────────────────────────────────────

function getActiveProducts() {
  return getDb().prepare('SELECT * FROM products WHERE active = 1 ORDER BY sort_order ASC, id ASC').all();
}

function getAllProducts() {
  return getDb().prepare('SELECT * FROM products ORDER BY sort_order ASC, id ASC').all();
}

function createProduct({ name_es, name_ru, unit_es = 'ud', unit_ru = 'шт' }) {
  const maxOrder = getDb().prepare('SELECT MAX(sort_order) as m FROM products').get().m || 0;
  const result = getDb().prepare(
    'INSERT INTO products (name_es, name_ru, unit_es, unit_ru, sort_order) VALUES (?, ?, ?, ?, ?)'
  ).run(name_es, name_ru || null, unit_es, unit_ru, maxOrder + 1);
  return getDb().prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
}

function updateProduct(id, fields) {
  const allowed = ['name_es', 'name_ru', 'unit_es', 'unit_ru', 'active', 'sort_order'];
  const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ');
  const vals = Object.keys(fields).filter(k => allowed.includes(k)).map(k => fields[k]);
  if (!sets) return;
  getDb().prepare(`UPDATE products SET ${sets} WHERE id = ?`).run(...vals, id);
}

// ─── Groups ───────────────────────────────────────────────────────────────────

function getAllGroups() {
  return getDb().prepare(`
    SELECT g.*, COUNT(u.id) as client_count
    FROM groups g
    LEFT JOIN users u ON u.group_id = g.id AND u.is_approved = 1
    GROUP BY g.id
    ORDER BY g.name
  `).all();
}

function getGroupById(id) {
  return getDb().prepare('SELECT * FROM groups WHERE id = ?').get(id);
}

function createGroup({ name, location, reminder_time = '09:00', reminder_days = '[1,2,3,4,5]', order_deadline_hours = 24 }) {
  const result = getDb().prepare(
    'INSERT INTO groups (name, location, reminder_time, reminder_days, order_deadline_hours) VALUES (?, ?, ?, ?, ?)'
  ).run(name, location || null, reminder_time, reminder_days, order_deadline_hours);
  return getDb().prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid);
}

function updateGroup(id, fields) {
  const allowed = ['name', 'location', 'reminder_time', 'reminder_days', 'order_deadline_hours'];
  const sets = Object.keys(fields).filter(k => allowed.includes(k)).map(k => `${k} = ?`).join(', ');
  const vals = Object.keys(fields).filter(k => allowed.includes(k)).map(k => fields[k]);
  if (!sets) return;
  getDb().prepare(`UPDATE groups SET ${sets} WHERE id = ?`).run(...vals, id);
}

// ─── Orders ───────────────────────────────────────────────────────────────────

function getTodayPeriod() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getOrderForUser(userId, period) {
  return getDb().prepare('SELECT * FROM orders WHERE user_id = ? AND period = ?').get(userId, period);
}

function getOrderWithItems(orderId) {
  const order = getDb().prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) return null;
  order.items = getDb().prepare(`
    SELECT oi.*, p.name_es, p.name_ru, p.unit_es, p.unit_ru
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all(orderId);
  return order;
}

function getOrdersForPeriod(period) {
  return getDb().prepare(`
    SELECT o.*, u.full_name, u.username, u.telegram_id, u.language, g.name as group_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    LEFT JOIN groups g ON g.id = u.group_id
    WHERE o.period = ?
    ORDER BY o.updated_at DESC
  `).all(period);
}

function createOrUpdateOrder(userId, period, items, deadlineIso) {
  const existing = getOrderForUser(userId, period);

  if (existing) {
    // Update
    getDb().prepare("UPDATE orders SET status = 'submitted', deadline = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(deadlineIso || null, existing.id);
    getDb().prepare('DELETE FROM order_items WHERE order_id = ?').run(existing.id);
    const insertItem = getDb().prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)');
    items.forEach(({ product_id, quantity }) => {
      if (quantity > 0) insertItem.run(existing.id, product_id, quantity);
    });
    return { order: getDb().prepare('SELECT * FROM orders WHERE id = ?').get(existing.id), isNew: false };
  } else {
    // Create
    const result = getDb().prepare(
      "INSERT INTO orders (user_id, status, deadline, period) VALUES (?, 'submitted', ?, ?)"
    ).run(userId, deadlineIso || null, period);
    const orderId = result.lastInsertRowid;
    const insertItem = getDb().prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)');
    items.forEach(({ product_id, quantity }) => {
      if (quantity > 0) insertItem.run(orderId, product_id, quantity);
    });
    return { order: getDb().prepare('SELECT * FROM orders WHERE id = ?').get(orderId), isNew: true };
  }
}

function confirmOrder(orderId) {
  getDb().prepare("UPDATE orders SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(orderId);
}

function logNotification({ user_id, order_id, type }) {
  getDb().prepare('INSERT INTO notifications_log (user_id, order_id, type) VALUES (?, ?, ?)').run(user_id || null, order_id || null, type);
}

module.exports = {
  initDb,
  getDb,
  // users
  findUserByTelegramId,
  createUser,
  updateUserLanguage,
  approveUser,
  rejectUser,
  setUserGroup,
  setUserViewer,
  getAllUsers,
  getPendingUsers,
  getApprovedUsersInGroup,
  // products
  getActiveProducts,
  getAllProducts,
  createProduct,
  updateProduct,
  // groups
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  // orders
  getTodayPeriod,
  getOrderForUser,
  getOrderWithItems,
  getOrdersForPeriod,
  createOrUpdateOrder,
  confirmOrder,
  logNotification,
};
