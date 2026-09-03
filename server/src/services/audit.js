import crypto from 'node:crypto';
import { get, insert, all } from '../db/index.js';

/**
 * Append-only, hash-chained audit trail.
 *
 * Each row stores SHA-256(prev_hash + canonical payload). Any tampering with an
 * earlier row breaks every subsequent link, which `verifyChain()` detects. This
 * is what makes the trail defensible in a CAG audit and satisfies the CERT-In
 * direction to retain 180 days of logs within India.
 */

const GENESIS = '0'.repeat(64);

export function record({ actorId = null, actorRole = null, action, entityType = null, entityId = null, meta = {}, ip = null }) {
  const prev = get('SELECT hash FROM audit_log ORDER BY id DESC LIMIT 1');
  const prevHash = prev?.hash || GENESIS;
  const createdAt = new Date().toISOString();
  const payload = JSON.stringify({ actorId, actorRole, action, entityType, entityId, meta, createdAt });
  const hash = crypto.createHash('sha256').update(prevHash + payload).digest('hex');

  insert('audit_log', {
    actor_id: actorId,
    actor_role: actorRole,
    action,
    entity_type: entityType,
    entity_id: entityId,
    meta: JSON.stringify(meta),
    ip,
    prev_hash: prevHash,
    hash,
    created_at: createdAt,
  });
  return hash;
}

export function verifyChain() {
  const rows = all('SELECT * FROM audit_log ORDER BY id ASC');
  let prevHash = GENESIS;
  for (const r of rows) {
    const payload = JSON.stringify({
      actorId: r.actor_id,
      actorRole: r.actor_role,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      meta: JSON.parse(r.meta || '{}'),
      createdAt: r.created_at,
    });
    const expected = crypto.createHash('sha256').update(prevHash + payload).digest('hex');
    if (r.prev_hash !== prevHash || r.hash !== expected) {
      return { intact: false, brokenAt: r.id, total: rows.length };
    }
    prevHash = r.hash;
  }
  return { intact: true, brokenAt: null, total: rows.length, head: prevHash };
}
