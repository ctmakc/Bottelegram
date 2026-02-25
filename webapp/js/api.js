/**
 * API client for the Mini Melts Mini App.
 * Sends Telegram initData in the X-Telegram-Init-Data header for authentication.
 */
(function () {
  'use strict';

  const BASE = '/api';

  function getInitData() {
    if (window.Telegram && window.Telegram.WebApp) {
      return window.Telegram.WebApp.initData || '';
    }
    return '';
  }

  async function request(method, path, body) {
    const headers = {
      'Content-Type': 'application/json',
      'X-Telegram-Init-Data': getInitData(),
    };

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(BASE + path, opts);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  const api = {
    // ── Auth / user info ──────────────────────────────────────────────────────
    getMe: () => request('GET', '/admin/me'),

    // ── Products ──────────────────────────────────────────────────────────────
    getProducts: () => request('GET', '/products'),
    getAllProducts: () => request('GET', '/products/all'),
    createProduct: (data) => request('POST', '/products', data),
    updateProduct: (id, data) => request('PATCH', `/products/${id}`, data),

    // ── Orders ────────────────────────────────────────────────────────────────
    getCurrentOrder: () => request('GET', '/orders/current'),
    submitOrder: (items) => request('POST', '/orders', { items }),

    // ── Admin ─────────────────────────────────────────────────────────────────
    getAdminOrders: (period) => request('GET', `/admin/orders${period ? '?period=' + period : ''}`),
    confirmOrder: (id) => request('POST', `/admin/orders/${id}/confirm`),

    // ── Clients ───────────────────────────────────────────────────────────────
    getClients: () => request('GET', '/clients'),
    approveClient: (id) => request('POST', `/clients/${id}/approve`),
    rejectClient: (id) => request('POST', `/clients/${id}/reject`),
    setClientGroup: (id, group_id) => request('PATCH', `/clients/${id}/group`, { group_id }),
    setClientViewer: (id, is_viewer) => request('PATCH', `/clients/${id}/viewer`, { is_viewer }),

    // ── Groups ────────────────────────────────────────────────────────────────
    getGroups: () => request('GET', '/admin/groups'),
    createGroup: (data) => request('POST', '/admin/groups', data),
    updateGroup: (id, data) => request('PATCH', `/admin/groups/${id}`, data),
    sendReminder: (id) => request('POST', `/admin/groups/${id}/remind`),
  };

  window.api = api;
})();
