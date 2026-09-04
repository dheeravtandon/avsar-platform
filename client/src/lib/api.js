/**
 * Single API client.
 *
 * The base path is relative ('/api'), so the same build runs behind the Vite dev
 * proxy, behind nginx in production, or on a sub-path, without any host being
 * compiled into the bundle.
 */

const BASE = import.meta.env.VITE_API_BASE || '/api';
const TOKEN_KEY = 'avsar.token';

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (v) => localStorage.setItem(TOKEN_KEY, v),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || [];
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = token.get();
  if (t) headers.Authorization = `Bearer ${t}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Cannot reach the AVSAR API. Is the server running on port 4000?', 0);
  }

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token.get()) {
      token.clear();
      if (!location.pathname.startsWith('/login')) location.assign('/login?expired=1');
    }
    throw new ApiError(payload.error || `Request failed (${res.status})`, res.status, payload.fields);
  }
  return payload;
}

export const api = {
  get: (p, o) => request(p, o),
  post: (p, body, o) => request(p, { ...o, method: 'POST', body: body ?? {} }),
  put: (p, body, o) => request(p, { ...o, method: 'PUT', body: body ?? {} }),
  del: (p, o) => request(p, { ...o, method: 'DELETE' }),
};

/* Endpoint map - keeps URL strings out of components. */
export const endpoints = {
  meta: () => '/meta',
  health: () => '/health',

  login: () => '/auth/login',
  registerStartup: () => '/auth/register/startup',
  me: () => '/auth/me',

  challenges: (qs = '') => `/challenges${qs}`,
  challenge: (id) => `/challenges/${id}`,
  challengeTransition: (id) => `/challenges/${id}/transition`,
  discover: (id) => `/challenges/${id}/discover`,

  applications: (qs = '') => `/applications${qs}`,
  application: (id) => `/applications/${id}`,
  applicationSubmit: (id) => `/applications/${id}/submit`,
  applicationTransition: (id) => `/applications/${id}/transition`,
  applicationCommittee: (id) => `/applications/${id}/committee`,

  evaluationCriteria: () => '/evaluations/criteria',
  myEvaluations: () => '/evaluations/mine',
  runAutomatedEvaluation: (id) => `/evaluations/${id}/auto-score`,
  submitScore: (id) => `/evaluations/${id}/score`,
  evaluationSummary: (challengeId) => `/evaluations/challenge/${challengeId}/summary`,

  pilots: (qs = '') => `/pilots${qs}`,
  pilot: (id) => `/pilots/${id}`,
  pilotTransition: (id) => `/pilots/${id}/transition`,
  milestoneSubmit: (pid, mid) => `/pilots/${pid}/milestones/${mid}/submit`,
  milestoneReview: (pid, mid) => `/pilots/${pid}/milestones/${mid}/review`,
  kpi: (pid) => `/pilots/${pid}/kpi`,

  procurements: (qs = '') => `/procurement${qs}`,
  procurement: (id) => `/procurement/${id}`,
  procurementTransition: (id) => `/procurement/${id}/transition`,
  procurementModes: () => '/procurement/modes',
  ledger: () => '/procurement/payments/ledger',
  pay: (id) => `/procurement/payments/${id}/pay`,

  catalogue: (qs = '') => `/catalogue${qs}`,
  catalogueItem: (id) => `/catalogue/${id}`,
  adopt: (id) => `/catalogue/${id}/adopt`,

  publicDashboard: () => '/dashboard/public',
  myDashboard: () => '/dashboard/me',

  startups: (qs = '') => `/registry/startups${qs}`,
  startup: (id) => `/registry/startups/${id}`,
  myStartup: () => '/registry/startups/me',
  recheckEligibility: () => '/registry/startups/me/eligibility',
  departments: () => '/registry/departments',
  evaluators: () => '/registry/evaluators',
  monitors: () => '/registry/monitors',

  notifications: () => '/notifications',
  readNotification: (id) => `/notifications/${id}/read`,
  readAllNotifications: () => '/notifications/read-all',

  grievances: () => '/grievances',
  resolveGrievance: (id) => `/grievances/${id}/resolve`,

  audit: (limit = 150) => `/audit?limit=${limit}`,
  auditVerify: () => '/audit/verify',
  adminUsers: () => '/admin/users',
};

export function qs(params) {
  const clean = Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined);
  return clean.length ? `?${new URLSearchParams(clean).toString()}` : '';
}
