'use strict';

const {
  handleStart,
  handleLanguageSelection,
  handleApprove,
  handleReject,
} = require('./commands');

const {
  handleStartOrder,
  handleOrderButton,
  handleOrderConfirm,
  handleOrderReset,
  handleEditOrder,
  handleCancelOrder,
} = require('./order');

const {
  handleAdminOrders,
  handleAdminClients,
  handleAdminProducts,
  handleAdminGroups,
  handleManagerConfirmOrder,
  handleProductToggle,
  handleSendGroupReminder,
} = require('./admin');

function setupBot(bot) {
  // ── /start ─────────────────────────────────────────────────────────────────
  bot.start(handleStart);

  // ── /order — open order form (clients) ────────────────────────────────────
  bot.command('order', handleStartOrder);

  // ── Admin commands ─────────────────────────────────────────────────────────
  bot.command('orders', handleAdminOrders);
  bot.command('clients', handleAdminClients);
  bot.command('products', handleAdminProducts);
  bot.command('groups', handleAdminGroups);

  // ── Language selection ─────────────────────────────────────────────────────
  bot.action(/^lang_(es|ru)_(\d+)$/, async (ctx) => {
    await handleLanguageSelection(ctx, ctx.match[1], Number(ctx.match[2]));
  });

  // ── Client approval ────────────────────────────────────────────────────────
  bot.action(/^approve_(\d+)$/, async (ctx) => {
    await handleApprove(ctx, Number(ctx.match[1]));
  });
  bot.action(/^reject_(\d+)$/, async (ctx) => {
    await handleReject(ctx, Number(ctx.match[1]));
  });

  // ── Order flow ─────────────────────────────────────────────────────────────
  bot.action('start_order', handleStartOrder);
  bot.action(/^op[+\-]\d+$/, handleOrderButton);
  bot.action('oc', handleOrderConfirm);
  bot.action('ox', handleOrderReset);
  bot.action('edit_order', handleEditOrder);
  bot.action('cancel_order', handleCancelOrder);

  // ── Manager / admin callbacks ──────────────────────────────────────────────
  bot.action(/^mgr_confirm_(\d+)$/, handleManagerConfirmOrder);
  bot.action(/^toggle_product_(\d+)$/, handleProductToggle);
  bot.action(/^send_reminder_(\d+)$/, handleSendGroupReminder);

  // ── noop (display-only buttons in the order form) ─────────────────────────
  bot.action('noop', (ctx) => ctx.answerCbQuery());

  // ── Error handler ──────────────────────────────────────────────────────────
  bot.catch((err, ctx) => {
    console.error(`[bot] Error for ${ctx.updateType}:`, err.message);
  });

  // ── Register bot commands menu ─────────────────────────────────────────────
  bot.telegram.setMyCommands([
    { command: 'start',    description: 'Iniciar / Запустить' },
    { command: 'order',    description: 'Hacer pedido / Сделать заказ' },
    { command: 'orders',   description: '[Admin] Pedidos del día / Заказы дня' },
    { command: 'clients',  description: '[Admin] Clientes / Клиенты' },
    { command: 'products', description: '[Admin] Productos / Продукты' },
    { command: 'groups',   description: '[Admin] Grupos de entrega / Группы' },
  ]).catch(err => console.error('[bot] Failed to set commands:', err.message));
}

module.exports = { setupBot };
