/**
 * Mini App translations — mirrors src/i18n/translations.js (webapp keys only).
 * Loaded as a plain <script> tag — exposes window.i18n
 */
(function () {
  'use strict';

  const translations = {
    es: {
      app_title: 'Mini Melts — Pedidos',
      loading: 'Cargando…',
      error_loading: 'Error al cargar. Inténtalo de nuevo.',

      greeting: 'Hola, {name} 👋',
      deadline_label: '⏰ Plazo:',
      no_deadline: 'Sin plazo definido',
      past_deadline: '⛔ El plazo ha pasado. Ya no puedes modificar tu pedido.',
      not_approved: 'Tu cuenta aún no está aprobada. Te avisaremos pronto.',
      not_registered: 'Abre el bot y escribe /start para registrarte.',

      col_flavor: 'SABOR',
      col_qty: 'CANT.',

      btn_submit: 'Confirmar pedido ✅',
      btn_update: 'Actualizar pedido ✅',
      btn_edit: '✏️ Editar pedido',

      order_success: '¡Pedido enviado! ✅\nNuestro equipo lo recibirá en breve.',
      order_updated_msg: '¡Pedido actualizado! ✅',
      no_items_error: 'Introduce al menos una unidad.',

      order_status_submitted: 'Enviado ✅',
      order_status_confirmed: 'Confirmado por el equipo ✅',
      order_status_cancelled: 'Cancelado ❌',
      order_status_draft: 'Borrador',

      btn_cancel_order: '❌ Cancelar pedido',
      cancel_confirm: '¿Seguro que quieres cancelar tu pedido?',
      order_cancelled_msg: 'Pedido cancelado.',
      cancel_deadline_label: '⏱ Cancelación posible hasta:',
      cancel_expired: 'El plazo de cancelación ha pasado.',

      // Admin
      filter_cancelled: 'Cancelados',
      admin_panel: 'Panel de Administración',
      tab_orders: 'Pedidos',
      tab_clients: 'Clientes',
      tab_products: 'Productos',
      tab_groups: 'Grupos',

      today_orders: 'Pedidos — {date}',
      no_orders_today: 'No hay pedidos por el momento.',
      order_group: 'Grupo: {group}',
      order_time: '{time}',
      btn_confirm_order: '✅ Confirmar recepción',
      order_confirmed_ok: 'Confirmado ✅',

      filter_all: 'Todos',
      filter_submitted: 'Pendientes',
      filter_confirmed: 'Confirmados',

      clients_title: 'Clientes',
      pending_badge: 'Pendiente',
      approved_badge: 'Aprobado',
      rejected_badge: 'Rechazado',
      btn_approve_client: 'Aprobar',
      btn_reject_client: 'Rechazar',
      select_group_placeholder: '— Grupo —',
      viewer_label: 'Solo lectura',
      no_clients: 'No hay clientes.',

      products_title: 'Productos',
      btn_add_product: '+ Agregar',
      product_active: 'Activo',
      product_inactive: 'Inactivo',
      field_name_es: 'Nombre (español)',
      field_name_ru: 'Nombre (ruso)',
      btn_save: 'Guardar',
      btn_cancel: 'Cancelar',

      groups_title: 'Grupos de entrega',
      btn_add_group: '+ Agregar grupo',
      clients_in_group: '{n} cliente(s)',
      reminder_at: 'Recordatorio: {time}',
      deadline_hours: 'Plazo: {h} h',
      btn_send_reminder: '📣 Enviar recordatorio',
      reminder_sent_ok: 'Recordatorio enviado ✅',

      btn_to_admin: 'Admin ⚙️',
      btn_to_client: 'Mi pedido 📋',

      days_short: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
      days_full: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'],
    },

    ru: {
      app_title: 'Mini Melts — Заказы',
      loading: 'Загрузка…',
      error_loading: 'Ошибка загрузки. Попробуйте снова.',

      greeting: 'Привет, {name} 👋',
      deadline_label: '⏰ Срок:',
      no_deadline: 'Срок не определён',
      past_deadline: '⛔ Срок истёк. Редактирование недоступно.',
      not_approved: 'Ваш аккаунт ещё не одобрен. Скоро сообщим.',
      not_registered: 'Откройте бота и напишите /start для регистрации.',

      col_flavor: 'ВКУС',
      col_qty: 'КОЛ-ВО',

      btn_submit: 'Подтвердить заказ ✅',
      btn_update: 'Обновить заказ ✅',
      btn_edit: '✏️ Редактировать заказ',

      order_success: 'Заказ отправлен! ✅\nНаша команда получит его в ближайшее время.',
      order_updated_msg: 'Заказ обновлён! ✅',
      no_items_error: 'Укажите хотя бы одну единицу товара.',

      order_status_submitted: 'Отправлен ✅',
      order_status_confirmed: 'Подтверждён командой ✅',
      order_status_cancelled: 'Отменён ❌',
      order_status_draft: 'Черновик',

      btn_cancel_order: '❌ Отменить заказ',
      cancel_confirm: 'Вы уверены, что хотите отменить заказ?',
      order_cancelled_msg: 'Заказ отменён.',
      cancel_deadline_label: '⏱ Отмена возможна до:',
      cancel_expired: 'Время отмены истекло.',

      filter_cancelled: 'Отменённые',

      // Admin
      admin_panel: 'Панель администратора',
      tab_orders: 'Заказы',
      tab_clients: 'Клиенты',
      tab_products: 'Продукты',
      tab_groups: 'Группы',

      today_orders: 'Заказы — {date}',
      no_orders_today: 'Заказов пока нет.',
      order_group: 'Группа: {group}',
      order_time: '{time}',
      btn_confirm_order: '✅ Подтвердить получение',
      order_confirmed_ok: 'Подтверждён ✅',

      filter_all: 'Все',
      filter_submitted: 'Ожидают',
      filter_confirmed: 'Подтверждены',

      clients_title: 'Клиенты',
      pending_badge: 'Ожидает',
      approved_badge: 'Одобрен',
      rejected_badge: 'Отклонён',
      btn_approve_client: 'Одобрить',
      btn_reject_client: 'Отклонить',
      select_group_placeholder: '— Группа —',
      viewer_label: 'Только просмотр',
      no_clients: 'Нет клиентов.',

      products_title: 'Продукты',
      btn_add_product: '+ Добавить',
      product_active: 'Активен',
      product_inactive: 'Неактивен',
      field_name_es: 'Название (испанский)',
      field_name_ru: 'Название (русский)',
      btn_save: 'Сохранить',
      btn_cancel: 'Отмена',

      groups_title: 'Группы доставки',
      btn_add_group: '+ Добавить группу',
      clients_in_group: '{n} клиент(ов)',
      reminder_at: 'Напоминание: {time}',
      deadline_hours: 'Срок: {h} ч',
      btn_send_reminder: '📣 Отправить напоминание',
      reminder_sent_ok: 'Напоминание отправлено ✅',

      btn_to_admin: 'Админ ⚙️',
      btn_to_client: 'Мой заказ 📋',

      days_short: ['П', 'В', 'С', 'Ч', 'П', 'С', 'В'],
      days_full: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
    },
  };

  /**
   * Translate a key with optional parameter interpolation.
   * @param {string} lang
   * @param {string} key
   * @param {Object} [params]
   * @returns {string}
   */
  function t(lang, key, params = {}) {
    const dict = translations[lang] || translations.es;
    const raw = dict[key] ?? translations.es[key] ?? key;
    if (typeof raw !== 'string') return raw;
    return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
  }

  window.i18n = { t, translations };
})();
