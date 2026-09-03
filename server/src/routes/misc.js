import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update } from '../db/index.js';
import { authenticate, authorize, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { nextCode } from '../services/ids.js';
import { record, verifyChain } from '../services/audit.js';
import { listFor, markRead, markAllRead, notifyMany } from '../services/notify.js';
import { POLICY } from '../config.js';

const router = Router();

/* --------------------------------------------------------- notifications */

router.get('/notifications', authenticate, wrap(async (req, res) => {
  const rows = listFor(req.user.id);
  res.json({ items: rows, unread: rows.filter((r) => !r.read_at).length });
}));

router.post('/notifications/:id/read', authenticate, wrap(async (req, res) => {
  markRead(req.user.id, Number(req.params.id));
  res.json({ ok: true });
}));

router.post('/notifications/read-all', authenticate, wrap(async (req, res) => {
  markAllRead(req.user.id);
  res.json({ ok: true });
}));

/* -------------------------------------------------------------- grievances */

const grievanceSchema = z.object({
  category: z.enum(['ELIGIBILITY', 'EVALUATION', 'PAYMENT_DELAY', 'SCOPE', 'OTHER']),
  description: z.string().min(30, 'Describe the grievance in at least 30 characters'),
  entityType: z.string().optional(),
  entityId: z.coerce.number().int().optional(),
});

router.get('/grievances', authenticate, wrap(async (req, res) => {
  const isOfficial = [ROLES.ADMIN, ROLES.DEPT_HEAD, ROLES.NODAL_OFFICER].includes(req.user.role);
  const rows = all(
    `SELECT g.*, u.name AS raised_by_name, u.role AS raised_by_role
     FROM grievances g JOIN users u ON u.id = g.raised_by
     ${isOfficial ? '' : 'WHERE g.raised_by = ?'} ORDER BY g.id DESC`,
    isOfficial ? [] : [req.user.id],
  );
  const today = new Date();
  res.json(rows.map((r) => ({
    ...r,
    overdue: r.status !== 'RESOLVED' && r.sla_due && new Date(r.sla_due) < today,
  })));
}));

router.post('/grievances', authenticate, wrap(async (req, res) => {
  const d = grievanceSchema.parse(req.body);
  const due = new Date();
  due.setDate(due.getDate() + POLICY.grievanceSlaDays);

  const id = insert('grievances', {
    code: nextCode('grievances'),
    raised_by: req.user.id,
    entity_type: d.entityType,
    entity_id: d.entityId,
    category: d.category,
    description: d.description,
    sla_due: due.toISOString().slice(0, 10),
    status: 'OPEN',
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'GRIEVANCE_RAISED', entityType: 'grievances', entityId: id, meta: { category: d.category }, ip: req.ip });
  notifyMany(
    all("SELECT id FROM users WHERE role IN ('ADMIN','DEPT_HEAD')").map((r) => r.id),
    'Grievance raised',
    `${d.category} - resolution due by ${due.toISOString().slice(0, 10)}`,
    '/app/grievances',
    'WARNING',
  );
  res.status(201).json({ ok: true, id, slaDue: due.toISOString().slice(0, 10) });
}));

router.post('/grievances/:id/resolve', authenticate, authorize(ROLES.ADMIN, ROLES.DEPT_HEAD, ROLES.NODAL_OFFICER), wrap(async (req, res) => {
  const schema = z.object({ resolution: z.string().min(20), status: z.enum(['RESOLVED', 'ESCALATED', 'CLOSED']).default('RESOLVED') });
  const d = schema.parse(req.body);
  const g = get('SELECT * FROM grievances WHERE id = ?', [Number(req.params.id)]);
  if (!g) throw httpError(404, 'Grievance not found');
  update('grievances', g.id, { resolution: d.resolution, status: d.status, resolved_at: new Date().toISOString() });
  record({ actorId: req.user.id, actorRole: req.user.role, action: `GRIEVANCE_${d.status}`, entityType: 'grievances', entityId: g.id, ip: req.ip });
  res.json({ ok: true });
}));

/* ------------------------------------------------------------- audit view */

router.get('/audit', authenticate, authorize(ROLES.ADMIN, ROLES.DEPT_HEAD), wrap(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const rows = all(
    `SELECT a.*, u.name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id = a.actor_id
     ORDER BY a.id DESC LIMIT ?`,
    [limit],
  );
  res.json({
    integrity: verifyChain(),
    retentionDays: POLICY ? 180 : 180,
    items: rows.map((r) => ({ ...r, meta: safe(r.meta) })),
  });
}));

router.get('/audit/verify', authenticate, authorize(ROLES.ADMIN, ROLES.DEPT_HEAD), wrap(async (_req, res) => {
  res.json(verifyChain());
}));

/* ---------------------------------------------------------- admin: users */

router.get('/admin/users', authenticate, authorize(ROLES.ADMIN), wrap(async (_req, res) => {
  res.json(all(
    `SELECT u.id, u.name, u.email, u.role, u.designation, u.status, u.last_login_at, d.name AS dept_name
     FROM users u LEFT JOIN departments d ON d.id = u.dept_id ORDER BY u.role, u.name`,
  ));
}));

router.post('/admin/users/:id/status', authenticate, authorize(ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });
  const { status } = schema.parse(req.body);
  update('users', Number(req.params.id), { status });
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'USER_STATUS_CHANGED', entityType: 'users', entityId: Number(req.params.id), meta: { status }, ip: req.ip });
  res.json({ ok: true });
}));

router.post('/admin/startups/:id/kyc', authenticate, authorize(ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ status: z.enum(['VERIFIED', 'REJECTED', 'PENDING']) });
  const { status } = schema.parse(req.body);
  update('startups', Number(req.params.id), { kyc_status: status, kyc_verified_at: status === 'VERIFIED' ? new Date().toISOString() : null });
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'KYC_UPDATED', entityType: 'startups', entityId: Number(req.params.id), meta: { status }, ip: req.ip });
  res.json({ ok: true });
}));

function safe(v) {
  try { return JSON.parse(v ?? '{}'); } catch { return {}; }
}

export default router;
