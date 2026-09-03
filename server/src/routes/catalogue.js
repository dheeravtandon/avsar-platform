import { Router } from 'express';
import { z } from 'zod';
import { all, get, insert, update, run } from '../db/index.js';
import { authenticate, authorize, softAuthenticate, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { nextCode } from '../services/ids.js';
import { record } from '../services/audit.js';
import { notify } from '../services/notify.js';

const router = Router();

/**
 * Proven Solutions Registry - the "adopt once, deploy many" surface.
 *
 * A solution reaches this registry only after a pilot with a SUCCESS verdict and
 * a sanctioned procurement. Any other department may then draw it down against
 * the published rate contract without repeating discovery, evaluation or pilot -
 * which is where most of the cycle-time saving in the model comes from.
 */

const SELECT = `
  SELECT ct.*, s.legal_name, s.brand_name, s.dpiit_number, s.women_led, s.state AS startup_state, s.user_id AS founder_user_id,
         d.name AS proven_dept_name, d.ministry AS proven_ministry,
         pr.code AS procurement_code, pr.gfr_rule
  FROM catalogue ct
  JOIN startups s ON s.id = ct.startup_id
  LEFT JOIN departments d ON d.id = ct.proven_dept_id
  LEFT JOIN procurements pr ON pr.id = ct.procurement_id`;

router.get('/', softAuthenticate, wrap(async (req, res) => {
  const where = ["ct.status = 'LISTED'"];
  const params = [];
  if (req.query.category) { where.push('ct.category = ?'); params.push(req.query.category); }
  if (req.query.q) { where.push('(ct.solution_name LIKE ? OR ct.description LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }

  const rows = all(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY ct.adoptions DESC, ct.id DESC`, params);
  res.json(rows.map((r) => ({ ...r, proven_kpi: safeJson(r.proven_kpi, []) })));
}));

router.get('/:id', softAuthenticate, wrap(async (req, res) => {
  const row = get(`${SELECT} WHERE ct.id = ? OR ct.code = ?`, [Number(req.params.id) || 0, req.params.id]);
  if (!row) throw httpError(404, 'Catalogue entry not found');
  row.proven_kpi = safeJson(row.proven_kpi, []);
  row.adoptionList = all(
    `SELECT ad.*, d.name AS dept_name, d.ministry FROM adoptions ad JOIN departments d ON d.id = ad.dept_id
     WHERE ad.catalogue_id = ? ORDER BY ad.id DESC`,
    [row.id],
  );
  res.json(row);
}));

/* -------------------------------------------------- list a proven solution */

const listSchema = z.object({
  procurementId: z.coerce.number().int().positive(),
  solutionName: z.string().min(3),
  category: z.string().min(2),
  description: z.string().min(30),
  unitPrice: z.coerce.number().positive(),
  uom: z.string().default('per unit / year'),
  rateContractValidTill: z.string(),
});

router.post('/', authenticate, authorize(ROLES.PROCUREMENT_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const d = listSchema.parse(req.body);
  const pr = get('SELECT * FROM procurements WHERE id = ?', [d.procurementId]);
  if (!pr) throw httpError(404, 'Procurement not found');
  if (req.user.role !== ROLES.ADMIN && pr.dept_id !== req.user.dept_id) throw httpError(403, 'Belongs to another department');
  if (!['PO_ISSUED', 'ACTIVE', 'COMPLETED'].includes(pr.status)) throw httpError(412, 'Only a live or completed contract can be listed on the registry');
  if (get('SELECT id FROM catalogue WHERE procurement_id = ?', [pr.id])) throw httpError(409, 'Already listed');

  const pilot = pr.pilot_id ? get('SELECT * FROM pilots WHERE id = ?', [pr.pilot_id]) : null;
  const provenKpi = pilot
    ? all('SELECT kpi_key, kpi_label, target_value, actual_value, unit FROM kpi_readings WHERE pilot_id = ? GROUP BY kpi_key HAVING MAX(period)', [pilot.id])
    : [];

  const id = insert('catalogue', {
    code: nextCode('catalogue'),
    procurement_id: pr.id,
    startup_id: pr.startup_id,
    proven_dept_id: pr.dept_id,
    solution_name: d.solutionName,
    category: d.category,
    description: d.description,
    unit_price: d.unitPrice,
    uom: d.uom,
    proven_kpi: JSON.stringify(provenKpi),
    rate_contract_valid_till: d.rateContractValidTill,
    status: 'LISTED',
  });

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'CATALOGUE_LISTED', entityType: 'catalogue', entityId: id, meta: { procurement: pr.code, solution: d.solutionName }, ip: req.ip });
  res.status(201).json(get(`${SELECT} WHERE ct.id = ?`, [id]));
}));

/* ------------------------------------------- another department adopts it */

router.post('/:id/adopt', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.PROCUREMENT_OFFICER, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ quantity: z.coerce.number().int().positive(), note: z.string().optional() });
  const { quantity, note } = schema.parse(req.body);
  const row = get(`${SELECT} WHERE ct.id = ?`, [Number(req.params.id)]);
  if (!row) throw httpError(404, 'Catalogue entry not found');
  if (!req.user.dept_id) throw httpError(400, 'Your account is not mapped to a department');
  if (row.rate_contract_valid_till && new Date(row.rate_contract_valid_till) < new Date()) {
    throw httpError(412, 'The rate contract for this solution has expired');
  }

  const value = Number(row.unit_price) * quantity;
  const id = insert('adoptions', {
    catalogue_id: row.id,
    dept_id: req.user.dept_id,
    requested_by: req.user.id,
    quantity,
    value,
    status: 'REQUESTED',
  });
  run('UPDATE catalogue SET adoptions = adoptions + 1 WHERE id = ?', [row.id]);

  record({ actorId: req.user.id, actorRole: req.user.role, action: 'CATALOGUE_ADOPTED', entityType: 'catalogue', entityId: row.id, meta: { adoptionId: id, quantity, value, note }, ip: req.ip });
  notify(row.founder_user_id, 'New department adoption', `${row.solution_name} has been drawn down by another department against the rate contract (${quantity} units).`, `/app/catalogue/${row.id}`, 'SUCCESS');

  res.status(201).json({ ok: true, adoptionId: id, value, savedSteps: ['Discovery', 'Evaluation', 'Pilot'] });
}));

router.post('/adoptions/:id/transition', authenticate, authorize(ROLES.PROCUREMENT_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const schema = z.object({ to: z.enum(['APPROVED', 'PO_ISSUED', 'DEPLOYED']) });
  const { to } = schema.parse(req.body);
  const ad = get('SELECT * FROM adoptions WHERE id = ?', [Number(req.params.id)]);
  if (!ad) throw httpError(404, 'Adoption not found');
  if (req.user.role !== ROLES.ADMIN && ad.dept_id !== req.user.dept_id) throw httpError(403, 'Belongs to another department');
  update('adoptions', ad.id, { status: to });
  record({ actorId: req.user.id, actorRole: req.user.role, action: `ADOPTION_${to}`, entityType: 'adoptions', entityId: ad.id, ip: req.ip });
  res.json({ ok: true });
}));

/** Parse a JSON text column. Values already parsed upstream pass through. */
function safeJson(v, fallback) {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v) ?? fallback; } catch { return fallback; }
}

export default router;
