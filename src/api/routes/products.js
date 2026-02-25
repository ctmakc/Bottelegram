'use strict';

const { Router } = require('express');
const db = require('../../db/database');
const { requireApproved, requireAdmin } = require('../middleware/auth');

const router = Router();

// GET /api/products — list active products (for clients placing orders)
router.get('/', requireApproved, (req, res) => {
  const products = db.getActiveProducts();
  res.json(products);
});

// GET /api/products/all — list all products (admin: includes inactive)
router.get('/all', requireAdmin, (req, res) => {
  const products = db.getAllProducts();
  res.json(products);
});

// POST /api/products — create a new product (admin only)
router.post('/', requireAdmin, (req, res) => {
  const { name_es, name_ru, unit_es, unit_ru } = req.body;
  if (!name_es) return res.status(400).json({ error: 'name_es is required' });
  const product = db.createProduct({ name_es, name_ru, unit_es, unit_ru });
  res.status(201).json(product);
});

// PATCH /api/products/:id — update a product (admin only)
router.patch('/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name_es, name_ru, unit_es, unit_ru, active, sort_order } = req.body;
  db.updateProduct(id, { name_es, name_ru, unit_es, unit_ru, active, sort_order });
  res.json({ ok: true });
});

module.exports = router;
