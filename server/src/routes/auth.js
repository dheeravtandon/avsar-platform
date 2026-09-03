import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { get, insert, run, tx } from '../db/index.js';
import { sign, authenticate, ROLE_LABELS } from '../middleware/auth.js';
import { wrap, httpError } from '../middleware/error.js';
import { checkEligibility } from '../services/eligibility.js';
import { record } from '../services/audit.js';
import { notify } from '../services/notify.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  legalName: z.string().min(3),
  brandName: z.string().optional(),
  entityType: z.enum(['PRIVATE_LIMITED', 'LLP', 'PARTNERSHIP', 'PROPRIETORSHIP']),
  cin: z.string().optional(),
  dpiitNumber: z.string().min(3, 'DPIIT recognition number is required'),
  dpiitValidTill: z.string().optional(),
  udyamNumber: z.string().optional(),
  gstin: z.string().optional(),
  incorporationDate: z.string().min(4),
  sector: z.string().min(2),
  subSector: z.string().optional(),
  trl: z.coerce.number().int().min(1).max(9),
  capabilities: z.array(z.string()).default([]),
  website: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  employees: z.coerce.number().int().min(0).default(0),
  womenLed: z.boolean().default(false),
  turnoverLastFy: z.coerce.number().min(0).default(0),
  isSplitReconstruction: z.boolean().default(false),
  hasPriorGovtOrder: z.boolean().default(false),
});

router.post('/login', wrap(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = get('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    record({ action: 'LOGIN_FAILED', entityType: 'users', meta: { email }, ip: req.ip });
    throw httpError(401, 'Invalid email or password');
  }
  if (user.status !== 'ACTIVE') throw httpError(403, 'Account is not active. Contact the platform administrator.');

  run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);
  record({ actorId: user.id, actorRole: user.role, action: 'LOGIN', entityType: 'users', entityId: user.id, ip: req.ip });

  delete user.password_hash;
  res.json({ token: sign(user), user: decorate(user) });
}));

router.post('/register/startup', wrap(async (req, res) => {
  const data = registerSchema.parse(req.body);
  if (get('SELECT id FROM users WHERE lower(email) = lower(?)', [data.email])) {
    throw httpError(409, 'An account already exists for this email address');
  }

  const result = tx(() => {
    const userId = insert('users', {
      name: data.name,
      email: data.email,
      phone: data.phone,
      password_hash: bcrypt.hashSync(data.password, 10),
      role: 'STARTUP',
      designation: 'Founder',
    });

    const profile = {
      user_id: userId,
      legal_name: data.legalName,
      brand_name: data.brandName || data.legalName,
      entity_type: data.entityType,
      cin: data.cin,
      dpiit_number: data.dpiitNumber,
      dpiit_valid_till: data.dpiitValidTill,
      udyam_number: data.udyamNumber,
      gstin: data.gstin,
      incorporation_date: data.incorporationDate,
      sector: data.sector,
      sub_sector: data.subSector,
      trl: data.trl,
      capabilities: JSON.stringify(data.capabilities),
      website: data.website,
      city: data.city,
      state: data.state,
      employees: data.employees,
      women_led: data.womenLed ? 1 : 0,
      turnover_last_fy: data.turnoverLastFy,
      is_split_reconstruction: data.isSplitReconstruction ? 1 : 0,
      has_prior_govt_order: data.hasPriorGovtOrder ? 1 : 0,
      kyc_status: data.cin && data.gstin ? 'VERIFIED' : 'PENDING',
      kyc_verified_at: data.cin && data.gstin ? new Date().toISOString() : null,
    };

    const verdict = checkEligibility({ ...profile, kyc_status: profile.kyc_status });
    profile.eligibility_status = verdict.status;
    profile.eligibility_json = JSON.stringify(verdict);
    profile.profile_completeness = completeness(profile);

    const startupId = insert('startups', profile);
    return { userId, startupId, verdict };
  });

  record({
    actorId: result.userId,
    actorRole: 'STARTUP',
    action: 'STARTUP_REGISTERED',
    entityType: 'startups',
    entityId: result.startupId,
    meta: { dpiit: data.dpiitNumber, eligibility: result.verdict.status },
    ip: req.ip,
  });

  notify(
    result.userId,
    result.verdict.eligible ? 'Registration complete - you are eligible to apply' : 'Registration complete - eligibility issues found',
    result.verdict.eligible
      ? 'Your DPIIT recognition has been accepted. Browse open problem statements to submit your first application.'
      : `Blocking issues: ${result.verdict.blockingReasons.join('; ')}`,
    '/app/profile',
    result.verdict.eligible ? 'SUCCESS' : 'WARNING',
  );

  const user = get('SELECT * FROM users WHERE id = ?', [result.userId]);
  delete user.password_hash;
  res.status(201).json({ token: sign(user), user: decorate(user), eligibility: result.verdict });
}));

router.get('/me', authenticate, wrap(async (req, res) => {
  const payload = decorate(req.user);
  if (req.user.role === 'STARTUP') {
    payload.startup = get('SELECT * FROM startups WHERE user_id = ?', [req.user.id]);
  }
  if (req.user.dept_id) {
    payload.department = get('SELECT * FROM departments WHERE id = ?', [req.user.dept_id]);
  }
  res.json(payload);
}));

router.post('/password', authenticate, wrap(async (req, res) => {
  const schema = z.object({ current: z.string().min(1), next: z.string().min(8) });
  const { current, next } = schema.parse(req.body);
  const row = get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
  if (!bcrypt.compareSync(current, row.password_hash)) throw httpError(401, 'Current password is incorrect');
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(next, 10), req.user.id]);
  record({ actorId: req.user.id, actorRole: req.user.role, action: 'PASSWORD_CHANGED', entityType: 'users', entityId: req.user.id, ip: req.ip });
  res.json({ ok: true });
}));

function decorate(user) {
  return { ...user, roleLabel: ROLE_LABELS[user.role] || user.role };
}

function completeness(p) {
  const fields = ['legal_name', 'cin', 'dpiit_number', 'gstin', 'udyam_number', 'sector', 'city', 'state', 'website', 'employees'];
  const filled = fields.filter((f) => p[f] !== undefined && p[f] !== null && p[f] !== '' && p[f] !== 0).length;
  return Math.round((filled / fields.length) * 100);
}

export default router;
