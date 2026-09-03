-- AVSAR :: Relational schema (SQLite dialect, PostgreSQL-portable)
-- Doc ref: AVSAR-SDD-005 section 6 (Data Model)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS departments (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  ministry          TEXT NOT NULL,
  level             TEXT NOT NULL DEFAULT 'CENTRAL',      -- CENTRAL | STATE | ULB | PSU
  state             TEXT,
  budget_head       TEXT,
  innovation_budget REAL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  name            TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL,   -- STARTUP|NODAL_OFFICER|DEPT_HEAD|EVALUATOR|PILOT_MONITOR|PROCUREMENT_OFFICER|ADMIN
  designation     TEXT,
  dept_id         INTEGER REFERENCES departments(id),
  expertise       TEXT,            -- JSON array, evaluators only
  status          TEXT NOT NULL DEFAULT 'ACTIVE',
  last_login_at   TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS startups (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id                 INTEGER UNIQUE NOT NULL REFERENCES users(id),
  legal_name              TEXT NOT NULL,
  brand_name              TEXT,
  entity_type             TEXT NOT NULL DEFAULT 'PRIVATE_LIMITED',
  cin                     TEXT,
  dpiit_number            TEXT,
  dpiit_valid_till        TEXT,
  udyam_number            TEXT,
  gstin                   TEXT,
  incorporation_date      TEXT NOT NULL,
  sector                  TEXT NOT NULL,
  sub_sector              TEXT,
  trl                     INTEGER NOT NULL DEFAULT 4,  -- Technology Readiness Level 1-9
  capabilities            TEXT NOT NULL DEFAULT '[]',  -- JSON array of capability tags
  website                 TEXT,
  city                    TEXT,
  state                   TEXT,
  employees               INTEGER DEFAULT 0,
  women_led               INTEGER NOT NULL DEFAULT 0,
  turnover_last_fy        REAL NOT NULL DEFAULT 0,     -- INR
  is_split_reconstruction INTEGER NOT NULL DEFAULT 0,
  has_prior_govt_order    INTEGER NOT NULL DEFAULT 0,
  kyc_status              TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING|VERIFIED|REJECTED
  kyc_verified_at         TEXT,
  eligibility_status      TEXT NOT NULL DEFAULT 'UNKNOWN',  -- ELIGIBLE|INELIGIBLE|UNKNOWN
  eligibility_json        TEXT NOT NULL DEFAULT '{}',
  profile_completeness    INTEGER NOT NULL DEFAULT 0,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenges (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  code                  TEXT UNIQUE NOT NULL,          -- AVS/CH/2026/0001
  dept_id               INTEGER NOT NULL REFERENCES departments(id),
  created_by            INTEGER NOT NULL REFERENCES users(id),
  title                 TEXT NOT NULL,
  problem_statement     TEXT NOT NULL,
  background            TEXT,
  current_baseline      TEXT,
  desired_outcome       TEXT,
  success_kpis          TEXT NOT NULL DEFAULT '[]',    -- JSON [{key,label,target,unit}]
  sector                TEXT NOT NULL,
  tags                  TEXT NOT NULL DEFAULT '[]',
  trl_min               INTEGER NOT NULL DEFAULT 5,
  pilot_budget_ceiling  REAL NOT NULL,
  pilot_duration_months INTEGER NOT NULL DEFAULT 6,
  scale_value           REAL DEFAULT 0,                -- indicative scale-up order value
  scale_units           TEXT,
  deployment_env        TEXT,
  data_availability     TEXT,
  ip_terms              TEXT NOT NULL DEFAULT 'STARTUP_RETAINS',  -- STARTUP_RETAINS|JOINT|GOVT_OWNS
  security_clearance    INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT|PENDING_APPROVAL|PUBLISHED|CLOSED|EVALUATION|PILOT|PROCURED|REJECTED|ARCHIVED
  approved_by           INTEGER REFERENCES users(id),
  approval_note         TEXT,
  published_at          TEXT,
  closes_at             TEXT,
  created_at            TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS applications (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  code                 TEXT UNIQUE NOT NULL,           -- AVS/AP/2026/0001
  challenge_id         INTEGER NOT NULL REFERENCES challenges(id),
  startup_id           INTEGER NOT NULL REFERENCES startups(id),
  solution_title       TEXT NOT NULL,
  solution_summary     TEXT NOT NULL,
  approach             TEXT,
  trl_claimed          INTEGER NOT NULL DEFAULT 5,
  prior_deployments    TEXT,
  team_size            INTEGER DEFAULT 0,
  quoted_pilot_cost    REAL NOT NULL,
  timeline_weeks       INTEGER NOT NULL DEFAULT 12,
  differentiators      TEXT,
  risks                TEXT,
  attachments          TEXT NOT NULL DEFAULT '[]',
  eligibility_snapshot TEXT NOT NULL DEFAULT '{}',
  match_score          REAL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT|SUBMITTED|ELIGIBILITY_FAIL|UNDER_EVALUATION|SHORTLISTED|SELECTED_FOR_PILOT|REJECTED|WITHDRAWN
  submitted_at         TEXT,
  created_at           TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (challenge_id, startup_id)
);

CREATE TABLE IF NOT EXISTS evaluation_criteria (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  description TEXT,
  max_score   INTEGER NOT NULL DEFAULT 10,
  weight      REAL NOT NULL DEFAULT 1,
  bucket      TEXT NOT NULL DEFAULT 'TECHNICAL'         -- TECHNICAL | COMMERCIAL
);

CREATE TABLE IF NOT EXISTS evaluations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id),
  evaluator_id   INTEGER NOT NULL REFERENCES users(id),
  scores         TEXT NOT NULL DEFAULT '{}',            -- JSON {criteriaCode: score}
  total_score    REAL NOT NULL DEFAULT 0,
  remarks        TEXT,
  recommendation TEXT,                                  -- RECOMMEND|RECOMMEND_WITH_CONDITIONS|NOT_RECOMMEND
  coi_declared   INTEGER NOT NULL DEFAULT 0,
  status         TEXT NOT NULL DEFAULT 'ASSIGNED',      -- ASSIGNED|SUBMITTED
  assigned_at    TEXT NOT NULL DEFAULT (datetime('now')),
  submitted_at   TEXT,
  UNIQUE (application_id, evaluator_id)
);

CREATE TABLE IF NOT EXISTS pilots (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  code              TEXT UNIQUE NOT NULL,               -- AVS/PL/2026/0001
  challenge_id      INTEGER NOT NULL REFERENCES challenges(id),
  application_id    INTEGER NOT NULL REFERENCES applications(id),
  startup_id        INTEGER NOT NULL REFERENCES startups(id),
  dept_id           INTEGER NOT NULL REFERENCES departments(id),
  monitor_id        INTEGER REFERENCES users(id),
  title             TEXT NOT NULL,
  scope             TEXT,
  start_date        TEXT,
  end_date          TEXT,
  budget_sanctioned REAL NOT NULL DEFAULT 0,
  sanction_order_no TEXT,
  kpi_targets       TEXT NOT NULL DEFAULT '[]',
  ip_clause         TEXT NOT NULL DEFAULT 'STARTUP_RETAINS',
  dpa_signed        INTEGER NOT NULL DEFAULT 0,         -- DPDP Act 2023 data processing agreement
  sandbox_users     INTEGER DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'AGREEMENT_PENDING', -- AGREEMENT_PENDING|ACTIVE|ON_HOLD|UNDER_REVIEW|SUCCESS|PARTIAL|FAILED|CLOSED
  verdict           TEXT,
  verdict_note      TEXT,
  verdict_at        TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS milestones (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  pilot_id       INTEGER NOT NULL REFERENCES pilots(id),
  seq            INTEGER NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  due_date       TEXT,
  payout_percent REAL NOT NULL DEFAULT 0,
  payout_amount  REAL NOT NULL DEFAULT 0,
  evidence_note  TEXT,
  status         TEXT NOT NULL DEFAULT 'PENDING',       -- PENDING|SUBMITTED|APPROVED|REJECTED|PAID
  submitted_at   TEXT,
  approved_at    TEXT,
  approved_by    INTEGER REFERENCES users(id),
  remarks        TEXT
);

CREATE TABLE IF NOT EXISTS kpi_readings (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pilot_id     INTEGER NOT NULL REFERENCES pilots(id),
  kpi_key      TEXT NOT NULL,
  kpi_label    TEXT NOT NULL,
  target_value REAL NOT NULL,
  actual_value REAL NOT NULL,
  unit         TEXT,
  period       TEXT NOT NULL,
  recorded_by  INTEGER REFERENCES users(id),
  recorded_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS procurements (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  code            TEXT UNIQUE NOT NULL,                 -- AVS/PR/2026/0001
  pilot_id        INTEGER REFERENCES pilots(id),
  challenge_id    INTEGER REFERENCES challenges(id),
  startup_id      INTEGER NOT NULL REFERENCES startups(id),
  dept_id         INTEGER NOT NULL REFERENCES departments(id),
  mode            TEXT NOT NULL,                        -- LIMITED_TENDER|SINGLE_SOURCE|GEM_DIRECT|RATE_CONTRACT
  gfr_rule        TEXT,                                 -- e.g. GFR 2017 R.173(i)
  justification   TEXT,
  contract_value  REAL NOT NULL DEFAULT 0,
  contract_start  TEXT,
  contract_end    TEXT,
  po_number       TEXT,
  gem_contract_id TEXT,
  status          TEXT NOT NULL DEFAULT 'DRAFT',        -- DRAFT|PENDING_APPROVAL|APPROVED|PO_ISSUED|ACTIVE|COMPLETED|TERMINATED
  approved_by     INTEGER REFERENCES users(id),
  approved_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  procurement_id INTEGER REFERENCES procurements(id),
  pilot_id       INTEGER REFERENCES pilots(id),
  milestone_id   INTEGER REFERENCES milestones(id),
  invoice_no     TEXT NOT NULL,
  amount         REAL NOT NULL,
  raised_on      TEXT NOT NULL DEFAULT (date('now')),
  due_date       TEXT NOT NULL,
  paid_on        TEXT,
  pfms_ref       TEXT,
  status         TEXT NOT NULL DEFAULT 'DUE'            -- DUE|PROCESSING|PAID|OVERDUE|DISPUTED
);

CREATE TABLE IF NOT EXISTS catalogue (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  code                     TEXT UNIQUE NOT NULL,        -- AVS/CT/2026/0001
  procurement_id           INTEGER REFERENCES procurements(id),
  startup_id               INTEGER NOT NULL REFERENCES startups(id),
  proven_dept_id           INTEGER REFERENCES departments(id),
  solution_name            TEXT NOT NULL,
  category                 TEXT NOT NULL,
  description              TEXT,
  unit_price               REAL NOT NULL DEFAULT 0,
  uom                      TEXT DEFAULT 'per unit / year',
  proven_kpi               TEXT NOT NULL DEFAULT '[]',
  rate_contract_valid_till TEXT,
  adoptions                INTEGER NOT NULL DEFAULT 0,
  status                   TEXT NOT NULL DEFAULT 'LISTED',  -- LISTED|SUSPENDED|EXPIRED
  created_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS adoptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  catalogue_id INTEGER NOT NULL REFERENCES catalogue(id),
  dept_id      INTEGER NOT NULL REFERENCES departments(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  quantity     INTEGER NOT NULL DEFAULT 1,
  value        REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'REQUESTED',       -- REQUESTED|APPROVED|PO_ISSUED|DEPLOYED
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grievances (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  code        TEXT UNIQUE NOT NULL,
  raised_by   INTEGER NOT NULL REFERENCES users(id),
  entity_type TEXT,
  entity_id   INTEGER,
  category    TEXT NOT NULL,                            -- ELIGIBILITY|EVALUATION|PAYMENT_DELAY|SCOPE|OTHER
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'OPEN',             -- OPEN|UNDER_REVIEW|RESOLVED|ESCALATED|CLOSED
  resolution  TEXT,
  sla_due     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  severity   TEXT NOT NULL DEFAULT 'INFO',
  read_at    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Hash-chained, append-only audit trail (CAG / CERT-In ready)
CREATE TABLE IF NOT EXISTS audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id    INTEGER,
  actor_role  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT,
  entity_id   INTEGER,
  meta        TEXT NOT NULL DEFAULT '{}',
  ip          TEXT,
  prev_hash   TEXT,
  hash        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dept   ON challenges(dept_id);
CREATE INDEX IF NOT EXISTS idx_apps_challenge    ON applications(challenge_id);
CREATE INDEX IF NOT EXISTS idx_apps_startup      ON applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_evals_app         ON evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_pilots_status     ON pilots(status);
CREATE INDEX IF NOT EXISTS idx_milestones_pilot  ON milestones(pilot_id);
CREATE INDEX IF NOT EXISTS idx_kpi_pilot         ON kpi_readings(pilot_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity      ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notif_user        ON notifications(user_id, read_at);
