import 'dotenv/config';

const int = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

export const config = {
  // API_PORT wins so a host-injected PORT (used by the web dev server) cannot
  // collide with the API. Falls back to PORT for PaaS deployments.
  port: int(process.env.API_PORT ?? process.env.PORT, 4000),
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'avsar-dev-secret-do-not-use-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  dbFile: process.env.DB_FILE || './data/avsar.db',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  auditRetentionDays: int(process.env.AUDIT_RETENTION_DAYS, 180),
};

/** Policy constants sourced from statute / notification, kept in one place. */
export const POLICY = {
  // DPIIT G.S.R. 127(E) dated 19-Feb-2019 (as amended)
  maxAgeYears: 10,
  maxTurnoverInr: 100_00_00_000, // INR 100 crore
  // GFR 2017 Rule 173(i) - relaxation of prior turnover / prior experience
  gfrRelaxationRule: 'GFR 2017, Rule 173(i)',
  // MSMED Act 2006, s.15 - payment within 45 days of acceptance
  paymentSlaDays: 45,
  // Grievance redressal SLA adopted by the platform
  grievanceSlaDays: 15,
  emdExempt: true,
  tenderFeeExempt: true,
};
