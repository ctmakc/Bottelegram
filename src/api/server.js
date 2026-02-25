'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const { authMiddleware } = require('./middleware/auth');

function createServer() {
  const app = express();

  // ── Middleware ───────────────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());

  // Serve the Mini App static files
  app.use(express.static(path.join(__dirname, '../../webapp')));

  // ── Auth ─────────────────────────────────────────────────────────────────────
  // Apply Telegram auth to all /api/* routes
  app.use('/api', authMiddleware);

  // ── Routes ───────────────────────────────────────────────────────────────────
  app.use('/api/products', require('./routes/products'));
  app.use('/api/orders', require('./routes/orders'));
  app.use('/api/clients', require('./routes/clients'));
  app.use('/api/admin', require('./routes/admin'));

  // ── SPA fallback ─────────────────────────────────────────────────────────────
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../webapp/index.html'));
  });

  return app;
}

module.exports = { createServer };
