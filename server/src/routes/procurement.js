import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, tx } from '../db/index.js';
import { authenticate, authorize, currentStartup, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { nextCode } from '../services/ids.js';
import { record } from '../services/audit.js';
import { notify } from '../services/notify.js';
import { PROCUREMENT_FLOW, assertTransition } from '../services/workflow.js';
import { POLICY } from '../config.js';

const router = Router();

const SELECT = `
  SELECT pr.*, p.code AS pilot_code, p.verdict AS pilot_verdict, p.budget_sanctioned,
         c.code AS challenge_code, c.title AS challenge_title, c.sector,
         s.legal_name, s.brand_name, s.user_id AS founder_user_id, s.dpiit_number, s.women_led,
         d.name AS dept_name, d.ministry, d.code AS dept_code
  FROM procurements pr
  LEFT JOIN pilots p ON p.id = pr.pilot_id
  LEFT JOIN challenges c ON c.id = pr.challenge_id
  JOIN startups s ON s.id = pr.startup_id
  JOIN departments d ON d.id = pr.dept_id`;

/** Mode of procurement and the rule it rests on. */
export const MODES = {
  SINGLE_SOURCE: {
    label: 'Single source (proven pilot)',
    rule: 'GFR 2017, Rule 166 read with Rule 173(i)',
    note: 'Justified where the pilot has established that only this solution meets the declared KPIs.',
  },
  LIMITED_TENDER: {
    label: 'Limited tender among pilot participants',
    rule: 'GFR 2017, Rule 162',
    note: 'Used where more than one pilot cleared the KPI gate and price discovery is required.',
  },
  GEM_DIRECT: {
    label: 'GeM direct purchase / Startup Runway',
    rule: 'GFR 2017, Rule 149',
    note: 'Solution listed on GeM under the startup category; department places the order on the portal.',
  },
  RATE_CONTRACT: {
    label: 'Rate contract for multi-department adoption',
    rule: 'GFR 2017, Rule 145',
    note: 'Price and terms fixed once, drawn down by any department through the Proven Solutions Registry.',
  },
};

router.get('/modes', authenticate, wrap(async (_req, res) => res.json(MODES)));

/* ------------------------------------------------------------------ list */

router.get('/', authenticate, wrap(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === ROLES.STARTUP) {
    const s = currentStartup(req);
    where.push('pr.startup_id = ?');
    params.push(s?.id ?? -1);
  } else if (req.user.role !== ROLES.ADMIN) {
    where.push('pr.dept_id = ?');
    params.push(req.user.dept_id);
  }
  if (req.query.status) { where.push('pr.status = ?'); params.push(req.query.status); }
  const rows = all(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY pr.id DESC`, params);
  res.json(rows);
}));

router.get('/:id', authenticate, wrap(async (req, res) => {
  const row = get(`${SELECT} WHERE pr.id = ? OR pr.code = ?`, [Number(req.params.id) || 0, req.params.id]);
  if (!row) throw httpError(404, 'Procurement not found');
  if (req.user.role === ROLES.STARTUP) {
    const s = currentStartup(req);
    if (!s || row.startup_id !== s.id) throw httpError(403, 'Not your contract');
  } else if (req.user.role !== ROLES.ADMIN && row.dept_id !== req.user.dept_id) {
    throw httpError(403, 'Belongs to another department');
  }
  row.payments = all('SELECT * FROM payments WHERE procurement_id = ? ORDER BY id', [row.id]);
  row.modeMeta = MODES[row.mode] ?? null;
  res.json(row);
}));

/* -------------------------------------------- raise a procurement proposal */

const createSchema = z.object({
  pilotId: z.coerce.number().int().positive(),
  mode: z.enum(['SINGLE_SOURCE', 'LIMITED_TENDER', 'GEM_DIRECT', 'RATE_CONTRACT']),
  justification: z.string().min(50, 'A written justification is mandatory and is placed on the audit record'),
  contractValue: z.coerce.number().positive(),
  contractStart: z.string(),
  contractEnd: z.string(),
});

router.post('/', authenticate, authorize(ROLES.PROCUREMENT_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const d = createSchema.parse(req.body);
  const pilot = get('SELECT * FROM pilots WHERE id = ?', [d.pilotId]);
  if (!pilot) throw httpError(404, 'Pilot not found');
  if (req.user.role !== ROLES.ADMIN && pilot.dept_id !== req.user.dept_id) throw httpError(403, 'Pilot belongs to another department');
  // Procurement is evidence-gated: a pilot must have cleared its KPIs.
  if (!['SUCCESS', 'PARTIAL'].includes(pilot.verdict || '')) {
    throw httpError(412, 'Procurement can only follow a pilot with a SUCCESS or PARTIAL verdict');
  }
  if (get('SELECT id FROM procurements WHERE pilot_id = ?', [pilot.id])) throw httpError(409, 'A procurement already exists for this pilot');

  const id = insert('procurements', {
    code: nextCode('procurements'),
    pilot_id: pilot.id,
    challenge_id: pilot.challenge_id,
    startup_id: pilot.startup_id,
    dept_id: pilot.dept_id,
    mode: d.mode,
    gfr_rule: MODES[d.mode].rule,
    justification: d.justification,
    contract_value: d.contractValue,
    contract_start: d.contractStart,
    contract_end: d.contractEnd,
    status: 'DRAFT',
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'PROCUREMENT_DRAFTED', entityType: 'procurements', entityId: id, meta: { pilot: pilot.code, mode: d.mode, value: d.contractValue }, ip: req.ip });
  res.status(201).json(get(`${SELECT} WHERE pr.id = ?`, [id]));
}));

/* ------------------------------------------------------------ transition */

router.post('/:id/transition', authenticate, authorize(ROLES.PROCUREMENT_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ to: z.string(), note: z.string().optional(), poNumber: z.string().optional(), gemContractId: z.string().optional() });
  const { to, note, poNumber, gemContractId } = schema.parse(req.body);

  const row = get(`${SELECT} WHERE pr.id = ?`, [Number(req.params.id)]);
  if (!row) throw httpError(404, 'Procurement not found');
  if (req.user.role !== ROLES.ADMIN && row.dept_id !== req.user.dept_id) throw httpError(403, 'Belongs to another department');
  assertTransition(PROCUREMENT_FLOW, row.status, to, 'procurement');

  if (to === 'APPROVED' && ![ROLES.DEPT_HEAD, ROLES.ADMIN].includes(req.user.role)) {
    throw httpError(403, 'Only the Department Head can sanction a procurement');
  }

  const patch = { status: to };
  if (to === 'APPROVED') { patch.approved_by = req.user.id; patch.approved_at = new Date().toISOString(); }
  if (to === 'PO_ISSUED') {
    patch.po_number = poNumber || `PO/${row.dept_code}/${new Date().getFullYear()}/${String(row.id).padStart(4, '0')}`;
    patch.gem_contract_id = gemContractId || null;
  }

  tx(() => {
    update('procurements', row.id, patch);
    if (to === 'PO_ISSUED') {
      const due = new Date();
      due.setDate(due.getDate() + POLICY.paymentSlaDays);
      insert('payments', {
        procurement_id: row.id,
        invoice_no: `${row.code.replace(/\//g, '-')}-INV1`,
        amount: Math.round(row.contract_value * 0.3),
        due_date: due.toISOString().slice(0, 10),
        status: 'DUE',
      });
      if (row.challenge_id) update('challenges', row.challenge_id, { status: 'PROCURED' });
    }
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: `PROCUREMENT_${to}`, entityType: 'procurements', entityId: row.id, meta: { from: row.status, to, note, poNumber: patch.po_number }, ip: req.ip });

  const msg = {
    APPROVED: ['Procurement sanctioned', `${row.code} has been sanctioned by ${row.dept_name}.`, 'SUCCESS'],
    PO_ISSUED: ['Purchase order issued', `${patch.po_number} issued against ${row.code}.`, 'SUCCESS'],
    TERMINATED: ['Contract terminated', note || 'The contract has been terminated.', 'WARNING'],
  }[to];
  if (msg) notify(row.founder_user_id, msg[0], msg[1], `/app/procurement/${row.id}`, msg[2]);

  res.json(get(`${SELECT} WHERE pr.id = ?`, [row.id]));
}));

/* ------------------------------------------------------------- payments */

router.post('/payments/:paymentId/pay', authenticate, authorize(ROLES.PROCUREMENT_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ pfmsRef: z.string().min(3, 'Record the PFMS transaction reference') });
  const { pfmsRef } = schema.parse(req.body);
  const p = get('SELECT * FROM payments WHERE id = ?', [Number(req.params.paymentId)]);
  if (!p) throw httpError(404, 'Payment not found');
  if (p.status === 'PAID') throw httpError(409, 'Already settled');

  update('payments', p.id, { status: 'PAID', paid_on: new Date().toISOString().slice(0, 10), pfms_ref: pfmsRef });
  if (p.milestone_id) update('milestones', p.milestone_id, { status: 'PAID' });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'PAYMENT_RELEASED', entityType: 'payments', entityId: p.id, meta: { amount: p.amount, pfmsRef }, ip: req.ip });
  res.json({ ok: true });
}));

/** Ledger with the statutory 45-day clock evaluated live. */
router.get('/payments/ledger', authenticate, wrap(async (req, res) => {
  const where = [];
  const params = [];
  if (req.user.role === ROLES.STARTUP) {
    const s = currentStartup(req);
    where.push('(pl.startup_id = ? OR pc.startup_id = ?)');
    params.push(s?.id ?? -1, s?.id ?? -1);
  } else if (req.user.role !== ROLES.ADMIN) {
    where.push('(pl.dept_id = ? OR pc.dept_id = ?)');
    params.push(req.user.dept_id, req.user.dept_id);
  }

  const rows = all(
    `SELECT pay.*, pl.code AS pilot_code, pc.code AS procurement_code,
            COALESCE(sl.brand_name, sc.brand_name) AS startup_name,
            COALESCE(dl.name, dc.name) AS dept_name
     FROM payments pay
     LEFT JOIN pilots pl ON pl.id = pay.pilot_id
     LEFT JOIN procurements pc ON pc.id = pay.procurement_id
     LEFT JOIN startups sl ON sl.id = pl.startup_id
     LEFT JOIN startups sc ON sc.id = pc.startup_id
     LEFT JOIN departments dl ON dl.id = pl.dept_id
     LEFT JOIN departments dc ON dc.id = pc.dept_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY pay.due_date ASC`,
    params,
  );

  const today = new Date();
  res.json(rows.map((r) => {
    const due = new Date(r.due_date);
    const overdueDays = r.status === 'PAID' ? 0 : Math.max(0, Math.floor((today - due) / 86400000));
    return { ...r, overdueDays, slaBreached: overdueDays > 0, slaDays: POLICY.paymentSlaDays };
  }));
}));

export default router;
