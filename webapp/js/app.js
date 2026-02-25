/**
 * Mini Melts — Telegram Mini App
 * Main application logic.
 */
(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────
  const state = {
    lang: localStorage.getItem('mm_lang') || 'es',
    mode: 'client',       // 'client' | 'admin'
    me: null,             // response from /api/admin/me
    products: [],
    currentOrder: null,
    editMode: false,      // true when client is editing an existing order
    adminTab: 'orders',   // orders | clients | products | groups
    adminFilter: 'all',   // for orders: all | submitted | confirmed
    adminOrders: [],
    adminClients: [],
    adminProducts: [],
    adminGroups: [],
    adminPeriod: todayStr(),
    addingProduct: false,
    addingGroup: false,
  };

  // ─── Telegram WebApp ─────────────────────────────────────────────────────────
  const twa = window.Telegram?.WebApp;
  if (twa) {
    twa.ready();
    twa.expand();
  }

  function getTgUser() {
    if (twa && twa.initDataUnsafe?.user) return twa.initDataUnsafe.user;
    return null;
  }

  // ─── i18n shorthand ─────────────────────────────────────────────────────────
  function t(key, params) { return window.i18n.t(state.lang, key, params); }

  function setLang(lang) {
    state.lang = lang;
    localStorage.setItem('mm_lang', lang);
    renderAll();
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function fmt(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleString(state.lang === 'ru' ? 'ru-RU' : 'es-ES', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  function fmtDate(isoStr) {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleDateString(state.lang === 'ru' ? 'ru-RU' : 'es-ES', {
      weekday: 'long', day: '2-digit', month: 'long',
    });
  }

  let toastTimer;
  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  // ─── DOM helpers ─────────────────────────────────────────────────────────────
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v;
      else if (k === 'style') Object.assign(el.style, v);
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    for (const child of children.flat()) {
      if (child == null || child === false) continue;
      el.append(typeof child === 'string' ? document.createTextNode(child) : child);
    }
    return el;
  }

  function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // ─── Bootstrap ──────────────────────────────────────────────────────────────
  async function boot() {
    showStatus('loading');
    try {
      state.me = await window.api.getMe();
    } catch (e) {
      showStatus('error');
      return;
    }

    // Update language from user DB preference if first visit
    if (!localStorage.getItem('mm_lang') && state.me.language) {
      state.lang = state.me.language;
    }

    renderAll();

    // Pre-load data
    if (state.me.is_approved || state.me.is_admin) {
      await loadClientData();
    }
    if (state.me.is_admin || state.me.is_viewer) {
      await loadAdminData();
    }
  }

  async function loadClientData() {
    try {
      const [products, orderRes] = await Promise.all([
        window.api.getProducts(),
        window.api.getCurrentOrder(),
      ]);
      state.products = products;
      state.currentOrder = orderRes.order;
    } catch (e) {
      console.error('loadClientData', e);
    }
    if (state.mode === 'client') renderClientView();
  }

  async function loadAdminData() {
    try {
      const [orders, clients, products, groups] = await Promise.all([
        window.api.getAdminOrders(state.adminPeriod),
        window.api.getClients(),
        window.api.getAllProducts(),
        window.api.getGroups(),
      ]);
      state.adminOrders = orders;
      state.adminClients = clients;
      state.adminProducts = products;
      state.adminGroups = groups;
    } catch (e) {
      console.error('loadAdminData', e);
    }
    if (state.mode === 'admin') renderAdminView();
  }

  // ─── Root render ─────────────────────────────────────────────────────────────
  function renderAll() {
    renderHeader();
    if (state.mode === 'client') {
      renderClientView();
    } else {
      renderAdminView();
    }
  }

  // ─── Status screens ──────────────────────────────────────────────────────────
  function showStatus(type) {
    const main = document.getElementById('mainContent');
    clear(main);
    const icons = { loading: '⏳', error: '⚠️', locked: '🔒', pending: '⏳' };
    const msgs  = {
      loading: t('loading'),
      error: t('error_loading'),
      locked: t('not_approved'),
      pending: t('not_approved'),
    };
    main.append(h('div', { class: 'status-screen' },
      h('div', { class: 'icon' }, icons[type] || '❓'),
      h('p', {}, msgs[type] || type),
    ));
  }

  // ─── HEADER ──────────────────────────────────────────────────────────────────
  function renderHeader() {
    const header = document.getElementById('appHeader');
    clear(header);

    // Logo
    header.append(h('div', { class: 'logo' }, 'Mini ', h('span', {}, 'Melts')));

    // Right side
    const right = h('div', { class: 'header-right' });

    // Language switcher
    const langSwitch = h('div', { class: 'lang-switch' });
    for (const l of ['es', 'ru']) {
      const btn = h('button', {
        class: l === state.lang ? 'active' : '',
        onclick: () => setLang(l),
      }, l === 'es' ? '🇪🇸 ES' : '🇷🇺 RU');
      langSwitch.append(btn);
    }
    right.append(langSwitch);

    // Mode toggle (only if admin or viewer)
    if (state.me && (state.me.is_admin || state.me.is_viewer)) {
      const toggle = h('button', {
        class: 'mode-toggle',
        onclick: () => {
          state.mode = state.mode === 'client' ? 'admin' : 'client';
          renderAll();
          if (state.mode === 'admin') loadAdminData();
          else loadClientData();
        },
      }, state.mode === 'client' ? t('btn_to_admin') : t('btn_to_client'));
      right.append(toggle);
    }

    header.append(right);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CLIENT VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function renderClientView() {
    const main = document.getElementById('mainContent');
    clear(main);

    if (!state.me || (!state.me.is_approved && !state.me.is_admin)) {
      showStatus('locked');
      return;
    }

    if (state.products.length === 0) {
      showStatus('loading');
      return;
    }

    const wrap = h('div', { class: 'main-content' });

    // ── Greeting ───────────────────────────────────────────────────────────────
    const tgUser = getTgUser();
    const name = tgUser?.first_name || state.me.full_name || '';
    wrap.append(h('div', { class: 'greeting' }, t('greeting', { name })));

    // ── Order status / deadline ────────────────────────────────────────────────
    const order = state.currentOrder;
    const now = new Date();
    const isExpired = order?.deadline ? new Date(order.deadline) < now : false;
    const canEdit = order ? (!isExpired && order.status !== 'confirmed' && order.status !== 'cancelled') : true;
    const canCancel = order
      && order.status === 'submitted'
      && order.cancel_deadline
      && new Date(order.cancel_deadline) > now;

    if (order) {
      // Show status badge
      const statusKey = 'order_status_' + order.status;
      wrap.append(h('div', { class: 'order-status-badge' }, t(statusKey)));

      // Edit deadline
      if (order.deadline && order.status !== 'cancelled') {
        const cls = 'deadline-banner' + (isExpired ? ' expired' : '');
        wrap.append(h('div', { class: cls },
          t('deadline_label'), ' ',
          h('strong', {}, fmt(order.deadline)),
        ));
      }

      // Cancel deadline (only when still cancellable or just expired)
      if (order.cancel_deadline && order.status === 'submitted') {
        const cancelExpired = new Date(order.cancel_deadline) <= now;
        if (!cancelExpired) {
          wrap.append(h('div', { class: 'deadline-banner' },
            t('cancel_deadline_label'), ' ',
            h('strong', {}, fmt(order.cancel_deadline)),
          ));
        }
      }
    }

    // ── Products / order form ─────────────────────────────────────────────────
    const isReadOnly = order && !state.editMode && (!canEdit || order.status === 'cancelled');

    if (!isReadOnly || state.editMode) {
      // Editable form
      renderOrderForm(wrap, order, canEdit);
    } else {
      // Read-only summary
      renderOrderSummary(wrap, order, canCancel);
    }

    main.append(wrap);
  }

  function renderOrderForm(container, existingOrder, canEdit) {
    const itemMap = {};
    if (existingOrder) {
      existingOrder.items.forEach(i => { itemMap[i.product_id] = i.quantity; });
    }

    // Table
    const thead = h('thead', {},
      h('tr', {},
        h('th', { id: 'colFlavor' }, t('col_flavor')),
        h('th', {}, t('col_qty')),
      )
    );

    const tbody = h('tbody', {});
    for (const p of state.products) {
      const qty = itemMap[p.id] || 0;
      const name = state.lang === 'ru' ? (p.name_ru || p.name_es) : p.name_es;

      const input = h('input', {
        type: 'number',
        class: 'qty-input',
        min: '0',
        max: '999',
        value: String(qty),
        'data-product-id': String(p.id),
      });
      if (!canEdit) input.setAttribute('disabled', 'true');

      tbody.append(h('tr', {},
        h('td', {}, name),
        h('td', {}, input),
      ));
    }

    const table = h('table', { class: 'products-table' }, thead, tbody);
    container.append(h('div', { class: 'products-section' }, table));

    // Submit / edit buttons
    if (canEdit) {
      const isUpdate = !!existingOrder && state.editMode;
      const submitBtn = h('button', {
        class: 'btn-primary',
        id: 'submitBtn',
        onclick: () => handleSubmitOrder(container),
      }, isUpdate ? t('btn_update') : t('btn_submit'));
      container.append(h('div', { class: 'submit-area' }, submitBtn));
    } else if (existingOrder && existingOrder.status !== 'confirmed') {
      container.append(h('div', { class: 'submit-area' },
        h('p', { class: 'deadline-banner expired' }, t('past_deadline')),
      ));
    }
  }

  function renderOrderSummary(container, order, canCancel = false) {
    const items = order.items.filter(i => i.quantity > 0);
    const ul = h('ul', { class: 'order-items-list' });
    let total = 0;
    for (const item of items) {
      const name = state.lang === 'ru' ? (item.name_ru || item.name_es) : item.name_es;
      const unit = state.lang === 'ru' ? (item.unit_ru || 'шт') : (item.unit_es || 'ud');
      total += item.quantity;
      ul.append(h('li', {},
        h('span', {}, name),
        h('span', { class: 'qty' }, `${item.quantity} ${unit}`),
      ));
    }

    const canStillEdit = !order.deadline || new Date(order.deadline) > new Date();

    container.append(
      h('div', { class: 'products-section' }, h('div', { style: { padding: '14px' } },
        ul,
        h('div', { class: 'order-total' }, `Total: ${total} ud`),
      )),
    );

    const btnArea = h('div', { class: 'submit-area' });

    if (canStillEdit && order.status !== 'confirmed' && order.status !== 'cancelled') {
      btnArea.append(h('button', {
        class: 'btn-secondary',
        onclick: () => { state.editMode = true; renderClientView(); },
      }, t('btn_edit')));
    } else if (order.status !== 'confirmed' && order.status !== 'cancelled') {
      btnArea.append(h('p', { class: 'deadline-banner expired' }, t('past_deadline')));
    }

    if (canCancel) {
      btnArea.append(h('button', {
        class: 'btn-small btn-danger',
        style: { marginTop: '10px', width: '100%', padding: '13px', borderRadius: '12px', fontSize: '15px' },
        onclick: () => handleCancelOrder(),
      }, t('btn_cancel_order')));
    }

    if (btnArea.children.length) container.append(btnArea);
  }

  async function handleSubmitOrder(container) {
    const inputs = document.querySelectorAll('.qty-input');
    const items = [...inputs].map(inp => ({
      product_id: Number(inp.getAttribute('data-product-id')),
      quantity: Number(inp.value) || 0,
    }));

    if (items.every(i => i.quantity === 0)) {
      showToast(t('no_items_error'));
      return;
    }

    const btn = document.getElementById('submitBtn');
    if (btn) { btn.disabled = true; btn.textContent = t('loading'); }

    try {
      const res = await window.api.submitOrder(items);
      state.currentOrder = res.order;
      state.editMode = false;
      showToast(res.message === 'created' ? t('order_success') : t('order_updated_msg'));
      if (twa) twa.HapticFeedback?.notificationOccurred('success');
      renderClientView();
    } catch (e) {
      showToast(t('error_loading'));
      if (btn) { btn.disabled = false; btn.textContent = t('btn_submit'); }
    }
  }

  async function handleCancelOrder() {
    if (!confirm(t('cancel_confirm'))) return;
    try {
      await window.api.cancelOrder();
      // Refresh order from server
      const res = await window.api.getCurrentOrder();
      state.currentOrder = res.order;
      state.editMode = false;
      showToast(t('order_cancelled_msg'));
      if (twa) twa.HapticFeedback?.notificationOccurred('warning');
      renderClientView();
    } catch (e) {
      showToast(t('error_loading'));
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ADMIN VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  function renderAdminView() {
    const main = document.getElementById('mainContent');
    clear(main);

    if (!state.me || (!state.me.is_admin && !state.me.is_viewer)) {
      showStatus('locked');
      return;
    }

    const wrap = h('div', {});

    // ── Tabs ──────────────────────────────────────────────────────────────────
    const tabs = h('div', { class: 'admin-tabs' });
    const TAB_KEYS = ['orders', 'clients', 'products', 'groups'];
    const TAB_LABELS = ['tab_orders', 'tab_clients', 'tab_products', 'tab_groups'];
    TAB_KEYS.forEach((key, i) => {
      tabs.append(h('button', {
        class: 'admin-tab' + (state.adminTab === key ? ' active' : ''),
        onclick: () => { state.adminTab = key; renderAdminView(); },
      }, t(TAB_LABELS[i])));
    });
    wrap.append(tabs);

    const contentWrap = h('div', { class: 'main-content' });

    switch (state.adminTab) {
      case 'orders':   renderAdminOrders(contentWrap); break;
      case 'clients':  renderAdminClients(contentWrap); break;
      case 'products': renderAdminProducts(contentWrap); break;
      case 'groups':   renderAdminGroups(contentWrap); break;
    }

    wrap.append(contentWrap);
    main.append(wrap);
  }

  // ── Orders tab ───────────────────────────────────────────────────────────────
  function renderAdminOrders(container) {
    // Period picker
    const periodInput = h('input', {
      type: 'date',
      value: state.adminPeriod,
      onchange: async (e) => {
        state.adminPeriod = e.target.value;
        try {
          state.adminOrders = await window.api.getAdminOrders(state.adminPeriod);
          renderAdminView();
        } catch (_) {}
      },
    });
    container.append(h('div', { class: 'period-picker' }, periodInput));

    // Section heading
    container.append(h('div', { class: 'section-heading' },
      t('today_orders', { date: fmtDate(state.adminPeriod + 'T12:00:00') }),
    ));

    // Filter pills
    const filterBar = h('div', { class: 'filter-bar' });
    [['all', 'filter_all'], ['submitted', 'filter_submitted'], ['confirmed', 'filter_confirmed'], ['cancelled', 'filter_cancelled']].forEach(([f, k]) => {
      filterBar.append(h('button', {
        class: 'filter-pill' + (state.adminFilter === f ? ' active' : ''),
        onclick: () => { state.adminFilter = f; renderAdminView(); },
      }, t(k)));
    });
    container.append(filterBar);

    // Orders list
    let orders = state.adminOrders;
    if (state.adminFilter !== 'all') {
      orders = orders.filter(o => o.status === state.adminFilter);
    }

    if (orders.length === 0) {
      container.append(h('div', { class: 'empty-state' },
        h('div', { class: 'empty-icon' }, '📋'),
        t('no_orders_today'),
      ));
      return;
    }

    for (const order of orders) {
      container.append(renderOrderCard(order));
    }
  }

  function renderOrderCard(order) {
    const items = order.items.filter(i => i.quantity > 0);
    const total = items.reduce((s, i) => s + i.quantity, 0);

    const statusCls = { submitted: 'badge-submitted', confirmed: 'badge-confirmed', cancelled: 'badge-rejected', draft: 'badge-draft' };
    const statusLabel = t('order_status_' + order.status);

    const ul = h('ul', { class: 'order-items-list' });
    for (const item of items) {
      const name = state.lang === 'ru' ? (item.name_ru || item.name_es) : item.name_es;
      const unit = state.lang === 'ru' ? (item.unit_ru || 'шт') : (item.unit_es || 'ud');
      ul.append(h('li', {},
        h('span', {}, name),
        h('span', { class: 'qty' }, `${item.quantity} ${unit}`),
      ));
    }

    const timeStr = fmt(order.updated_at || order.created_at);
    const groupStr = order.group_name ? t('order_group', { group: order.group_name }) : '';

    const card = h('div', { class: 'card' },
      h('div', { class: 'card-header' },
        h('div', {},
          h('div', { class: 'card-title' }, order.full_name || `@${order.username}` || order.telegram_id),
          groupStr ? h('div', { class: 'card-subtitle' }, groupStr) : null,
        ),
        h('span', { class: `badge ${statusCls[order.status] || 'badge-draft'}` }, statusLabel),
      ),
      h('div', { class: 'card-meta' }, t('order_time', { time: timeStr })),
      ul,
      h('div', { class: 'order-total' }, `Total: ${total} ud`),
    );

    // Confirm button (admin only, not viewer)
    if (state.me.is_admin && order.status === 'submitted') {
      const confirmBtn = h('button', {
        class: 'btn-small btn-success',
        onclick: async (e) => {
          const btn = e.currentTarget;
          btn.disabled = true;
          try {
            await window.api.confirmOrder(order.id);
            order.status = 'confirmed';
            showToast(t('order_confirmed_ok'));
            renderAdminView();
          } catch (_) {
            btn.disabled = false;
          }
        },
      }, t('btn_confirm_order'));
      card.append(h('div', { class: 'action-row' }, confirmBtn));
    }

    return card;
  }

  // ── Clients tab ──────────────────────────────────────────────────────────────
  function renderAdminClients(container) {
    container.append(h('div', { class: 'section-heading' }, t('clients_title')));

    // Pending first
    const pending = state.adminClients.filter(u => u.is_pending);
    const others  = state.adminClients.filter(u => !u.is_pending);

    if (state.adminClients.length === 0) {
      container.append(h('div', { class: 'empty-state' },
        h('div', { class: 'empty-icon' }, '👥'),
        t('no_clients'),
      ));
      return;
    }

    for (const user of [...pending, ...others]) {
      container.append(renderClientCard(user));
    }
  }

  function renderClientCard(user) {
    const badgeMap = {
      pending:  ['pending_badge',  'badge-pending'],
      approved: ['approved_badge', 'badge-approved'],
      rejected: ['rejected_badge', 'badge-rejected'],
    };
    const statusKey = user.is_pending ? 'pending' : user.is_approved ? 'approved' : 'rejected';
    const [labelKey, cls] = badgeMap[statusKey];

    const nameStr = user.full_name || `@${user.username}` || String(user.telegram_id);
    const sub = user.username ? `@${user.username}` : '';

    const card = h('div', { class: 'card' },
      h('div', { class: 'card-header' },
        h('div', {},
          h('div', { class: 'card-title' }, nameStr),
          sub ? h('div', { class: 'card-subtitle' }, sub) : null,
        ),
        h('span', { class: `badge ${cls}` }, t(labelKey)),
      ),
    );

    const actions = h('div', { class: 'action-row' });

    if (state.me.is_admin) {
      // Approve / Reject
      if (user.is_pending || !user.is_approved) {
        actions.append(h('button', {
          class: 'btn-small btn-success',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              await window.api.approveClient(user.id);
              user.is_approved = 1; user.is_pending = 0;
              showToast('✅');
              renderAdminView();
            } catch (_) { e.currentTarget.disabled = false; }
          },
        }, t('btn_approve_client')));
      }
      if (user.is_pending || user.is_approved) {
        actions.append(h('button', {
          class: 'btn-small btn-danger',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              await window.api.rejectClient(user.id);
              user.is_approved = 0; user.is_pending = 0;
              showToast('❌');
              renderAdminView();
            } catch (_) { e.currentTarget.disabled = false; }
          },
        }, t('btn_reject_client')));
      }

      // Group selector
      const groupSel = h('select', {
        class: 'group-select',
        onchange: async (e) => {
          const gid = e.target.value || null;
          await window.api.setClientGroup(user.id, gid ? Number(gid) : null);
          user.group_id = gid;
        },
      },
        h('option', { value: '' }, t('select_group_placeholder')),
        ...state.adminGroups.map(g =>
          h('option', { value: String(g.id), ...(user.group_id === g.id ? { selected: 'true' } : {}) }, g.name)
        ),
      );
      actions.append(groupSel);

      // Viewer toggle
      const toggleId = `viewer_${user.id}`;
      const toggle = h('div', { class: 'toggle-row' },
        h('span', { class: 'toggle-label' }, t('viewer_label')),
        h('label', { class: 'toggle', for: toggleId },
          h('input', {
            type: 'checkbox',
            id: toggleId,
            ...(user.is_viewer ? { checked: 'true' } : {}),
            onchange: async (e) => {
              await window.api.setClientViewer(user.id, e.target.checked);
              user.is_viewer = e.target.checked ? 1 : 0;
            },
          }),
          h('span', { class: 'toggle-slider' }),
        ),
      );
      card.append(toggle);
    }

    if (actions.children.length) card.append(actions);
    return card;
  }

  // ── Products tab ─────────────────────────────────────────────────────────────
  function renderAdminProducts(container) {
    container.append(h('div', { class: 'section-heading' },
      t('products_title'),
      state.me.is_admin ? h('button', {
        class: 'btn-small btn-info',
        onclick: () => { state.addingProduct = !state.addingProduct; renderAdminView(); },
      }, t('btn_add_product')) : null,
    ));

    if (state.addingProduct && state.me.is_admin) {
      container.append(renderProductForm(null));
    }

    for (const p of state.adminProducts) {
      container.append(renderProductCard(p));
    }
  }

  function renderProductCard(p) {
    const name_es = p.name_es;
    const name_ru = p.name_ru || '—';
    const activeLabel = p.active ? t('product_active') : t('product_inactive');
    const activeCls   = p.active ? 'badge-approved' : 'badge-rejected';

    const card = h('div', { class: 'card' },
      h('div', { class: 'card-header' },
        h('div', {},
          h('div', { class: 'card-title' }, name_es),
          h('div', { class: 'card-subtitle' }, name_ru),
        ),
        h('span', { class: `badge ${activeCls}` }, activeLabel),
      ),
    );

    if (state.me.is_admin) {
      card.append(h('div', { class: 'action-row' },
        h('button', {
          class: 'btn-small btn-neutral',
          onclick: async (e) => {
            e.currentTarget.disabled = true;
            try {
              await window.api.updateProduct(p.id, { active: p.active ? 0 : 1 });
              p.active = p.active ? 0 : 1;
              renderAdminView();
            } catch (_) { e.currentTarget.disabled = false; }
          },
        }, p.active ? '🔴 Desactivar' : '🟢 Activar'),
      ));
    }

    return card;
  }

  function renderProductForm(existing) {
    let name_es = existing?.name_es || '';
    let name_ru = existing?.name_ru || '';

    const esInput = h('input', { type: 'text', value: name_es, placeholder: t('field_name_es'),
      oninput: (e) => { name_es = e.target.value; } });
    const ruInput = h('input', { type: 'text', value: name_ru, placeholder: t('field_name_ru'),
      oninput: (e) => { name_ru = e.target.value; } });

    return h('div', { class: 'card inline-form' },
      h('div', { class: 'form-field' }, h('label', {}, t('field_name_es')), esInput),
      h('div', { class: 'form-field' }, h('label', {}, t('field_name_ru')), ruInput),
      h('div', { class: 'action-row' },
        h('button', {
          class: 'btn-small btn-success',
          onclick: async () => {
            if (!name_es.trim()) return;
            try {
              const p = await window.api.createProduct({ name_es: name_es.trim(), name_ru: name_ru.trim() });
              state.adminProducts.push(p);
              state.addingProduct = false;
              renderAdminView();
            } catch (_) {}
          },
        }, t('btn_save')),
        h('button', {
          class: 'btn-small btn-neutral',
          onclick: () => { state.addingProduct = false; renderAdminView(); },
        }, t('btn_cancel')),
      ),
    );
  }

  // ── Groups tab ───────────────────────────────────────────────────────────────
  function renderAdminGroups(container) {
    container.append(h('div', { class: 'section-heading' },
      t('groups_title'),
      state.me.is_admin ? h('button', {
        class: 'btn-small btn-info',
        onclick: () => { state.addingGroup = !state.addingGroup; renderAdminView(); },
      }, t('btn_add_group')) : null,
    ));

    if (state.addingGroup && state.me.is_admin) {
      container.append(renderGroupForm(null));
    }

    for (const g of state.adminGroups) {
      container.append(renderGroupCard(g));
    }
  }

  function renderGroupCard(g) {
    let days;
    try { days = JSON.parse(g.reminder_days || '[1,2,3,4,5]'); } catch { days = [1,2,3,4,5]; }
    const dayLabels = (window.i18n.translations[state.lang] || window.i18n.translations.es).days_short;
    const dayStr = days.map(d => dayLabels[d - 1]).join(' ');

    const card = h('div', { class: 'card' },
      h('div', { class: 'card-header' },
        h('div', {},
          h('div', { class: 'card-title' }, g.name),
          g.location ? h('div', { class: 'card-subtitle' }, '📍 ' + g.location) : null,
        ),
        h('span', { class: 'badge badge-approved' }, t('clients_in_group', { n: g.client_count || 0 })),
      ),
      h('div', { class: 'card-meta' },
        t('reminder_at', { time: g.reminder_time || '—' }), ' · ', dayStr, ' · ',
        t('deadline_hours', { h: g.order_deadline_hours || 24 }),
      ),
    );

    if (state.me.is_admin) {
      const remBtn = h('button', {
        class: 'btn-small btn-info',
        onclick: async (e) => {
          e.currentTarget.disabled = true;
          try {
            await window.api.sendReminder(g.id);
            showToast(t('reminder_sent_ok'));
          } catch (_) {}
          e.currentTarget.disabled = false;
        },
      }, t('btn_send_reminder'));
      card.append(h('div', { class: 'action-row' }, remBtn));
    }

    return card;
  }

  function renderGroupForm(existing) {
    let name = existing?.name || '';
    let location = existing?.location || '';
    let reminder_time = existing?.reminder_time || '09:00';
    let deadline_hours = existing?.order_deadline_hours || 24;
    let selectedDays = new Set((() => { try { return JSON.parse(existing?.reminder_days || '[1,2,3,4,5]'); } catch { return [1,2,3,4,5]; } })());

    const dayLabels = (window.i18n.translations[state.lang] || window.i18n.translations.es).days_short;

    const dayBtns = [1,2,3,4,5,6,7].map(d => {
      const btn = h('button', {
        class: 'day-btn' + (selectedDays.has(d) ? ' selected' : ''),
        onclick: () => {
          if (selectedDays.has(d)) selectedDays.delete(d); else selectedDays.add(d);
          btn.classList.toggle('selected');
        },
      }, dayLabels[d - 1]);
      return btn;
    });

    const nameInp = h('input', { type: 'text', value: name, placeholder: '—', oninput: (e) => { name = e.target.value; } });
    const locInp  = h('input', { type: 'text', value: location, placeholder: '—', oninput: (e) => { location = e.target.value; } });
    const timeInp = h('input', { type: 'time', value: reminder_time, onchange: (e) => { reminder_time = e.target.value; } });
    const deadInp = h('input', { type: 'number', value: String(deadline_hours), min: '1', max: '168',
      oninput: (e) => { deadline_hours = Number(e.target.value); } });

    return h('div', { class: 'card inline-form' },
      h('div', { class: 'form-row' },
        h('div', { class: 'form-field' }, h('label', {}, 'Nombre del grupo'), nameInp),
        h('div', { class: 'form-field' }, h('label', {}, 'Ubicación'), locInp),
      ),
      h('div', { class: 'form-row' },
        h('div', { class: 'form-field' }, h('label', {}, t('reminder_at', { time: '' })), timeInp),
        h('div', { class: 'form-field' }, h('label', {}, t('deadline_hours', { h: '' })), deadInp),
      ),
      h('div', { class: 'form-field' },
        h('label', {}, 'Días'),
        h('div', { class: 'day-selector' }, ...dayBtns),
      ),
      h('div', { class: 'action-row' },
        h('button', {
          class: 'btn-small btn-success',
          onclick: async () => {
            if (!name.trim()) return;
            try {
              const g = await window.api.createGroup({
                name: name.trim(),
                location: location.trim() || null,
                reminder_time,
                reminder_days: JSON.stringify([...selectedDays].sort()),
                order_deadline_hours: deadline_hours,
              });
              state.adminGroups.push(g);
              state.addingGroup = false;
              renderAdminView();
            } catch (_) {}
          },
        }, t('btn_save')),
        h('button', {
          class: 'btn-small btn-neutral',
          onclick: () => { state.addingGroup = false; renderAdminView(); },
        }, t('btn_cancel')),
      ),
    );
  }

  // ─── Start ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', boot);
})();
