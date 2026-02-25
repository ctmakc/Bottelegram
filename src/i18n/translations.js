'use strict';

const translations = {
  es: {
    // ─── Bot messages ──────────────────────────────────────────────────────────
    select_language: '¡Hola, {name}! 👋\n\nBienvenido/a al sistema de pedidos Mini Melts 🍦\n\nPor favor, elige tu idioma:\nПожалуйста, выберите язык:',
    btn_es: '🇪🇸 Español',
    btn_ru: '🇷🇺 Русский',

    welcome_pending: '✅ ¡Gracias, {name}!\n\nHemos recibido tu solicitud de acceso al sistema de pedidos Mini Melts.\n\nTe notificaremos cuando sea aprobada por nuestro equipo.',
    welcome_approved: '🎉 ¡Tu solicitud ha sido aprobada!\n\nBienvenido/a al sistema de pedidos Mini Melts 🍦\n\nRecibirás recordatorios cuando sea el momento de hacer tu pedido.\n\nHaz clic en el botón de abajo para abrir el panel de pedidos:',
    welcome_rejected: '❌ Lo sentimos, tu solicitud no ha sido aprobada.\n\nSi crees que es un error, contacta con tu representante de Mini Melts.',
    already_approved: '✅ Ya estás registrado/a. Usa el botón de abajo para hacer tu pedido:',
    already_pending: '⏳ Tu solicitud ya está en revisión. Te avisaremos cuando sea aprobada.',

    open_order_btn: '📋 Realizar pedido',
    open_admin_btn: '⚙️ Panel de administración',

    approval_request: '🔔 *Nueva solicitud de registro*\n\nNombre: {name}\nUsername: @{username}\nID de Telegram: `{telegram_id}`\nFecha: {date}',
    btn_approve: '✅ Aprobar',
    btn_reject: '❌ Rechazar',
    approved_answer: '✅ Cliente aprobado. Se ha enviado notificación.',
    rejected_answer: '❌ Cliente rechazado. Se ha enviado notificación.',

    order_received_manager: '📦 *Nuevo pedido recibido*\n\nCliente: *{client}*\nGrupo: {group}\nFecha: {date}\n\n{items}\n\n*Total: {total} ud*',
    order_updated_manager: '✏️ *Pedido actualizado*\n\nCliente: *{client}*\nGrupo: {group}\nFecha: {date}\n\n{items}\n\n*Total: {total} ud*',
    order_cancelled_manager: '❌ *Pedido cancelado*\n\nCliente: *{client}*\nGrupo: {group}\nFecha: {date}',

    reminder_text: '⏰ *Recordatorio de pedido Mini Melts* 🍦\n\nEs hora de realizar tu pedido.\nPlazo de envío: *{deadline}*\n\nHaz clic en el botón para abrir el panel:',
    reminder_btn: '📋 Hacer pedido',

    // ─── Webapp — client view ──────────────────────────────────────────────────
    app_title: 'Mini Melts — Pedidos',
    greeting: 'Hola, {name} 👋',
    deadline_label: '⏰ Plazo:',
    no_deadline: 'Sin plazo definido',
    past_deadline: '⛔ El plazo ha pasado. Ya no puedes editar tu pedido.',
    no_active_order_period: 'No hay un período de pedido activo ahora mismo. Recibirás un recordatorio cuando sea el momento.',

    col_flavor: 'SABOR',
    col_qty: 'CANT.',

    btn_submit: 'Confirmar pedido ✅',
    btn_update: 'Actualizar pedido ✅',
    btn_edit: '✏️ Editar pedido',

    order_success: '¡Pedido enviado con éxito! ✅\nNuestro equipo lo recibirá en breve.',
    order_updated_msg: '¡Pedido actualizado! ✅',
    no_items_error: 'Por favor, introduce al menos una unidad.',
    loading: 'Cargando…',
    error_loading: 'Error al cargar. Inténtalo de nuevo.',
    order_status_submitted: 'Enviado ✅',
    order_status_confirmed: 'Confirmado por el equipo ✅',
    order_status_draft: 'Borrador',

    // ─── Webapp — admin view ───────────────────────────────────────────────────
    admin_panel: 'Panel de Administración',
    tab_orders: 'Pedidos',
    tab_clients: 'Clientes',
    tab_products: 'Productos',
    tab_groups: 'Grupos',

    today_orders: 'Pedidos de hoy — {date}',
    no_orders_today: 'No hay pedidos por el momento.',
    order_from: '{name}',
    order_group: 'Grupo: {group}',
    order_submitted_at: 'Enviado: {time}',
    order_updated_at: 'Actualizado: {time}',
    btn_confirm_order: '✅ Confirmar recepción',
    order_confirmed_ok: 'Confirmado',

    filter_all: 'Todos',
    filter_submitted: 'Pendientes',
    filter_confirmed: 'Confirmados',

    clients_title: 'Clientes',
    pending_badge: 'Pendiente',
    approved_badge: 'Aprobado',
    rejected_badge: 'Rechazado',
    btn_approve_client: '✅ Aprobar',
    btn_reject_client: '❌ Rechazar',
    select_group: '— Asignar grupo —',
    viewer_label: 'Acceso solo lectura',
    no_clients: 'No hay clientes registrados.',

    products_title: 'Productos',
    btn_add_product: '+ Agregar producto',
    product_active: 'Activo',
    product_inactive: 'Inactivo',
    btn_toggle_product: 'Activar/desactivar',
    field_name_es: 'Nombre en español',
    field_name_ru: 'Nombre en ruso',
    btn_save: 'Guardar',
    btn_cancel: 'Cancelar',

    groups_title: 'Grupos de entrega',
    btn_add_group: '+ Agregar grupo',
    clients_in_group: '{n} clientes',
    reminder_at: 'Recordatorio: {time}',
    deadline_hours: 'Plazo: {h}h',
    btn_send_reminder: '📣 Enviar recordatorio ahora',
    reminder_sent_ok: '✅ Recordatorio enviado',

    // ─── Mode toggle ──────────────────────────────────────────────────────────
    btn_to_admin: 'Admin ⚙️',
    btn_to_client: 'Mi pedido 📋',
  },

  ru: {
    // ─── Bot messages ──────────────────────────────────────────────────────────
    select_language: '¡Hola, {name}! 👋\n\nBienvenido/a al sistema de pedidos Mini Melts 🍦\n\nПожалуйста, выберите язык:\nPor favor, elige tu idioma:',
    btn_es: '🇪🇸 Español',
    btn_ru: '🇷🇺 Русский',

    welcome_pending: '✅ Спасибо, {name}!\n\nВаш запрос на доступ к системе заказов Mini Melts получен.\n\nМы уведомим вас, когда он будет одобрен.',
    welcome_approved: '🎉 Ваш запрос одобрен!\n\nДобро пожаловать в систему заказов Mini Melts 🍦\n\nВы будете получать напоминания, когда придёт время делать заказ.\n\nНажмите на кнопку ниже, чтобы открыть панель заказов:',
    welcome_rejected: '❌ К сожалению, ваш запрос не был одобрен.\n\nЕсли вы считаете, что это ошибка, свяжитесь с вашим представителем Mini Melts.',
    already_approved: '✅ Вы уже зарегистрированы. Используйте кнопку ниже для заказа:',
    already_pending: '⏳ Ваш запрос уже на рассмотрении. Мы уведомим вас, когда он будет одобрен.',

    open_order_btn: '📋 Сделать заказ',
    open_admin_btn: '⚙️ Панель администратора',

    approval_request: '🔔 *Новый запрос на регистрацию*\n\nИмя: {name}\nUsername: @{username}\nTelegram ID: `{telegram_id}`\nДата: {date}',
    btn_approve: '✅ Одобрить',
    btn_reject: '❌ Отклонить',
    approved_answer: '✅ Клиент одобрен. Уведомление отправлено.',
    rejected_answer: '❌ Клиент отклонён. Уведомление отправлено.',

    order_received_manager: '📦 *Новый заказ*\n\nКлиент: *{client}*\nГруппа: {group}\nДата: {date}\n\n{items}\n\n*Итого: {total} шт*',
    order_updated_manager: '✏️ *Заказ обновлён*\n\nКлиент: *{client}*\nГруппа: {group}\nДата: {date}\n\n{items}\n\n*Итого: {total} шт*',
    order_cancelled_manager: '❌ *Заказ отменён*\n\nКлиент: *{client}*\nГруппа: {group}\nДата: {date}',

    reminder_text: '⏰ *Напоминание о заказе Mini Melts* 🍦\n\nПришло время сделать заказ.\nСрок подачи: *{deadline}*\n\nНажмите на кнопку для открытия панели:',
    reminder_btn: '📋 Сделать заказ',

    // ─── Webapp — client view ──────────────────────────────────────────────────
    app_title: 'Mini Melts — Заказы',
    greeting: 'Привет, {name} 👋',
    deadline_label: '⏰ Срок:',
    no_deadline: 'Срок не определён',
    past_deadline: '⛔ Срок истёк. Редактирование заказа недоступно.',
    no_active_order_period: 'Сейчас нет активного периода заказов. Вы получите напоминание, когда придёт время.',

    col_flavor: 'ВКУС',
    col_qty: 'КОЛ-ВО',

    btn_submit: 'Подтвердить заказ ✅',
    btn_update: 'Обновить заказ ✅',
    btn_edit: '✏️ Редактировать заказ',

    order_success: 'Заказ успешно отправлен! ✅\nНаша команда получит его в ближайшее время.',
    order_updated_msg: 'Заказ обновлён! ✅',
    no_items_error: 'Пожалуйста, укажите хотя бы одну единицу товара.',
    loading: 'Загрузка…',
    error_loading: 'Ошибка загрузки. Попробуйте снова.',
    order_status_submitted: 'Отправлен ✅',
    order_status_confirmed: 'Подтверждён командой ✅',
    order_status_draft: 'Черновик',

    // ─── Webapp — admin view ───────────────────────────────────────────────────
    admin_panel: 'Панель администратора',
    tab_orders: 'Заказы',
    tab_clients: 'Клиенты',
    tab_products: 'Продукты',
    tab_groups: 'Группы',

    today_orders: 'Заказы на сегодня — {date}',
    no_orders_today: 'Заказов пока нет.',
    order_from: '{name}',
    order_group: 'Группа: {group}',
    order_submitted_at: 'Отправлен: {time}',
    order_updated_at: 'Обновлён: {time}',
    btn_confirm_order: '✅ Подтвердить получение',
    order_confirmed_ok: 'Подтверждён',

    filter_all: 'Все',
    filter_submitted: 'Ожидают',
    filter_confirmed: 'Подтверждены',

    clients_title: 'Клиенты',
    pending_badge: 'Ожидает',
    approved_badge: 'Одобрен',
    rejected_badge: 'Отклонён',
    btn_approve_client: '✅ Одобрить',
    btn_reject_client: '❌ Отклонить',
    select_group: '— Назначить группу —',
    viewer_label: 'Доступ только для чтения',
    no_clients: 'Нет зарегистрированных клиентов.',

    products_title: 'Продукты',
    btn_add_product: '+ Добавить продукт',
    product_active: 'Активен',
    product_inactive: 'Неактивен',
    btn_toggle_product: 'Вкл/Выкл',
    field_name_es: 'Название на испанском',
    field_name_ru: 'Название на русском',
    btn_save: 'Сохранить',
    btn_cancel: 'Отмена',

    groups_title: 'Группы доставки',
    btn_add_group: '+ Добавить группу',
    clients_in_group: '{n} клиентов',
    reminder_at: 'Напоминание: {time}',
    deadline_hours: 'Срок: {h}ч',
    btn_send_reminder: '📣 Отправить напоминание сейчас',
    reminder_sent_ok: '✅ Напоминание отправлено',

    // ─── Mode toggle ──────────────────────────────────────────────────────────
    btn_to_admin: 'Админ ⚙️',
    btn_to_client: 'Мой заказ 📋',
  },
};

/**
 * Translate a key, interpolating {placeholders}.
 * Falls back to 'es' if key not found in the requested language.
 */
function t(lang, key, params = {}) {
  const dict = translations[lang] || translations.es;
  const raw = dict[key] ?? translations.es[key] ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}

module.exports = { translations, t };
