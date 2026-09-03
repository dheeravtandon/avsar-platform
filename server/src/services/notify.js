import { insert, all, run } from '../db/index.js';

export function notify(userId, title, body, link = null, severity = 'INFO') {
  if (!userId) return;
  insert('notifications', { user_id: userId, title, body, link, severity });
}

export function notifyMany(userIds, title, body, link = null, severity = 'INFO') {
  for (const id of new Set(userIds.filter(Boolean))) notify(id, title, body, link, severity);
}

export function listFor(userId, limit = 30) {
  return all('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ?', [userId, limit]);
}

export function markRead(userId, id) {
  run("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND id = ?", [userId, id]);
}

export function markAllRead(userId) {
  run("UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL", [userId]);
}
