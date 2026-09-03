import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, tx } from '../db/index.js';
import { authenticate, authorize, currentStartup, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { nextCode } from '../services/ids.js';
import { record } from '../services/audit.js';
import { notify, notifyMany } from '../services/notify.js';
import { PILOT_FLOW, assertTransition } from '../services/workflow.js';
import { POLICY } from '../config.js';

const router = Router();

const SELECT = `
  SELECT p.*, c.code AS challenge_code, c.title AS challenge_title, c.sector, c.success_kpis, c.scale_value,
         a.code AS application_code, a.solution_title, a.quoted_pilot_cost,
         s.legal_name, s.brand_name, s.user_id AS founder_user_id, s.women_led, s.state AS startup_state,
         d.name AS dept_name, d.ministry, d.code AS dept_code,
         m.name AS monitor_name
  FROM pilots p
  JOIN challenges c ON c.id = p.challenge_id
  JOIN applications a ON a.id = p.application_id
  JOIN startups s ON s.id = p.startup_id
  JOIN departments d ON d.id = p.dept_id
  LEFT JOIN users m ON m.id = p.monitor_id`;

/* ------------------------------------------------------------------ list */

router.get('/', authenticate, wrap(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === ROLES.STARTUP) {
    const s = currentStartup(req);
    where.push('p.startup_id = ?');
    params.push(s?.id ?? -1);
  } else if (req.user.role === ROLES.PILOT_MONITOR) {
    where.push('(p.monitor_id = ? OR p.dept_id = ?)');
    params.push(req.user.id, req.user.dept_id);
  } else if (req.user.role !== ROLES.ADMIN) {
    where.push('p.dept_id = ?');
    params.push(req.user.dept_id);
  }
  if (req.query.status) { where.push('p.status = ?'); params.push(req.query.status); }

  const rows = all(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.id DESC`, params);
  res.json(rows.map(hydrate).map((p) => ({ ...p, progress: progressOf(p.id) })));
}));

/* ------------------------------------------------------------------ read */

router.get('/:id', authenticate, wrap(async (req, res) => {
  const row = get(`${SELECT} WHERE p.id = ? OR p.code = ?`, [Number(req.params.id) || 0, req.params.id]);
  if (!row) throw httpError(404, 'Pilot not found');
  guardRead(req, row);

  const pilot = hydrate(row);
  pilot.milestones = all('SELECT * FROM milestones WHERE pilot_id = ? ORDER BY seq ASC', [row.id]);
  pilot.kpis = all('SELECT * FROM kpi_readings WHERE pilot_id = ? ORDER BY period ASC, kpi_key ASC', [row.id]);
  pilot.payments = all('SELECT * FROM payments WHERE pilot_id = ? ORDER BY id ASC', [row.id]);
  pilot.progress = progressOf(row.id);
  pilot.scorecard = scorecard(pilot);
  pilot.timeline = all(
    "SELECT action, actor_role, created_at, meta FROM audit_log WHERE entity_type = 'pilots' AND entity_id = ? ORDER BY id ASC",
    [row.id],
  ).map((r) => ({ ...r, meta: safeJson(r.meta, {}) }));
  res.json(pilot);
}));

/* -------------------------------------- create a pilot from a selected app */

const createSchema = z.object({
  applicationId: z.coerce.number().int().positive(),
  title: z.string().min(5),
  scope: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  budgetSanctioned: z.coerce.number().positive(),
  sanctionOrderNo: z.string().optional(),
  monitorId: z.coerce.number().int().positive().optional(),
  ipClause: z.enum(['STARTUP_RETAINS', 'JOINT', 'GOVT_OWNS']).default('STARTUP_RETAINS'),
  sandboxUsers: z.coerce.number().int().min(0).default(0),
  milestones: z.array(z.object({
    title: z.string().min(3),
    description: z.string().optional(),
    dueDate: z.string(),
    payoutPercent: z.coerce.number().min(0).max(100),
  })).min(1, 'Define at least one milestone'),
});

router.post('/', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const d = createSchema.parse(req.body);

  const app = get(
    `SELECT a.*, c.dept_id, c.id AS challenge_id, c.pilot_budget_ceiling, c.success_kpis, c.code AS challenge_code
     FROM applications a JOIN challenges c ON c.id = a.challenge_id WHERE a.id = ?`,
    [d.applicationId],
  );
  if (!app) throw httpError(404, 'Application not found');
  if (req.user.role !== ROLES.ADMIN && app.dept_id !== req.user.dept_id) throw httpError(403, 'Application belongs to another department');
  if (!['SHORTLISTED', 'UNDER_EVALUATION', 'SELECTED_FOR_PILOT'].includes(app.status)) {
    throw httpError(409, 'Only a shortlisted application can be moved to pilot');
  }
  if (get('SELECT id FROM pilots WHERE application_id = ?', [app.id])) throw httpError(409, 'A pilot already exists for this application');
  if (d.budgetSanctioned > app.pilot_budget_ceiling) throw httpError(422, 'Sanctioned budget exceeds the published pilot ceiling');

  const totalPct = d.milestones.reduce((s, m) => s + Number(m.payoutPercent), 0);
  if (Math.round(totalPct) !== 100) throw httpError(422, `Milestone payouts must total 100%, received ${totalPct}%`);

  const pilotId = tx(() => {
    const id = insert('pilots', {
      code: nextCode('pilots'),
      challenge_id: app.challenge_id,
      application_id: app.id,
      startup_id: app.startup_id,
      dept_id: app.dept_id,
      monitor_id: d.monitorId ?? null,
      title: d.title,
      scope: d.scope,
      start_date: d.startDate,
      end_date: d.endDate,
      budget_sanctioned: d.budgetSanctioned,
      sanction_order_no: d.sanctionOrderNo,
      kpi_targets: app.success_kpis,
      ip_clause: d.ipClause,
      sandbox_users: d.sandboxUsers,
      status: 'AGREEMENT_PENDING',
    });

    d.milestones.forEach((m, i) => insert('milestones', {
      pilot_id: id,
      seq: i + 1,
      title: m.title,
      description: m.description,
      due_date: m.dueDate,
      payout_percent: m.payoutPercent,
      payout_amount: Math.round((d.budgetSanctioned * m.payoutPercent) / 100),
    }));

    update('applications', app.id, { status: 'SELECTED_FOR_PILOT' });
    update('challenges', app.challenge_id, { status: 'PILOT' });
    return id;
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'PILOT_CREATED', entityType: 'pilots', entityId: pilotId, meta: { application: app.code, budget: d.budgetSanctioned }, ip: req.ip });

  const founder = get('SELECT user_id FROM startups WHERE id = ?', [app.startup_id]);
  notify(founder?.user_id, 'Pilot sanctioned', `A pilot has been created for ${app.code}. Review and accept the pilot agreement to begin.`, `/app/pilots/${pilotId}`, 'SUCCESS');

  res.status(201).json(hydrate(get(`${SELECT} WHERE p.id = ?`, [pilotId])));
}));

/* ------------------------------------------------------------ transition */

router.post('/:id/transition', authenticate, wrap(async (req, res) => {
  const schema = z.object({
    to: z.string(),
    note: z.string().optional(),
    dpaSigned: z.boolean().optional(),
  });
  const { to, note, dpaSigned } = schema.parse(req.body);
  const row = get(`${SELECT} WHERE p.id = ?`, [Number(req.params.id)]);
  if (!row) throw httpError(404, 'Pilot not found');
  guardWrite(req, row, to);
  assertTransition(PILOT_FLOW, row.status, to, 'pilot');

  // A pilot cannot go live until the DPDP data-processing agreement is on record.
  if (to === 'ACTIVE' && !(row.dpa_signed || dpaSigned)) {
    throw httpError(412, 'The DPDP Act 2023 data processing agreement must be executed before the pilot goes live');
  }

  const patch = { status: to };
  if (dpaSigned) patch.dpa_signed = 1;
  if (['SUCCESS', 'PARTIAL', 'FAILED'].includes(to)) {
    patch.verdict = to;
    patch.verdict_note = note;
    patch.verdict_at = new Date().toISOString();
  }
  update('pilots', row.id, patch);

  record({ actorId: req.user.id, actorRole: req.user.role, action: `PILOT_${to}`, entityType: 'pilots', entityId: row.id, meta: { from: row.status, to, note }, ip: req.ip });

  const msg = {
    ACTIVE: ['Pilot is live', `${row.code} is now active. Milestone 1 evidence is due as scheduled.`, 'SUCCESS'],
    UNDER_REVIEW: ['Pilot under evaluation', `${row.code} has entered the closure review.`, 'INFO'],
    SUCCESS: ['Pilot cleared', `${row.code} met its KPI targets. The department may now proceed to procurement.`, 'SUCCESS'],
    PARTIAL: ['Pilot partially met targets', note || 'Some KPIs were not met. See the pilot scorecard.', 'WARNING'],
    FAILED: ['Pilot did not meet targets', note || 'Structured feedback is on the pilot scorecard. This does not bar future applications.', 'WARNING'],
  }[to];
  if (msg) notify(row.founder_user_id, msg[0], msg[1], `/app/pilots/${row.id}`, msg[2]);

  res.json(hydrate(get(`${SELECT} WHERE p.id = ?`, [row.id])));
}));

/* -------------------------------------------------------------- milestone */

router.post('/:id/milestones/:mid/submit', authenticate, authorize(ROLES.STARTUP), wrap(async (req, res) => {
  const schema = z.object({ evidenceNote: z.string().min(10, 'Describe the evidence being submitted') });
  const { evidenceNote } = schema.parse(req.body);
  const startup = currentStartup(req);
  const pilot = get('SELECT * FROM pilots WHERE id = ? AND startup_id = ?', [Number(req.params.id), startup?.id]);
  if (!pilot) throw httpError(404, 'Pilot not found');
  const ms = get('SELECT * FROM milestones WHERE id = ? AND pilot_id = ?', [Number(req.params.mid), pilot.id]);
  if (!ms) throw httpError(404, 'Milestone not found');
  if (!['PENDING', 'REJECTED'].includes(ms.status)) throw httpError(409, 'Milestone already submitted');

  update('milestones', ms.id, { status: 'SUBMITTED', evidence_note: evidenceNote, submitted_at: new Date().toISOString() });
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'MILESTONE_SUBMITTED', entityType: 'pilots', entityId: pilot.id, meta: { milestone: ms.seq, title: ms.title }, ip: req.ip });

  const reviewers = all("SELECT id FROM users WHERE dept_id = ? AND role IN ('PILOT_MONITOR','NODAL_OFFICER')", [pilot.dept_id]).map((r) => r.id);
  notifyMany(reviewers, 'Milestone evidence submitted', `${pilot.code} - milestone ${ms.seq}: ${ms.title}`, `/app/pilots/${pilot.id}`, 'INFO');
  res.json({ ok: true });
}));

router.post('/:id/milestones/:mid/review', authenticate, authorize(ROLES.PILOT_MONITOR, ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), remarks: z.string().optional() });
  const { decision, remarks } = schema.parse(req.body);
  const pilot = get('SELECT * FROM pilots WHERE id = ?', [Number(req.params.id)]);
  if (!pilot) throw httpError(404, 'Pilot not found');
  if (req.user.role !== ROLES.ADMIN && pilot.dept_id !== req.user.dept_id) throw httpError(403, 'Pilot belongs to another department');

  const ms = get('SELECT * FROM milestones WHERE id = ? AND pilot_id = ?', [Number(req.params.mid), pilot.id]);
  if (!ms) throw httpError(404, 'Milestone not found');
  if (ms.status !== 'SUBMITTED') throw httpError(409, 'Milestone is not awaiting review');

  update('milestones', ms.id, {
    status: decision,
    remarks,
    approved_at: decision === 'APPROVED' ? new Date().toISOString() : null,
    approved_by: req.user.id,
  });

  // Acceptance starts the statutory 45-day payment clock (MSMED Act 2006, s.15).
  if (decision === 'APPROVED') {
    const due = new Date();
    due.setDate(due.getDate() + POLICY.paymentSlaDays);
    insert('payments', {
      pilot_id: pilot.id,
      milestone_id: ms.id,
      invoice_no: `${pilot.code.replace(/\//g, '-')}-M${ms.seq}`,
      amount: ms.payout_amount,
      due_date: due.toISOString().slice(0, 10),
      status: 'DUE',
    });
  }

  record({ actorId: req.user.id, actorRole: req.user.role, action: `MILESTONE_${decision}`, entityType: 'pilots', entityId: pilot.id, meta: { milestone: ms.seq, remarks }, ip: req.ip });

  const founder = get('SELECT user_id FROM startups WHERE id = ?', [pilot.startup_id]);
  notify(
    founder?.user_id,
    decision === 'APPROVED' ? 'Milestone accepted' : 'Milestone returned',
    decision === 'APPROVED'
      ? `Milestone ${ms.seq} accepted. Payment of INR ${Number(ms.payout_amount).toLocaleString('en-IN')} is due within ${POLICY.paymentSlaDays} days.`
      : remarks || 'Please revise and resubmit the evidence.',
    `/app/pilots/${pilot.id}`,
    decision === 'APPROVED' ? 'SUCCESS' : 'WARNING',
  );
  res.json({ ok: true });
}));

/* ------------------------------------------------------------ KPI reading */

router.post('/:id/kpi', authenticate, wrap(async (req, res) => {
  const schema = z.object({
    kpiKey: z.string().min(1),
    kpiLabel: z.string().min(1),
    targetValue: z.coerce.number(),
    actualValue: z.coerce.number(),
    unit: z.string().optional(),
    period: z.string().min(4),
  });
  const d = schema.parse(req.body);
  const pilot = get('SELECT * FROM pilots WHERE id = ?', [Number(req.params.id)]);
  if (!pilot) throw httpError(404, 'Pilot not found');

  const startup = currentStartup(req);
  const allowed = req.user.role === ROLES.ADMIN
    || (startup && pilot.startup_id === startup.id)
    || ([ROLES.PILOT_MONITOR, ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD].includes(req.user.role) && pilot.dept_id === req.user.dept_id);
  if (!allowed) throw httpError(403, 'Not permitted to record readings on this pilot');

  insert('kpi_readings', {
    pilot_id: pilot.id,
    kpi_key: d.kpiKey,
    kpi_label: d.kpiLabel,
    target_value: d.targetValue,
    actual_value: d.actualValue,
    unit: d.unit,
    period: d.period,
    recorded_by: req.user.id,
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'KPI_RECORDED', entityType: 'pilots', entityId: pilot.id, meta: { kpi: d.kpiKey, period: d.period, actual: d.actualValue }, ip: req.ip });
  res.status(201).json({ ok: true });
}));

/* ----------------------------------------------------------------- utils */

function progressOf(pilotId) {
  const rows = all('SELECT status, payout_percent FROM milestones WHERE pilot_id = ?', [pilotId]);
  const done = rows.filter((m) => ['APPROVED', 'PAID'].includes(m.status));
  return {
    milestonesTotal: rows.length,
    milestonesDone: done.length,
    percent: rows.length ? Math.round(done.reduce((s, m) => s + Number(m.payout_percent), 0)) : 0,
  };
}

/** Latest reading per KPI against its target, with an attainment percentage. */
function scorecard(pilot) {
  const targets = safeJson(pilot.kpi_targets, []);
  const readings = all('SELECT * FROM kpi_readings WHERE pilot_id = ? ORDER BY period ASC', [pilot.id]);
  return targets.map((t) => {
    const series = readings.filter((r) => r.kpi_key === t.key);
    const latest = series.at(-1) || null;
    const attainment = latest
      ? t.direction === 'DOWN'
        ? clampPct((Number(t.target) / Math.max(Number(latest.actual_value), 0.0001)) * 100)
        : clampPct((Number(latest.actual_value) / Math.max(Number(t.target), 0.0001)) * 100)
      : 0;
    return {
      key: t.key,
      label: t.label,
      unit: t.unit,
      direction: t.direction || 'UP',
      target: Number(t.target),
      latest: latest ? Number(latest.actual_value) : null,
      period: latest?.period ?? null,
      attainment,
      met: attainment >= 100,
      series: series.map((r) => ({ period: r.period, value: Number(r.actual_value) })),
    };
  });
}

const clampPct = (n) => Math.round(Math.max(0, Math.min(200, n)));

function guardRead(req, row) {
  if (req.user.role === ROLES.ADMIN) return;
  if (req.user.role === ROLES.STARTUP) {
    const s = currentStartup(req);
    if (!s || row.startup_id !== s.id) throw httpError(403, 'Not your pilot');
    return;
  }
  if (row.dept_id !== req.user.dept_id) throw httpError(403, 'Pilot belongs to another department');
}

function guardWrite(req, row, to) {
  if (req.user.role === ROLES.ADMIN) return;
  // The startup side may only accept the agreement (AGREEMENT_PENDING -> ACTIVE).
  if (req.user.role === ROLES.STARTUP) {
    const s = currentStartup(req);
    if (!s || row.startup_id !== s.id) throw httpError(403, 'Not your pilot');
    if (!(row.status === 'AGREEMENT_PENDING' && to === 'ACTIVE')) {
      throw httpError(403, 'A startup may only accept the pilot agreement');
    }
    return;
  }
  if (row.dept_id !== req.user.dept_id) throw httpError(403, 'Pilot belongs to another department');
  if (['SUCCESS', 'PARTIAL', 'FAILED'].includes(to) && ![ROLES.DEPT_HEAD, ROLES.PILOT_MONITOR].includes(req.user.role)) {
    throw httpError(403, 'Only the Pilot Monitor or Department Head can record the closure verdict');
  }
}

export function hydrate(row) {
  if (!row) return row;
  return {
    ...row,
    kpi_targets: safeJson(row.kpi_targets, []),
    success_kpis: safeJson(row.success_kpis, []),
    dpa_signed: !!row.dpa_signed,
  };
}

function safeJson(v, fallback) {
  try { return JSON.parse(v ?? 'null') ?? fallback; } catch { return fallback; }
}

export default router;
