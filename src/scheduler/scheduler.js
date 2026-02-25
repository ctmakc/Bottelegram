'use strict';

const cron = require('node-cron');
const { Markup } = require('telegraf');
const db = require('../db/database');
const { t } = require('../i18n/translations');
const { safeSend } = require('../bot/bot');

/**
 * Build a deadline ISO string for a group.
 * Deadline = now + group.order_deadline_hours.
 */
function buildDeadline(deadlineHours) {
  const d = new Date();
  d.setHours(d.getHours() + (deadlineHours || 24));
  return d.toISOString();
}

/**
 * Format deadline for display.
 * e.g. "25/02 18:00"
 */
function formatDeadline(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  });
}

/**
 * Send a reminder to all approved clients in a group.
 */
async function sendGroupReminder(group) {
  const clients = db.getApprovedUsersInGroup(group.id);
  if (clients.length === 0) return;

  const deadlineIso = buildDeadline(group.order_deadline_hours);
  const deadlineFormatted = formatDeadline(deadlineIso);

  for (const client of clients) {
    const lang = client.language || 'es';
    const text = t(lang, 'reminder_text', { deadline: deadlineFormatted });
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback(t(lang, 'reminder_btn'), 'start_order')],
    ]);
    await safeSend(client.telegram_id, text, keyboard);
    db.logNotification({ user_id: client.id, type: 'reminder' });
  }

  console.log(`[scheduler] Reminder sent to ${clients.length} clients in group "${group.name}"`);
}

/**
 * Check every minute if any group has a scheduled reminder at the current time.
 * reminder_time is stored as "HH:MM" (24h, Europe/Madrid timezone).
 * reminder_days is stored as JSON array of ISO weekdays [1–7] (1=Monday).
 */
function startScheduler() {
  cron.schedule('* * * * *', async () => {
    const now = new Date();
    const madridTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
    const hh = String(madridTime.getHours()).padStart(2, '0');
    const mm = String(madridTime.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;
    // ISO day: 1=Mon … 7=Sun
    const currentDay = madridTime.getDay() === 0 ? 7 : madridTime.getDay();

    const groups = db.getAllGroups();
    for (const group of groups) {
      if (group.reminder_time !== currentTime) continue;

      let days;
      try {
        days = JSON.parse(group.reminder_days || '[1,2,3,4,5]');
      } catch {
        days = [1, 2, 3, 4, 5];
      }

      if (!days.includes(currentDay)) continue;

      await sendGroupReminder(group);
    }
  });

  console.log('[scheduler] Started — checking every minute for scheduled reminders.');
}

module.exports = { startScheduler, sendGroupReminder, buildDeadline, formatDeadline };
