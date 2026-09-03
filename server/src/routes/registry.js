import { Router } from 'express';
import { z } from 'zod';
import { all, get, update } from '../db/index.js';
import { authenticate, authorize, softAuthenticate, currentStartup, ROLES } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { checkEligibility } from '../services/eligibility.js';
import { record } from '../services/audit.js';

const router = Router();

/** Public-facing startup registry: the department's discovery surface. */
router.get('/startups', softAuthenticate, wrap(async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.sector) { where.push('s.sector = ?'); params.push(req.query.sector); }
  if (req.query.state) { where.push('s.state = ?'); params.push(req.query.state); }
  if (req.query.eligible === '1') where.push("s.eligibility_status = 'ELIGIBLE'");
  if (req.query.womenLed === '1') where.push('s.women_led = 1');
  if (req.query.minTrl) { where.push('s.trl >= ?'); params.push(Number(req.query.minTrl)); }
  if (req.query.q) {
    where.push('(s.legal_name LIKE ? OR s.brand_name LIKE ? OR s.capabilities LIKE ?)');
    params.push(`%${req.query.q}%`, `%${req.query.q}%`, `%${req.query.q}%`);
  }

  const rows = all(
    `SELECT s.id, s.legal_name, s.brand_name, s.sector, s.sub_sector, s.trl, s.city, s.state,
            s.employees, s.women_led, s.capabilities, s.dpiit_number, s.eligibility_status,
            s.has_prior_govt_order, s.incorporation_date, s.website,
            (SELECT COUNT(*) FROM pilots p WHERE p.startup_id = s.id) AS pilot_count,
            (SELECT COUNT(*) FROM procurements pr WHERE pr.startup_id = s.id) AS contract_count
     FROM startups s ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY contract_count DESC, pilot_count DESC, s.id DESC`,
    params,
  );

  res.json(rows.map((r) => ({ ...r, capabilities: safeJson(r.capabilities, []), women_led: !!r.women_led })));
}));

router.get('/startups/:id', softAuthenticate, wrap(async (req, res) => {
  const s = get('SELECT * FROM startups WHERE id = ?', [Number(req.params.id)]);
  if (!s) throw httpError(404, 'Startup not found');

  const profile = {
    ...s,
    capabilities: safeJson(s.capabilities, []),
    eligibility_json: safeJson(s.eligibility_json, {}),
    women_led: !!s.women_led,
  };
  // Financial and identity fields are for signed-in officials only.
  if (!req.user || req.user.role === ROLES.STARTUP) {
    delete profile.turnover_last_fy;
    delete profile.gstin;
    delete profile.cin;
  }
  profile.track = {
    pilots: all('SELECT code, title, status, verdict, start_date, end_date FROM pilots WHERE startup_id = ? ORDER BY id DESC', [s.id]),
    contracts: all("SELECT code, mode, contract_value, status FROM procurements WHERE startup_id = ? AND status IN ('PO_ISSUED','ACTIVE','COMPLETED')", [s.id]),
    listings: all("SELECT code, solution_name, adoptions FROM catalogue WHERE startup_id = ? AND status = 'LISTED'", [s.id]),
  };
  res.json(profile);
}));

/* ------------------------------------------------- startup edits own profile */

const profileSchema = z.object({
  brandName: z.string().optional(),
  cin: z.string().optional(),
  gstin: z.string().optional(),
  udyamNumber: z.string().optional(),
  dpiitNumber: z.string().optional(),
  dpiitValidTill: z.string().optional(),
  sector: z.string().min(2),
  subSector: z.string().optional(),
  trl: z.coerce.number().int().min(1).max(9),
  capabilities: z.array(z.string()).default([]),
  website: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  employees: z.coerce.number().int().min(0),
  womenLed: z.boolean(),
  turnoverLastFy: z.coerce.number().min(0),
  hasPriorGovtOrder: z.boolean(),
});

router.put('/startups/me', authenticate, authorize(ROLES.STARTUP), wrap(async (req, res) => {
  const d = profileSchema.parse(req.body);
  const s = currentStartup(req);
  if (!s) throw httpError(404, 'Startup profile not found');

  const patch = {
    brand_name: d.brandName,
    cin: d.cin,
    gstin: d.gstin,
    udyam_number: d.udyamNumber,
    dpiit_number: d.dpiitNumber ?? s.dpiit_number,
    dpiit_valid_till: d.dpiitValidTill,
    sector: d.sector,
    sub_sector: d.subSector,
    trl: d.trl,
    capabilities: JSON.stringify(d.capabilities),
    website: d.website,
    city: d.city,
    state: d.state,
    employees: d.employees,
    women_led: d.womenLed ? 1 : 0,
    turnover_last_fy: d.turnoverLastFy,
    has_prior_govt_order: d.hasPriorGovtOrder ? 1 : 0,
  };

  const verdict = checkEligibility({ ...s, ...patch, women_led: patch.women_led });
  patch.eligibility_status = verdict.status;
  patch.eligibility_json = JSON.stringify(verdict);
  patch.kyc_status = patch.cin && patch.gstin ? 'VERIFIED' : s.kyc_status;

  update('startups', s.id, patch);
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'STARTUP_PROFILE_UPDATED', entityType: 'startups', entityId: s.id, meta: { eligibility: verdict.status }, ip: req.ip });
  res.json({ ok: true, eligibility: verdict });
}));

/** Re-run the statutory gate on demand - shown as "Check my eligibility". */
router.post('/startups/me/eligibility', authenticate, authorize(ROLES.STARTUP), wrap(async (req, res) => {
  const s = currentStartup(req);
  if (!s) throw httpError(404, 'Startup profile not found');
  const verdict = checkEligibility(s);
  update('startups', s.id, { eligibility_status: verdict.status, eligibility_json: JSON.stringify(verdict) });
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'ELIGIBILITY_RECHECKED', entityType: 'startups', entityId: s.id, meta: { status: verdict.status }, ip: req.ip });
  res.json(verdict);
}));

/* --------------------------------------------------------- departments */

router.get('/departments', softAuthenticate, wrap(async (_req, res) => {
  res.json(all(
    `SELECT d.*, (SELECT COUNT(*) FROM challenges c WHERE c.dept_id = d.id AND c.status <> 'DRAFT') AS challenge_count
     FROM departments d WHERE d.status = 'ACTIVE' ORDER BY d.name`,
  ));
}));

/** Evaluator pool a nodal officer picks a committee from. */
router.get('/evaluators', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  const rows = all(
    `SELECT u.id, u.name, u.designation, u.expertise, d.name AS dept_name,
            (SELECT COUNT(*) FROM evaluations e WHERE e.evaluator_id = u.id AND e.status = 'ASSIGNED') AS open_load
     FROM users u LEFT JOIN departments d ON d.id = u.dept_id
     WHERE u.role = 'EVALUATOR' AND u.status = 'ACTIVE' ORDER BY open_load ASC, u.name`,
  );
  res.json(rows.map((r) => ({ ...r, expertise: safeJson(r.expertise, []) })));
}));

router.get('/monitors', authenticate, authorize(ROLES.NODAL_OFFICER, ROLES.DEPT_HEAD, ROLES.ADMIN), wrap(async (req, res) => {
  res.json(all(
    "SELECT id, name, designation FROM users WHERE role = 'PILOT_MONITOR' AND status = 'ACTIVE' AND (dept_id = ? OR ? = 1) ORDER BY name",
    [req.user.dept_id ?? -1, req.user.role === ROLES.ADMIN ? 1 : 0],
  ));
}));

function safeJson(v, fallback) {
  try { return JSON.parse(v ?? 'null') ?? fallback; } catch { return fallback; }
}

export default router;
