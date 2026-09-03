import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { get } from '../db/index.js';

export const ROLES = {
  STARTUP: 'STARTUP',
  NODAL_OFFICER: 'NODAL_OFFICER',
  DEPT_HEAD: 'DEPT_HEAD',
  EVALUATOR: 'EVALUATOR',
  PILOT_MONITOR: 'PILOT_MONITOR',
  PROCUREMENT_OFFICER: 'PROCUREMENT_OFFICER',
  ADMIN: 'ADMIN',
};

export const ROLE_LABELS = {
  STARTUP: 'Startup',
  NODAL_OFFICER: 'Nodal Officer',
  DEPT_HEAD: 'Department Head',
  EVALUATOR: 'Evaluator',
  PILOT_MONITOR: 'Pilot Monitor',
  PROCUREMENT_OFFICER: 'Procurement Officer',
  ADMIN: 'Platform Admin',
};

export function sign(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, deptId: user.dept_id ?? null, name: user.name },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn },
  );
}

export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = get('SELECT * FROM users WHERE id = ? AND status = ?', [payload.sub, 'ACTIVE']);
    if (!user) return res.status(401).json({ error: 'Account not active' });
    delete user.password_hash;
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please sign in again' });
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Role ${ROLE_LABELS[req.user.role] || req.user.role} is not permitted to perform this action` });
    }
    return next();
  };
}

/** Optional auth - used by public endpoints that show a little more when signed in. */
export function softAuthenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = get('SELECT * FROM users WHERE id = ?', [payload.sub]);
    if (user) {
      delete user.password_hash;
      req.user = user;
    }
  } catch { /* anonymous */ }
  return next();
}

/** Resolve the startup profile that belongs to the signed-in startup user. */
export function currentStartup(req) {
  if (req.user?.role !== ROLES.STARTUP) return null;
  return get('SELECT * FROM startups WHERE user_id = ?', [req.user.id]);
}
