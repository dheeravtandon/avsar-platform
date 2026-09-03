# AVSAR — Smart India Hackathon Question Bank

**Document ID** AVSAR-QAB-011 · **Version** 1.0 · **Date** 03 September 2026 · **Status** Living
**Prepared by** TandSol · **Classification** Internal — team preparation
**Related** AVSAR-HBK-001 (README) · AVSAR-SDD-005 (Design) · AVSAR-RTM-004 (RTM)

Everything a judge is likely to ask, with the answer and where in the code it lives.
Read section 1 before you present; it is the part you must be able to say without notes.

---

## 1. The 60-second pitch

> Government departments cannot buy from startups — not because anyone objects, but because the
> process filters them out before merit is considered. A tender specifies the solution, so a new
> approach is non-responsive. Prior turnover and experience clauses exclude a three-year-old company
> automatically. And there is no safe budget line to find out whether something unproven works.
>
> AVSAR is the mechanism that fixes that, and it needs no new law. A department publishes an
> **outcome** — the number it needs to move, its baseline, and the KPIs — instead of a specification.
> Recognised startups apply through a **statutory eligibility gate** that applies the GFR relaxations
> automatically and tells a blocked applicant the exact rule. The strongest are funded to run a
> **short, measured pilot**. Only what clears its declared KPIs gets **procured** — under a named GFR
> rule with a written justification on the audit record. And then it goes on a **rate contract**, so
> the next department buys the proven thing without repeating discovery, evaluation or pilot.
>
> Assess, Validate, Sandbox, Adopt, Ramp-up. **A-V-S-A-R** — the Hindi word for opportunity.

**If you say one more sentence, say this:**
> The whole thing is built on rules that already exist. We did not invent a procurement route;
> we made the existing ones apply consistently and leave a record.

---

## 2. The problem and the model

**Q. Why can't a startup just bid on a normal tender today?**
Three reasons, in order of how often they bite. (1) The technical specification is written from what
the market already sells, so a genuinely different approach is non-responsive before it is read.
(2) Bid qualification asks for prior turnover and prior experience of similar supply — a three-year-old
company has neither. (3) EMD and tender fees make applying cost money before any revenue is possible.

**Q. Aren't GFR relaxations for startups already available?**
Yes — GFR 2017 Rule 173(i) waives prior turnover and prior experience, and Rule 170 exempts EMD.
The gap is not the rule; it is that the relaxation must be claimed, is applied inconsistently, and
leaves no standard record. AVSAR applies them **by default to every recognised applicant** and stores
the exemption on the application file with the rule cited. See
[`server/src/services/eligibility.js`](../server/src/services/eligibility.js) → `relaxations()`.

**Q. What is genuinely new here, then?**
The **pilot as a procurement stage with legal standing**. Today a department either buys something or
does not. AVSAR inserts a funded, capped, KPI-measured sandbox between "we think this might work" and
"we are committing budget", and makes the pilot verdict the **precondition** for procurement — the
platform refuses to draft a procurement against a pilot with no verdict (HTTP 412). Second: the
**Proven Solutions Registry**, which stops the country paying for the same lesson twice.

**Q. What if the pilot fails?**
It closes with a structured verdict and feedback, and places **no bar on future applications**. That
is deliberate and it is the whole point of a sandbox — if failing is punished, departments stop
running pilots and go back to buying only what is already proven elsewhere. The transparency board
publishes the failure count on purpose.

**Q. Isn't a single-source award after a pilot just favouritism with extra steps?**
That is the right question to ask, and it is why four things are enforced. The problem statement is
public before anyone applies. Eligibility is decided by statute, not opinion. Scoring is blind first,
against a rubric published in advance, with a mandatory conflict-of-interest declaration and a locked
score. And the procurement carries a **written justification** and a **named GFR rule** on its face —
`GFR 2017, Rule 166 read with Rule 173(i)` — which is exactly the document an auditor reads first.
Where more than one pilot clears the gate, the mode is a limited tender among pilot participants
(Rule 162), not single source.

**Q. How is this different from iDEX or the GeM Startup Runway?**
They solve adjacent pieces well: iDEX funds defence innovation challenges, GeM lists startup products
for direct purchase. Neither carries a department from *outcome definition* through *evidence-gated
procurement* to *cross-department reuse* on one file number with one audit trail. AVSAR is designed to
sit **alongside** them — the procurement mode enum includes `GEM_DIRECT` (GFR R.149) precisely so a
cleared pilot can be ordered on GeM.

**Q. Who pays for the pilots?**
The department's own innovation budget head. Every seeded department carries an `innovation_budget`
and a `budget_head` (for example `2217-00-191`), and the sanctioned amount is validated against the
published ceiling before a pilot can be created.

---

## 3. Technology — the questions that get asked most

**Q. What language is it written in?**
**JavaScript throughout** — ES2022 modules on both sides. JSX on the client. No TypeScript, no
transpile step on the server: `node src/index.js` runs the source directly.

**Q. What is the full stack?**

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 18.3 |
| Routing | React Router | 6.28 |
| Build tool | Vite | 5.4 |
| Charts | Recharts | 2.13 |
| Styling | Hand-written CSS with custom properties | — no UI kit |
| Backend runtime | Node.js | 22+ (developed on 24.18) |
| Web framework | Express | 4.21 |
| Validation | Zod | 3.24 |
| Database | SQLite via built-in `node:sqlite` | — |
| Auth | `jsonwebtoken` + `bcryptjs` | 9.0 / 2.4 |
| Config | `dotenv` | 16.4 |

**Q. Why SQLite and not PostgreSQL / MongoDB?**
Three reasons, and give them in this order.
1. **Zero native dependencies.** We use Node's *built-in* `node:sqlite` module, not `better-sqlite3`.
   Nothing compiles at install time, so `npm install` cannot fail on a build toolchain, and there is
   no database server to start before a demo.
2. **The data is relational and the integrity matters.** A procurement references a pilot references
   an application references a challenge. Foreign keys, transactions and `UNIQUE` constraints are
   doing real work here — a document store would push that into application code.
3. **It is not a lock-in.** The schema is portable SQL. Moving to PostgreSQL means swapping the driver
   in `db/index.js` and pointing `DB_FILE` at a connection string; no query rewriting.

**Q. Why no Tailwind / Material UI / Bootstrap?**
A government service should not look like a SaaS template, and a design system you did not write is a
design system you cannot defend. Everything resolves through `client/src/styles/tokens.css` — colour,
type scale, spacing, radius, elevation. The consequence is that the entire visual layer of the
platform is **27 kB of CSS (6.3 kB gzipped)** and re-themes for a state government by editing one file.

**Q. How big is the bundle?**
253 kB app + 164 kB React + 384 kB charts, i.e. 66 / 54 / 105 kB gzipped, split into three chunks so
charts do not block first paint. Production build takes about 4 seconds.

**Q. How many endpoints / tables / routes?**
46 API endpoints across 11 route modules, 16 database tables, 24 React routes (8 public, 16 authenticated).

**Q. Walk me through a request.**
1. A React route calls the typed endpoint map in `lib/api.js` — no URL strings live in components.
2. `fetch` attaches the JWT; a 401 clears the token and returns the user to sign-in.
3. Express `authenticate` verifies the token **and reloads the user from the database**, so a
   suspended account fails immediately rather than at token expiry.
4. `authorize(...roles)` runs before the handler.
5. Zod parses and coerces the body; a failure returns HTTP 422 with field-level errors the form
   renders inline next to the input.
6. The workflow engine asserts the state transition is legal (HTTP 409 if not) **before** any write.
7. The write happens, then an audit entry is chained onto the previous hash.

**Q. How is authorisation enforced?**
Server-side on every route, via `authorize(...roles)` in
[`server/src/middleware/auth.js`](../server/src/middleware/auth.js), plus row-level ownership checks
inside each handler (`guardRead`, `guardWrite`, `mustOwn`). The client navigation only hides what the
server would refuse anyway — **hiding a button is not a security control, and we do not treat it as one.**

**Q. Show me something you are proud of technically.**
The **hash-chained audit trail** ([`services/audit.js`](../server/src/services/audit.js)). Every entry
stores `SHA-256(previous_hash + canonical_payload)`. A conventional log table can be edited by anyone
with database access and the edit leaves no trace. Here, editing any historical row invalidates every
subsequent hash, and `verifyChain()` walks the whole chain and reports the first entry where
verification fails. The Administration screen exposes it as a one-click check, and the E2E suite
asserts the chain is intact after the full lifecycle runs.

**Q. Is there any AI/ML in this?**
Deliberately not in the decision path, and be ready to defend that. The discovery match engine
([`services/matching.js`](../server/src/services/matching.js)) is a **transparent weighted model** —
sector 30, capability overlap 30, readiness 20, track record 10, geography 10 — and it returns a
human-readable reason for **every point awarded**. A department must be able to justify a shortlist in
an audit; an embedding similarity score cannot be justified to the Comptroller and Auditor General.
The natural place for ML is duplicate-application detection and anomaly flagging on scoring patterns,
which is on the roadmap and stays advisory.

---

## 4. Security, privacy and compliance

**Q. How are passwords stored?**
bcrypt with a per-password salt (cost 10 in the application, 8 in the seed for speed). The hash is
deleted from every user object before it leaves the server.

**Q. What about SQL injection?**
Every query uses parameterised statements through the helpers in `db/index.js`. There is no string
concatenation of user input into SQL anywhere — filter clauses build a `?` placeholder list and push
values into a params array.

**Q. XSS? CSRF?**
React escapes by default and the codebase uses no `dangerouslySetInnerHTML`. The API is stateless and
token-authenticated with the JWT sent in an `Authorization` header, not a cookie — so there is no
ambient credential for a CSRF attack to ride on.

**Q. How does DPDP Act 2023 compliance work in practice?**
It is enforced, not documented. A pilot **cannot** transition to ACTIVE until the data processing
agreement is recorded — the API returns HTTP 412 and the E2E suite asserts it. Beyond that: purpose
limitation is bounded by the pilot scope, personal data of the applicant is collected only for
procurement participation, and the retention policy (AVSAR-RET-010) sets the erasure trigger per
category.

**Q. CERT-In?**
Audit logs are retained for 180 days and are India-resident by construction. The 6-hour incident
reporting obligation is an operational process, documented in the DPDP tracker, and would be exercised
on live deployment after VAPT by a CERT-In empanelled auditor.

**Q. Accessibility?**
Targeting GIGW 3.0 and WCAG 2.1 AA: semantic landmarks, a skip link, visible focus rings that are
never removed, ARIA on live regions and progress bars, no information conveyed by colour alone (every
status chip carries text), and `prefers-reduced-motion` respected. A third-party conformance audit is
listed as a next step — do not claim certified conformance.

**Q. What stops a nodal officer approving their own problem statement?**
The API. `POST /api/challenges/:id/transition` to `PUBLISHED` returns 403 unless the caller is
`DEPT_HEAD` or `ADMIN`. Separation of duties is tested explicitly in the E2E suite.

**Q. What stops an evaluator changing a score after seeing others?**
A submitted score is locked — a second submission returns 409. The first pass is blind: the applicant
identity is withheld until the score is submitted. Conflict of interest must be declared before any
score is accepted (400 otherwise). And if committee scores differ by more than 20 marks, the platform
flags a mandatory reconciliation sitting.

---

## 5. Demo script (7 minutes)

Sign-in is one click per role on `/login`; every account uses **`Avsar@2026`**.

| # | Time | Do this | Say this |
|---|---|---|---|
| 1 | 0:00 | Landing page, then the **statistics band** | "Everything on this page is live from the database, not a mock." |
| 2 | 0:40 | **Transparency board** (`/dashboard`) | "Conversion funnel including the pilots that failed. Median cycle time against a 300-day conventional tender benchmark. Payment SLA breaches, published." |
| 3 | 1:30 | Sign in as **Nodal Officer — BWSSB** | "Role decides everything visible. Note there is no publish button — a nodal officer cannot approve their own problem statement." |
| 4 | 2:10 | Open `AVS/CH/2026/0001` → **Discover startups** tab | "Reverse discovery. Open any row: every point in the match score has a reason. That is what makes a shortlist defensible in audit." |
| 5 | 3:00 | Open the pilot `AVS/PL/2026/0001` → **KPI scorecard** | "Non-revenue water: 34% down to 13.8% against a 15% target. This is the evidence that unlocks procurement — the platform refuses a procurement on a pilot with no verdict." |
| 6 | 4:00 | **Milestones** tab, then **Payments** | "Acceptance starts a 45-day clock under MSMED Act section 15. It is visible to both sides and a breach is published." |
| 7 | 4:45 | Sign in as **Evaluator**, open a pending score | "Blind — I can see the solution, not the applicant. Conflict of interest is mandatory. Once submitted, the score locks." |
| 8 | 5:30 | **Proven Solutions Registry** → Adopt | "Another department draws this down at a discovered price. Discovery, evaluation and pilot are not repeated. This is where the model stops paying for the same lesson twice." |
| 9 | 6:15 | Sign in as **Admin** → **Audit trail** | "Hash-chained. Any retrospective edit breaks the chain and this check finds it." |
| 10 | 6:45 | Terminal: `npm test` | "32 end-to-end assertions across all five stages, including every gate I just described." |

**Have ready in a second terminal:** `npm test` already run once, so the output is on screen.

---

## 6. Hard questions and honest answers

**Q. Your cycle time is 233 days. A tender is 300. That is not a revolution.**
Correct, and the honest answer is better than a spun one: **197 of those 233 days are the pilot
itself** — the deployment that produces the evidence. The handoffs we control are 15 days from
publication to first application and 21 days from application to sanctioned pilot. The dramatic saving
is not in the first purchase; it is the **second** one. A department adopting from the Proven Solutions
Registry skips discovery, evaluation and pilot entirely.

**Q. What if no startup applies to a problem statement?**
That is why reverse discovery exists. The department searches the registry directly and can approach
ranked candidates. It is a discovery tool, not an award route — the applicant still passes the gate
and the committee.

**Q. Departments do not have the skill to write outcome-based problem statements.**
Agreed, and the form is designed around it: separate mandatory fields for baseline, KPI with unit and
direction, deployment environment and available data — and the platform **refuses to publish** without
at least one measurable KPI. The next step is a library of published problem statements as worked
examples.

**Q. Who verifies the KPI readings? What stops a startup reporting good numbers?**
Readings are entered by the startup **and** by the pilot monitor, both attributed and both on the audit
trail. The closure verdict is recorded by the monitor or the department head, never the startup. For a
live deployment the strong answer is instrumented readings pulled from the department's own systems
rather than typed — which is exactly what a pilot is for.

**Q. This looks like it was built quickly. Is it production ready?**
It is a functionally complete reference implementation, not a production deployment, and the README
says so. The gaps are named and specific: live MCA/GSTN/Udyam verification instead of the KYC stub,
NIC single sign-on, PostgreSQL, GeM and PFMS integration, VAPT, and a third-party accessibility audit.

**Q. What was the hardest part?**
Deciding what the platform should *refuse* to do. Most of the design effort went into gates — the
publication approval split, the DPDP precondition, the milestone total, the evidence gate on
procurement, the score lock. Those refusals are the product; the screens are just how you reach them.

**Q. What would you build next?**
Instrumented KPI ingestion, so pilot evidence comes from the department's own systems rather than a
form. Everything else is integration work; that one changes how much the evidence is worth.

---

## 7. Where to point when asked "show me the code"

| Question | File |
|---|---|
| "Where are the rules encoded?" | `server/src/config.js` → `POLICY` (10 years, ₹100 Cr, 45 days, each with its citation) |
| "Where is the workflow?" | `server/src/services/workflow.js` — every legal transition for all four entities, in one readable file |
| "How does eligibility work?" | `server/src/services/eligibility.js` — each check returns `{code, label, authority, required, pass, detail}` |
| "How is the match score explainable?" | `server/src/services/matching.js` — returns `reasons[]` with points and a note per factor |
| "How is the audit trail tamper-evident?" | `server/src/services/audit.js` — `record()` and `verifyChain()` |
| "How is scoring structured?" | `server/src/services/scoring.js` — bucket caps, qualifying threshold, consensus + dispersion |
| "Where is authorisation?" | `server/src/middleware/auth.js`, then `guardRead`/`guardWrite` in each route module |
| "Where is the design system?" | `client/src/styles/tokens.css` — one file, everything derives from it |
| "Do you have tests?" | `server/test/workflow.test.mjs` — 32 assertions, `npm test` |

---

## 8. Numbers to memorise

| | |
|---|---|
| Stages | 5 (Assess, Validate, Sandbox, Adopt, Ramp-up) |
| Roles | 7 + public |
| Entity age limit | 10 years |
| Turnover ceiling | ₹100 crore in any financial year |
| Evaluation split | Technical 70 / Commercial 30 |
| Qualifying technical score | 45 of 70 |
| Score dispersion flag | > 20 marks |
| Payment window | 45 days (MSMED Act s.15) |
| Grievance SLA | 15 days |
| Audit log retention | 180 days (CERT-In) |
| Database tables | 16 |
| API endpoints | 46 |
| React routes | 24 |
| E2E assertions | 32, all passing |
| Native dependencies | zero |

---

*Data in the demonstration database is synthetic. Departments and ministries named are real
organisations; the problem statements, startups, pilots and contracts attributed to them are not.*
