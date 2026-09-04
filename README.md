# AVSAR — Startup-Friendly Public Procurement Platform

**Document ID** AVSAR-HBK-001 · **Version** 1.0 · **Date** 03 September 2026 · **Status** Living
**Prepared by** TandSol · **Classification** Internal — Smart India Hackathon submission
**Related** AVSAR-CHR-002 · AVSAR-PMP-003 · AVSAR-RTM-004 · AVSAR-SDD-005 · AVSAR-CDR-006 · AVSAR-RSK-007 · AVSAR-TML-008 · AVSAR-DPD-009 · AVSAR-RET-010

---

## 1. What this is

**AVSAR** (अवसर, "opportunity") is a working reference implementation of a startup-friendly public
procurement mechanism: a single platform on which a government department can **identify, pilot,
procure and scale** innovative solutions from eligible startups.

The name is the workflow:

| | Stage | What happens |
|---|---|---|
| **A** | **Assess** | The department publishes an outcome-based problem statement with a baseline, measurable KPIs and a capped pilot budget — not a technical specification. |
| **V** | **Validate** | A statutory eligibility gate runs automatically, then a blind, versioned evidence evaluation produces an explainable score, risk level and recommendation. |
| **S** | **Sandbox** | A funded, time-boxed pilot with milestone-linked payment and monthly KPI readings against the declared targets. |
| **A** | **Adopt** | Procurement is raised only on a pilot with a recorded verdict, under a named General Financial Rules provision, with a written justification on the audit record. |
| **R** | **Ramp-up** | The proven solution is listed on a rate contract; any other department draws it down without repeating discovery, evaluation or pilot. |

## 2. Why it exists

Public procurement in India is designed to buy known things safely. That design actively excludes
young companies, and it excludes them before merit is ever considered:

| The blocker today | What AVSAR does instead |
|---|---|
| A tender specifies the **solution**, so a new approach is non-responsive before it is read. | The department publishes the **outcome** and the KPIs. How the number moves is left to the applicant. |
| **Prior turnover and prior experience** clauses filter out a three-year-old company regardless of merit. | GFR 2017 Rule 173(i) relaxations are applied automatically to every DPIIT-recognised applicant, and the exemption is recorded on the file. |
| There is **no safe budget line** to find out whether something unproven works. | A ring-fenced pilot budget with milestone-linked release, a fixed duration and an exit clause that costs the department nothing if the KPIs are missed. |
| **9–18 months** from need to order; the startup runs out of runway. | Publish, evaluate, pilot and procure inside one tracked file, every stage timestamped on a public dashboard. |
| **Every department starts from zero** and re-tenders what another has already proven. | A Proven Solutions Registry with a rate contract — adopt once, deploy many. |
| **Payment arrives when it arrives** — an inconvenience for an incumbent, an existential event for a startup. | The 45-day clock under MSMED Act s.15 starts on milestone acceptance, runs visibly, and breaches are published. |

**No new statute is required.** Every relaxation applied and every route to award already exists in
the General Financial Rules or in a standing notification. The platform's contribution is to apply
them consistently, automatically, and with a record.

## 3. The workflow in detail

### Stage 1 — Assess *(Nodal Officer → Department Head, 5–10 working days)*

| Step | Detail |
|---|---|
| 1.1 Frame the outcome | What has to change and by how much. A technical specification is explicitly not asked for. |
| 1.2 Declare the baseline | Where the number sits today, measured as it will be during the pilot. Without a baseline a pilot cannot be judged. |
| 1.3 Declare the KPIs | Each with target, unit and direction. These exact numbers, and no others, decide the pilot verdict. |
| 1.4 Set budget ceiling and window | A capped amount and a fixed duration from the department innovation head. |
| 1.5 State the scale-up prize | Indicative value and volume if the pilot works — what makes a small pilot worth a startup's time. |
| 1.6 Head approves and publishes | File number issued; startups in the matching sector are notified. |

**Gate:** cannot publish without at least one measurable KPI and a budget ceiling.
**Artefact:** `AVS/CH/YYYY/NNNN`

### Stage 2 — Validate *(platform gate, then the Evaluation Committee, 15–25 working days)*

| Step | Detail |
|---|---|
| 2.1 Startup applies | Solution, approach, claimed TRL, quoted cost, timeline, differentiators, declared risks. Prior government experience is asked for as information, never as qualification. |
| 2.2 Statutory gate (automatic) | DPIIT recognition and validity, entity age ≤ 10 years, turnover never above ₹100 crore, not formed by reconstruction, eligible entity type. Each check is stored with the rule it comes from. |
| 2.3 Challenge fit gate | Claimed TRL against the floor, quoted cost against the ceiling, timeline against the window. |
| 2.4 Relaxations applied | Prior turnover and experience waived; EMD and tender fee exempted. Applied by default and recorded. |
| 2.5 Evaluator assigned | An authorised evaluator is assigned by the nodal officer and declares conflict of interest before running the evaluation. |
| 2.6 Blind evidence evaluation | The evaluator sees the solution, not the applicant. The versioned engine derives capability, fit, evidence, governance, scalability, readiness, security, financial and risk scores from stored records. |
| 2.7 Confidence and risk controls | Weak evidence reduces claimed capability and fit. Mandatory eligibility, security and KPI gates override mathematical averages. |
| 2.8 Locked explanation | The score, recommendation, reasons, review flags and missing-data limitations are stored and written to the hash-chained audit trail. |

**Gate:** a blocked applicant is told the exact criterion and the exact rule.
**Artefact:** `AVS/AP/YYYY/NNNN` with an itemised gate result

### Stage 3 — Sandbox *(Pilot Monitor with the startup, 3–6 months)*

| Step | Detail |
|---|---|
| 3.1 Sanction order | Budget sanctioned within the published ceiling against the innovation head. |
| 3.2 Pilot agreement | Scope, milestones, payment schedule, IP ownership (startup retains by default), exit clause. |
| 3.3 DPDP agreement | The pilot **cannot** be set live until the data processing agreement is executed — enforced as a hard precondition (HTTP 412), not a checkbox. |
| 3.4 Milestones | Typically four, summing to exactly 100% of the sanctioned amount, with evidence uploaded against each. |
| 3.5 Monthly KPI readings | Actuals recorded against the Stage 1 targets, verified by the monitor. |
| 3.6 Acceptance starts the clock | Payment falls due within 45 days (MSMED Act s.15), visible to both sides. |
| 3.7 Closure verdict | SUCCESS, PARTIAL or FAILED against the declared KPIs, with a written note. |

**Gate:** a failed pilot closes with structured feedback and **no bar on future applications**.
Failing is a permitted outcome — that is what makes it a sandbox.
**Artefact:** `AVS/PL/YYYY/NNNN` with a KPI scorecard

### Stage 4 — Adopt *(Procurement Officer, sanctioned by Department Head, 10–20 working days)*

| Step | Detail |
|---|---|
| 4.1 Evidence gate | A procurement cannot even be drafted unless the linked pilot carries a SUCCESS or PARTIAL verdict. |
| 4.2 Mode under a named rule | Single source (R.166 with R.173(i)), limited tender among pilot participants (R.162), GeM (R.149), or rate contract (R.145). |
| 4.3 Written justification | Mandatory, minimum length enforced, placed on the audit record. |
| 4.4 Head sanctions | Approval reserved to the head; a procurement officer may prepare but not sanction. |
| 4.5 PO and PFMS reference | PO number generated; payments carry a PFMS transaction reference. |

**Gate:** no pilot evidence, no procurement. No named rule, no sanction.
**Artefact:** `AVS/PR/YYYY/NNNN` with the GFR rule on its face

### Stage 5 — Ramp-up *(Procurement Officer, then any department, continuous)*

| Step | Detail |
|---|---|
| 5.1 Listed on the registry | With the measured pilot KPIs attached, so a second department sees evidence rather than a claim. |
| 5.2 Rate contract published | Unit price, unit of measure, validity — typically two years. |
| 5.3 Another department draws down | Records its own quantity and sanction. Discovery, evaluation and pilot are **not** repeated. |
| 5.4 Impact aggregated | Adoptions, value and outcomes roll up to the public transparency board. |

**Gate:** a listing suspends automatically when the rate contract expires.
**Artefact:** `AVS/CT/YYYY/NNNN`

## 4. Roles

| Role | What they do | What they can see |
|---|---|---|
| **Startup** | Registers with DPIIT recognition, applies, runs pilots, raises invoices and grievances. | Own applications, pilots, contracts, payments; public listings. |
| **Nodal Officer** | Drafts problem statements, assigns the committee, shortlists, creates pilots. | Everything in their own department. **Cannot approve their own publication.** |
| **Department Head** | Approves publication, sanctions procurement, records pilot verdicts, reads the audit trail. | Own department, plus approval authority. |
| **Evaluator** | Initiates the automated evidence evaluation after declaring conflict of interest and reviews its explanation. | Only assigned applications, **blind until the result is submitted**. |
| **Pilot Monitor** | Reviews milestone evidence, verifies KPI readings, records the closure verdict. | Pilots in their own department. |
| **Procurement Officer** | Drafts procurement, issues POs, releases payments, lists proven solutions. | Procurement and payments in their own department. |
| **Platform Administrator** | Manages accounts, verifies KYC, verifies audit-chain integrity. | Platform-wide, but **cannot score, approve or sanction** on a department's behalf. |
| *(Public)* | Reads the transparency board, problem statements, registry and proven solutions. | Everything published; nothing in draft. |

## 5. Technology

| Layer | Choice | Why |
|---|---|---|
| **Language** | JavaScript, ES2022 modules, end to end | One language across client and server; no transpile step on the server. |
| **Frontend** | React 18, React Router 6, Vite 5, Recharts | Vite for instant HMR and a 3-second production build. Recharts because the charts are data-bound, not decorative. |
| **Styling** | Hand-written CSS with design tokens — **no UI kit** | A government service should not look like a SaaS template. Every colour, size and space resolves through `tokens.css`, so the whole surface re-themes for a state government without touching a component. |
| **Backend** | Node.js 22+, Express 4, ES modules | Small, boring, well-understood; the routing layer stays readable to a reviewer. |
| **Validation** | Zod, at the edge of every route | Parse-don't-validate: a bad request returns field-level errors the form renders inline. |
| **Database** | SQLite via the built-in **`node:sqlite`** module | **Zero native dependencies.** `npm install` cannot fail on a build toolchain, and there is no separate database server to start before a demo. The schema is portable SQL and moves to PostgreSQL unchanged. |
| **Auth** | JWT (8-hour expiry) + bcrypt | Role-based authorisation enforced **server-side on every route**, never in the client. |
| **Audit** | SHA-256 hash-chained append-only log | Each entry hashes the previous one, so a retrospective edit breaks every subsequent link and is detected by the integrity check. |
| **Testing** | Node's built-in test runner style, 32-assertion E2E suite | Walks the whole lifecycle against a live API on a throwaway database. |

### Numbers a judge may ask for

| Metric | Value |
|---|---|
| Production bundle | 253 kB app + 164 kB React + 384 kB charts (66 / 54 / 105 kB gzipped) |
| CSS | 27 kB (6.3 kB gzipped) — the entire design system |
| Production build time | ~4 seconds |
| Runtime dependencies | 5 server (`express`, `cors`, `jsonwebtoken`, `bcryptjs`, `zod`, plus `dotenv`), 4 client |
| Native/compiled dependencies | **zero** |
| Database tables | 17 |
| API endpoints | 63 |
| React routes | 31 (10 public, 21 authenticated) |
| End-to-end tests | Automated evaluation API test plus 32 workflow assertions, all passing |

## 6. Running it

```bash
npm install
```

```bash
npm run seed
```

```bash
npm run dev
```

The web app is on **http://localhost:5173**, the API on **http://localhost:4000**.

```bash
npm test
```

Every demo account uses the password **`Avsar@2026`**:

| Role | Email |
|---|---|
| Startup — JalSarthi (in contract) | `founder@jalsarthi.in` |
| Startup — SetuRoad (in pilot) | `founder@seturoad.in` |
| Nodal Officer — BWSSB | `nodal.bwssb@avsar.gov.in` |
| Department Head — BWSSB | `head.bwssb@avsar.gov.in` |
| Evaluator — Health informatics | `eval.rehana@avsar.gov.in` |
| Pilot Monitor — Smart Cities | `monitor.scm@avsar.gov.in` |
| Procurement Officer — Smart Cities | `proc.scm@avsar.gov.in` |
| Platform Administrator | `admin@avsar.gov.in` |

Other scripts: `npm run build` (production client), `npm start` (API only),
`npm run dev:server` / `npm run dev:client` (either half alone).

## 7. Repository map

```
avsar/
├─ server/                      Node.js + Express API
│  ├─ src/
│  │  ├─ index.js               App bootstrap, route mounting, health endpoint
│  │  ├─ config.js              Env config + POLICY constants (statutory limits, one place)
│  │  ├─ db/
│  │  │  ├─ schema.sql          17 tables, portable SQL
│  │  │  ├─ index.js            node:sqlite connection, query helpers, transactions
│  │  │  └─ seed.js             Deterministic demo dataset
│  │  ├─ middleware/            auth.js (JWT + RBAC), error.js (Zod → 422, async wrap)
│  │  ├─ services/
│  │  │  ├─ workflow.js         Every legal state transition, declared in one file
│  │  │  ├─ eligibility.js      Statutory gate, each check citing its rule
│  │  │  ├─ matching.js         Explainable weighted discovery score
│  │  │  ├─ evaluationEngine.js supplied deterministic evidence scoring model
│  │  │  ├─ automatedEvaluation.js maps AVSAR records into the evidence model
│  │  │  ├─ scoring.js          legacy 70/30 scores + historical consensus
│  │  │  ├─ audit.js            Hash-chained log + chain verification
│  │  │  ├─ ids.js              AVS/CH/2026/0001 file numbering
│  │  │  └─ notify.js           In-app notifications
│  │  └─ routes/                11 route modules (62 endpoints)
│  └─ test/workflow.test.mjs    32-assertion end-to-end lifecycle suite
├─ client/                      React 18 + Vite
│  └─ src/
│     ├─ styles/                tokens.css · base.css · components.css
│     ├─ lib/                   api.js (endpoint map) · auth.jsx · hooks.js · format.js · status.js
│     ├─ components/            AppShell · PublicShell · ui.jsx · Stepper · Icons · ErrorBoundary
│     └─ pages/                 27 modules over 31 routes
└─ docs/                        Project document set (see below)
```

## 8. Document index and traceability chain

**Charter** *(why)* → **RTM** *(what)* → **SDD** *(how)* → **PMP** *(how we run it)* → **Risk Register** *(what could go wrong)*

| # | Document | File | Doc ID |
|---|---|---|---|
| 1 | Project Handbook | `README.md` | AVSAR-HBK-001 |
| 2 | Project Charter | `docs/AVSAR_Project_Charter_v1.0.docx` | AVSAR-CHR-002 |
| 3 | Project Management Plan | `docs/AVSAR_Project_Management_Plan_v1.0.docx` | AVSAR-PMP-003 |
| 4 | Requirements Traceability Matrix | `docs/AVSAR_RTM_v1.0.xlsx` | AVSAR-RTM-004 |
| 5 | Software Design Document | `docs/AVSAR_Design_Document_v1.0.docx` | AVSAR-SDD-005 |
| 6 | Code Register | `docs/AVSAR_Code_Register_v1.0.xlsx` | AVSAR-CDR-006 |
| 7 | Risk Register | `docs/AVSAR_Risk_Register_v1.0.xlsx` | AVSAR-RSK-007 |
| 8 | Project Timeline | `docs/AVSAR_Project_Timeline_v1.0.xlsx` | AVSAR-TML-008 |
| 9 | DPDP Compliance Tracker | `docs/AVSAR_DPDP_Compliance_Tracker_v1.0.xlsx` | AVSAR-DPD-009 |
| 10 | Data Retention Policy | `docs/AVSAR_Data_Retention_Policy_v1.0.docx` | AVSAR-RET-010 |
| + | **SIH question bank** | `docs/SIH_QA_BRIEF.md` | AVSAR-QAB-011 |

## 9. Statutory basis

| Instrument | Subject | Used for |
|---|---|---|
| DPIIT G.S.R. 127(E), 19-Feb-2019 | Definition of a startup | The five mandatory eligibility checks |
| GFR 2017, Rule 173(i) | Relaxation of prior turnover and prior experience | Applied automatically to every recognised applicant |
| GFR 2017, Rule 170 | Exemption from Earnest Money Deposit | No EMD, no tender fee |
| GFR 2017, Rule 166 | Single tender enquiry | Procurement mode where the pilot showed only one solution meets the KPIs |
| GFR 2017, Rule 162 | Limited tender | Where more than one pilot cleared the gate |
| GFR 2017, Rule 149 | Government e-Marketplace | GeM / Startup Runway route |
| GFR 2017, Rule 145 | Rate contract | The Proven Solutions Registry |
| MSMED Act 2006, s.15 | Payment within 45 days | The payment clock and breach counter |
| DPDP Act 2023 | Digital personal data protection | Pilot activation precondition, purpose limitation, erasure |
| CERT-In Directions 2022 | Incident reporting, log retention | 180-day audit retention in India |
| GIGW 3.0 / WCAG 2.1 AA | Accessibility | Interface conformance target |

## 10. Status and next steps

**Status:** functionally complete reference implementation. All five stages operate end to end;
32 end-to-end assertions pass; production build clean.

| Next | Detail |
|---|---|
| Live identity verification | Replace the KYC stub with MCA (CIN), GSTN (GSTIN) and Udyam registry API checks. |
| Real integrations | GeM listing push, PFMS payment status pull, CPPP publication of procurement notices, ABDM-style consent artefacts where health data is in scope. |
| PostgreSQL | Schema is already portable; swap the driver in `db/index.js` and point `DB_FILE` at a connection string. |
| Authentication | Replace local passwords with NIC single sign-on for officials and DigiLocker / Startup India federation for startups. |
| Accessibility audit | Third-party GIGW 3.0 conformance test and remediation. |
| Security | VAPT per the CERT-In empanelled-auditor route before any live deployment. |
| Bilingual interface | Hindi alongside English; the content layer is already separated from components. |

## 11. Glossary

| Term | Meaning |
|---|---|
| **DPIIT** | Department for Promotion of Industry and Internal Trade — issues startup recognition |
| **GFR** | General Financial Rules 2017 — the rulebook for central government procurement |
| **GeM** | Government e-Marketplace |
| **PFMS** | Public Financial Management System — payment tracking |
| **CPPP** | Central Public Procurement Portal |
| **EMD** | Earnest Money Deposit — bid security, exempt for recognised startups |
| **TRL** | Technology Readiness Level, 1–9 |
| **KPI** | Key Performance Indicator — the declared, measurable success criteria |
| **DPDP** | Digital Personal Data Protection Act 2023 |
| **CERT-In** | Indian Computer Emergency Response Team |
| **GIGW** | Guidelines for Indian Government Websites |
| **MSMED** | Micro, Small and Medium Enterprises Development Act 2006 |
| **Problem statement** | An outcome-based requirement published by a department (not a tender specification) |
| **Proven Solutions Registry** | The catalogue of solutions that cleared a pilot and are on a rate contract |

---

*AVSAR is a demonstration platform built for Smart India Hackathon. All data in the seeded database
is synthetic; no real government record is involved.*
