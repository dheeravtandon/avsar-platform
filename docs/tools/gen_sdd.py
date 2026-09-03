"""AVSAR-SDD-005 - Software Design Document."""

from docx_common import add_table, bullets, callout, cover, footer_note, new_document


def build(path):
    doc = new_document()
    footer_note(doc, "AVSAR-SDD-005 Software Design Document v1.0 - Internal - Smart India Hackathon submission")

    cover(
        doc, "sdd",
        "Architecture, data model, workflow and control design",
        "This document specifies how AVSAR is built. Every section number is referenced from the "
        "Design Ref column of AVSAR-RTM-004 and from the Code Register AVSAR-CDR-006, so a "
        "requirement can be traced to the design that satisfies it and to the file that implements "
        "it. Section 8 covers the mechanism, section 9 the controls, section 10 quality attributes.",
        [["1.0", "03 Sep 2026", "TandSol", "Baseline. Sixteen-table data model, four state "
          "machines, seven roles, forty-six endpoints, twenty-four client routes."]],
    )

    # ------------------------------------------------------------- 1 to 5
    doc.add_heading("1. Scope of this design", level=1)
    doc.add_paragraph(
        "AVSAR is a two-tier web application: a stateless JSON API over a relational store, and a "
        "single-page client that holds no authorisation logic of its own. The design is deliberately "
        "small in surface area and deliberately explicit in its rules, because the rules are the "
        "product. A reviewer should be able to read four files - the policy constants, the workflow "
        "state machines, the eligibility gate and the audit chain - and understand the entire "
        "mechanism without reading a route handler."
    )

    doc.add_heading("2. Design principles", level=1)
    bullets(doc, [
        ("Rules in one place.", "Every statutory limit is declared once, in server/src/config.js, "
         "beside the instrument it derives from. There is no second definition of ten years or of "
         "one hundred crore anywhere in the codebase."),
        ("State machines declared, not discovered.", "All four lifecycles are declared together in "
         "server/src/services/workflow.js. A transition scattered across handlers is a transition "
         "nobody can review; declared together, the legal order of operations is one file read "
         "end to end."),
        ("Explainable over clever.", "Both scoring models return the reason for every point. A "
         "shortlist that cannot be explained to a public auditor is worthless regardless of how "
         "good the ranking is."),
        ("Refusal is the feature.", "The design effort went into what the platform will not do: "
         "publish without a KPI, activate a pilot without a data processing agreement, accept a "
         "score without a conflict declaration, draft a procurement without pilot evidence, let a "
         "nodal officer approve their own work."),
        ("No native dependencies.", "The database is the Node runtime's own SQLite. The project "
         "installs with one command on any machine that runs Node, and no install step can fail on "
         "a compiler toolchain."),
        ("Server is the authority.", "The client hides controls the server would refuse; it never "
         "gates anything the server does not also gate."),
    ])

    doc.add_heading("3. Architecture overview", level=1)
    add_table(doc, ["Tier", "Responsibility", "Technology"], [
        ["Client", "Presentation, form validation for feedback only, role-derived navigation", "React 18, React Router 6, Vite 5, Recharts, hand-written CSS"],
        ["API", "Authentication, authorisation, request validation, workflow enforcement, audit", "Node.js 22+, Express 4, Zod 3"],
        ["Domain", "Statutory gates, matching, scoring, file numbering, notifications - no HTTP or SQL concerns", "Plain ES modules"],
        ["Data", "Relational storage, transactions, referential integrity, append-only audit", "SQLite via node:sqlite; portable SQL"],
    ], widths=[0.9, 3.1, 2.7])

    doc.add_heading("4. Deployment view", level=1)
    doc.add_paragraph(
        "In development the client is served by Vite on port 5173 and proxies /api to the API on "
        "port 4000, which keeps the client same-origin so no host is ever compiled into the bundle. "
        "In production the built client is static and served by the same reverse proxy that fronts "
        "the API, so the relative /api base continues to work unchanged. The API reads API_PORT in "
        "preference to PORT so that a host-injected PORT intended for the web tier cannot collide "
        "with it."
    )

    doc.add_heading("5. Technology decisions and their justification", level=1)
    add_table(doc, ["Decision", "Alternative considered", "Why this one"], [
        ["node:sqlite", "better-sqlite3; PostgreSQL from the outset", "No native compilation, so install cannot fail; no server to start before a demo. Schema stays portable SQL so PostgreSQL is a driver swap, not a rewrite."],
        ["Hand-written CSS with tokens", "Tailwind; Material UI", "A government service should not look like a SaaS template, and a design system you did not write is one you cannot defend. Total cost: 27 kB of CSS for the entire visual layer."],
        ["Zod at the route boundary", "Manual checks in handlers", "Parse rather than validate: the handler receives typed, coerced data, and a failure returns field-level errors the form renders inline."],
        ["JWT, no server session", "Server-side sessions", "The API stays stateless and horizontally scalable. Revocation risk is handled by reloading the user on every request rather than trusting the token alone."],
        ["Weighted explainable matching", "Embedding similarity", "An audit-defensible shortlist requires a reason per point. Semantic similarity cannot be explained to the Comptroller and Auditor General."],
        ["Hash-chained audit table", "Append-only log file; external ledger", "Tamper evidence inside the same transactional store, verifiable in one query walk, with no external dependency."],
    ], widths=[1.7, 1.9, 3.1])

    # ------------------------------------------------------------------ 6
    doc.add_heading("6. Module organisation", level=1)
    doc.add_heading("6.1 Build and workspace", level=2)
    doc.add_paragraph(
        "A two-package npm workspace: server and client. The root exposes install, seed, dev, build, "
        "start and test, so a reviewer needs no knowledge of the internal layout to run anything."
    )
    doc.add_heading("6.2 API composition", level=2)
    doc.add_paragraph(
        "server/src/index.js applies the schema idempotently at boot, then mounts eleven route "
        "modules under /api, with the not-found and error handlers registered last so every "
        "rejected promise reaches one place. A health endpoint reports service version, environment "
        "and whether the database has been seeded."
    )

    # ------------------------------------------------------------------ 7
    doc.add_heading("7. Data model", level=1)
    doc.add_paragraph(
        "Sixteen tables. Foreign keys are enforced, write-ahead logging is on, and every JSON-valued "
        "column is documented in the schema comment beside it."
    )
    doc.add_heading("7.1 Identity and organisation", level=2)
    add_table(doc, ["Table", "Purpose", "Notable columns"], [
        ["departments", "Participating department, ministry, level and innovation budget head", "code, level (CENTRAL/STATE/ULB/PSU), budget_head, innovation_budget"],
        ["users", "Every account across all seven roles", "role, dept_id, expertise (evaluators), status, last_login_at"],
        ["startups", "The applicant entity and every fact the statutory gate tests", "dpiit_number, incorporation_date, turnover_last_fy, is_split_reconstruction, eligibility_status, eligibility_json"],
    ], widths=[1.1, 2.4, 3.2])

    doc.add_heading("7.2 The mechanism", level=2)
    add_table(doc, ["Table", "Purpose", "Notable columns"], [
        ["challenges", "The outcome-based problem statement", "code, success_kpis (JSON), pilot_budget_ceiling, trl_min, scale_value, ip_terms, status"],
        ["applications", "A startup's response, with the gate verdict frozen on it", "code, eligibility_snapshot (JSON), match_score, quoted_pilot_cost, status; UNIQUE (challenge_id, startup_id)"],
        ["evaluation_criteria", "The rubric, published in advance", "code, max_score, weight, bucket (TECHNICAL/COMMERCIAL)"],
        ["evaluations", "One row per evaluator per application", "scores (JSON), total_score, recommendation, coi_declared, status; UNIQUE (application_id, evaluator_id)"],
        ["pilots", "The funded sandbox", "code, budget_sanctioned, sanction_order_no, kpi_targets (JSON), dpa_signed, verdict"],
        ["milestones", "Deliverables with linked payment release", "seq, payout_percent, payout_amount, evidence_note, status"],
        ["kpi_readings", "Periodic actuals against declared targets", "kpi_key, target_value, actual_value, period, recorded_by"],
        ["procurements", "The award, and the rule it rests on", "code, mode, gfr_rule, justification, contract_value, po_number, gem_contract_id"],
        ["payments", "The obligation and the statutory clock", "invoice_no, amount, raised_on, due_date, paid_on, pfms_ref, status"],
        ["catalogue", "The Proven Solutions Registry listing", "code, unit_price, uom, proven_kpi (JSON), rate_contract_valid_till, adoptions"],
        ["adoptions", "A second department's draw-down", "catalogue_id, dept_id, quantity, value, status"],
    ], widths=[1.1, 2.4, 3.2])

    doc.add_heading("7.3 Cross-cutting", level=2)
    add_table(doc, ["Table", "Purpose", "Notable columns"], [
        ["grievances", "Redressal with an SLA", "code, category, description, sla_due, resolution, status"],
        ["notifications", "In-app notification per user", "user_id, title, body, link, severity, read_at"],
        ["audit_log", "Append-only, hash-chained record of every state change", "actor_id, actor_role, action, entity_type, entity_id, meta (JSON), prev_hash, hash"],
    ], widths=[1.1, 2.4, 3.2])

    doc.add_heading("7.4 Access layer", level=2)
    doc.add_paragraph(
        "server/src/db/index.js exposes all, get, run, insert, update and tx. Every call is "
        "parameterised. A bind normaliser converts booleans to integers and objects to JSON text, "
        "because node:sqlite binds only null, number, bigint, string and Uint8Array - which means a "
        "boolean passed by mistake fails loudly at the boundary rather than silently storing "
        "something unexpected. Multi-row writes go through tx so a partial failure leaves no "
        "orphaned record."
    )

    # ------------------------------------------------------------------ 8
    doc.add_heading("8. Mechanism design", level=1)

    doc.add_heading("8.1 Problem statement authoring and publication", level=2)
    doc.add_paragraph(
        "Authoring captures the outcome, not a specification. The form separates baseline from "
        "desired outcome and requires each KPI to carry a target, a unit and a direction of "
        "improvement, because direction is what makes attainment computable for a metric where "
        "lower is better. The API refuses a problem statement with an empty KPI array. On creation a "
        "file number of the form AVS/CH/YYYY/NNNN is issued and is carried by every downstream record."
    )
    doc.add_paragraph(
        "Publication is separated from authoring: the transition to PUBLISHED is refused with HTTP "
        "403 unless the caller is a department head or platform administrator. On publication, "
        "eligible startups whose declared sector matches are notified, and the problem statement "
        "becomes visible without authentication."
    )

    doc.add_heading("8.2 Eligibility and application", level=2)
    doc.add_paragraph("The gate is two-part and both parts run at submission:")
    add_table(doc, ["Check", "Instrument", "Blocking"], [
        ["DPIIT recognition on record", "DPIIT G.S.R. 127(E)", "Yes"],
        ["Recognition valid on the date of application", "DPIIT G.S.R. 127(E)", "Yes"],
        ["Incorporated within the last ten years", "G.S.R. 127(E) para 1(i)", "Yes"],
        ["Turnover never above INR 100 crore in any financial year", "G.S.R. 127(E) para 1(ii)", "Yes"],
        ["Not formed by splitting up or reconstruction", "G.S.R. 127(E) para 1(iv)", "Yes"],
        ["Private Limited, LLP or Registered Partnership", "G.S.R. 127(E) para 1(iii)", "Yes"],
        ["CIN, GSTIN and Udyam verification complete", "Platform onboarding control", "No - advisory"],
        ["Claimed readiness at or above the declared floor", "Challenge fit", "Yes"],
        ["Quoted cost within the published ceiling", "Challenge fit", "Yes"],
        ["Proposed timeline within the pilot window", "Challenge fit", "Yes"],
    ], widths=[3.0, 2.4, 1.3])
    doc.add_paragraph(
        "Each check returns a structured record carrying its code, label, the instrument it derives "
        "from, whether it is blocking, the verdict and a human-readable detail. The whole verdict is "
        "frozen onto the application as a JSON snapshot at submission, so a later profile edit "
        "cannot retrospectively change the basis on which an application was decided. That property "
        "is what makes the decision auditable."
    )
    callout(doc, "Relaxations:",
            "An eligible applicant automatically receives the prior-turnover waiver, the "
            "prior-experience waiver, EMD exemption, tender-fee exemption and the forty-five-day "
            "payment undertaking, each recorded with its authority. Nothing has to be claimed.")

    doc.add_heading("8.3 Evaluation", level=2)
    doc.add_paragraph(
        "Two envelopes: technical capped at 70 and commercial at 30. Nine criteria carry a maximum "
        "score and a weight; the weighted sum is normalised to its bucket cap, so criteria can be "
        "re-tuned without disturbing the 70/30 split. A technical score below 45 disqualifies "
        "regardless of price, which prevents cheapness buying past a technical failure."
    )
    doc.add_paragraph("Four integrity controls sit around the scoring itself:")
    bullets(doc, [
        "A conflict-of-interest declaration is a precondition; the API returns 400 without it.",
        "The first pass is blind: the evaluator's worklist withholds applicant identity until their own score is submitted.",
        "A submitted score is immutable; a second submission returns 409.",
        "Committee dispersion above twenty marks raises a flag and notifies the department, requiring a reconciliation sitting before a shortlist.",
    ])

    doc.add_heading("8.4 File numbering", level=2)
    doc.add_paragraph(
        "AVS/<type>/<year>/<sequence>, with the sequence allocated per table per calendar year by "
        "reading the highest existing code for that prefix. Types are CH challenge, AP application, "
        "PL pilot, PR procurement, CT catalogue and GR grievance. The format is chosen so an officer "
        "can quote it on paper."
    )

    doc.add_heading("8.5 Transparency board", level=2)
    doc.add_paragraph(
        "Every figure is computed from the transactional tables at request time, not from a "
        "reporting copy, so the board cannot silently diverge from the record. It publishes the "
        "conversion funnel including pilots that failed, application-to-pilot and "
        "pilot-to-procurement conversion, sector and department distribution, payment SLA "
        "performance including breaches, and median cycle time at each handoff against a "
        "conventional-tender benchmark. Medians are used rather than means so that a single slow "
        "case does not distort the figure."
    )

    doc.add_heading("8.6 Notification", level=2)
    doc.add_paragraph(
        "In-app only, written in the same request as the state change that caused it, addressed to "
        "the affected party and to the department officers who must act. Severity is INFO, SUCCESS "
        "or WARNING and drives presentation only."
    )

    doc.add_heading("8.7 Discovery and matching", level=2)
    doc.add_paragraph(
        "One hundred points across five factors: sector alignment 30, capability tag overlap 30, "
        "readiness above the declared floor 20, prior public-sector delivery 10, geography 10. Each "
        "factor returns its point award and a note explaining it."
    )
    callout(doc, "Design constraint:",
            "Prior public-sector delivery contributes points but is never a gate. GFR 2017 Rule "
            "173(i) waives prior experience as a qualification requirement, so treating it as one "
            "would defeat the purpose of the mechanism. A first-time supplier is labelled as such "
            "in the interface rather than penalised.")

    doc.add_heading("8.8 Pilot", level=2)
    doc.add_paragraph(
        "Creation validates the sanctioned amount against the published ceiling and requires "
        "milestone payouts to sum to exactly one hundred per cent. Activation is blocked with HTTP "
        "412 until the DPDP data processing agreement is recorded. A startup may only accept the "
        "agreement; every other transition belongs to the department, and the closure verdict is "
        "reserved to the pilot monitor or department head."
    )
    doc.add_paragraph(
        "The scorecard computes attainment per KPI from the latest reading, honouring direction: "
        "for an upward metric it is actual over target, for a downward metric target over actual. "
        "Attainment is clamped to a sensible range so a wildly better-than-target reading does not "
        "distort the display."
    )

    doc.add_heading("8.9 Payments and the statutory clock", level=2)
    doc.add_paragraph(
        "Milestone acceptance writes a payment row with a due date forty-five days out, per section "
        "15 of the MSMED Act 2006. Overdue status is computed at read time against the current date "
        "rather than stored, so a ledger is never stale. The ledger is visible to both the "
        "department and the supplier, and breaches are counted on the public board."
    )

    doc.add_heading("8.10 Procurement", level=2)
    doc.add_paragraph(
        "Creation is refused with HTTP 412 unless the linked pilot carries a SUCCESS or PARTIAL "
        "verdict. The mode determines the rule printed on the face of the record:"
    )
    add_table(doc, ["Mode", "Rule", "When"], [
        ["SINGLE_SOURCE", "GFR 2017 R.166 with R.173(i)", "The pilot established that only this solution meets the declared KPIs"],
        ["LIMITED_TENDER", "GFR 2017 R.162", "More than one pilot cleared the KPI gate; price discovery is required"],
        ["GEM_DIRECT", "GFR 2017 R.149", "The solution is listed on GeM under the startup category"],
        ["RATE_CONTRACT", "GFR 2017 R.145", "Price and terms fixed once for multi-department draw-down"],
    ], widths=[1.4, 1.7, 3.6])
    doc.add_paragraph(
        "A written justification of at least fifty characters is mandatory and is written to the "
        "audit record. Sanction is reserved to the department head: a procurement officer may "
        "prepare but not approve. Purchase order issue generates a number and raises an advance "
        "payment."
    )

    doc.add_heading("8.11 Proven Solutions Registry", level=2)
    doc.add_paragraph(
        "A live or completed contract may be listed, and the listing carries the measured pilot KPIs "
        "so a second department sees evidence rather than a claim. Adoption is a single action that "
        "records quantity, value and the drawing department; the response names the three stages "
        "skipped. Adoption is refused once the rate contract validity has lapsed."
    )

    doc.add_heading("8.12 Grievance and administration", level=2)
    doc.add_paragraph(
        "Five categories - eligibility, evaluation, payment delay, scope and other - each with a "
        "fifteen-day SLA computed at creation and an overdue flag computed at read time. Resolution "
        "requires written text visible to the person who raised it. Administration covers account "
        "suspension and reinstatement, KYC verification and audit-chain re-verification; it "
        "deliberately excludes any ability to score, approve or sanction on a department's behalf."
    )

    doc.add_heading("8.13 Workflow state machines", level=2)
    doc.add_paragraph(
        "Four state machines are declared as adjacency maps in one module, with a single "
        "assertTransition guard used by every route. An illegal transition returns HTTP 409 before "
        "any write occurs."
    )
    add_table(doc, ["Entity", "States"], [
        ["Challenge", "DRAFT, PENDING_APPROVAL, PUBLISHED, CLOSED, EVALUATION, PILOT, PROCURED, REJECTED, ARCHIVED"],
        ["Application", "DRAFT, SUBMITTED, ELIGIBILITY_FAIL, UNDER_EVALUATION, SHORTLISTED, SELECTED_FOR_PILOT, REJECTED, WITHDRAWN"],
        ["Pilot", "AGREEMENT_PENDING, ACTIVE, ON_HOLD, UNDER_REVIEW, SUCCESS, PARTIAL, FAILED, CLOSED"],
        ["Procurement", "DRAFT, PENDING_APPROVAL, APPROVED, PO_ISSUED, ACTIVE, COMPLETED, TERMINATED"],
    ], widths=[1.2, 5.5])
    doc.add_paragraph(
        "The same module maps a challenge status onto one of the five named stages, so the stage "
        "indicator in the interface and the state machine cannot disagree."
    )

    doc.add_heading("8.14 Reference data", level=2)
    doc.add_paragraph(
        "A single GET /api/meta returns sectors, capability tags, states, the nine-level readiness "
        "scale, role labels, the five stages, all four state machines, the policy block with its "
        "statutory citations, the match weights and the evaluation rubric. One call means a form "
        "cannot drift out of agreement with the server about what a valid value is."
    )

    # ------------------------------------------------------------------ 9
    doc.add_heading("9. Security and compliance design", level=1)

    doc.add_heading("9.1 Authentication", level=2)
    doc.add_paragraph(
        "bcrypt password hashing; the hash is deleted from every user object before it leaves the "
        "server. A signed JWT carries subject, role and department with an eight-hour expiry. Every "
        "authenticated request reloads the user and requires status ACTIVE, so a suspended account "
        "fails on its next request rather than at token expiry. Failed sign-in attempts are written "
        "to the audit trail with the attempted address."
    )

    doc.add_heading("9.2 Authorisation and separation of duties", level=2)
    doc.add_paragraph(
        "Role authorisation runs as middleware before every handler. Row-level ownership is then "
        "checked inside the handler, because a valid role is not the same as a right to a "
        "particular record. Four separations are enforced rather than advised:"
    )
    add_table(doc, ["Separation", "Enforcement"], [
        ["A nodal officer cannot publish their own problem statement", "Transition to PUBLISHED returns 403 unless DEPT_HEAD or ADMIN"],
        ["A procurement officer cannot sanction a procurement they prepared", "Transition to APPROVED returns 403 unless DEPT_HEAD or ADMIN"],
        ["A startup cannot influence the pilot verdict on its own pilot", "Verdict transitions restricted to PILOT_MONITOR or DEPT_HEAD"],
        ["An administrator cannot decide a department's business", "No scoring, approval or sanction route accepts ADMIN as a substitute for the department role"],
    ], widths=[2.6, 4.1])

    doc.add_heading("9.3 Data disclosure", level=2)
    doc.add_paragraph(
        "Public endpoints restrict challenge visibility to published and downstream stages, so a "
        "draft is a 404 to an anonymous caller rather than a 403 - the existence of the record is "
        "not disclosed. Financial and identity fields on a startup profile are stripped for "
        "unauthenticated callers and for other startups. An evaluator sees only applications "
        "assigned to them."
    )

    doc.add_heading("9.4 DPDP Act 2023", level=2)
    doc.add_paragraph(
        "Purpose is declared at collection and bounded by procurement participation. The department "
        "is the data fiduciary and a startup running a pilot is a processor, so the platform "
        "requires the data processing agreement before a pilot may process anything - enforced as a "
        "precondition, not a checkbox. Correction and completion are fully self-service, which is "
        "the substantive answer to an adverse eligibility decision. Open items - a discrete "
        "revocable consent artefact, self-service erasure and scheduled-language notice - are "
        "tracked with owners and dates in AVSAR-DPD-009."
    )

    doc.add_heading("9.5 Input handling and error disclosure", level=2)
    doc.add_paragraph(
        "Every request body is parsed by a schema at the route boundary; a failure returns HTTP 422 "
        "with a field path and message per issue, which the client renders inline against the "
        "offending input. All database access is parameterised. The client performs no raw HTML "
        "injection anywhere. Outside development, a server error returns a generic message with no "
        "stack trace or internal detail."
    )

    doc.add_heading("9.6 Audit trail", level=2)
    doc.add_paragraph(
        "Each entry stores SHA-256 of the previous entry's hash concatenated with a canonical JSON "
        "payload of actor, role, action, entity, metadata and timestamp. The first entry chains from "
        "a genesis value of sixty-four zeros. Verification walks the chain from the beginning, "
        "recomputing each hash, and reports the identifier of the first entry where either the "
        "recorded previous hash or the recorded hash fails to match."
    )
    callout(doc, "Why this and not a log table:",
            "A conventional log can be edited by anyone with database access and the edit leaves no "
            "trace. Chaining means an edit anywhere invalidates every subsequent hash, so tampering "
            "is detectable rather than merely prohibited. This is the control that makes an "
            "evidence-gated single-source award defensible to audit.")

    # ----------------------------------------------------------------- 10
    doc.add_heading("10. Quality attributes", level=1)

    doc.add_heading("10.1 Performance", level=2)
    doc.add_paragraph(
        "Indexes cover every filter and join used by a list view. Aggregates on the transparency "
        "board are single-pass scalar queries. The client bundle is split three ways so that "
        "charting code does not block first paint: application 253 kB, framework 164 kB, charts "
        "384 kB, or 66, 54 and 105 kB gzipped. Production build completes in about four seconds."
    )

    doc.add_heading("10.2 Portability", level=2)
    doc.add_paragraph(
        "No natively compiled dependency, so installation cannot fail on a toolchain. The schema "
        "avoids SQLite-specific constructs beyond AUTOINCREMENT and the datetime default, both of "
        "which have direct PostgreSQL equivalents; moving is a driver change in one file."
    )

    doc.add_heading("10.3 Accessibility", level=2)
    bullets(doc, [
        "Semantic landmarks and a skip link to main content on every page.",
        "Focus-visible outlines defined once and never suppressed; focus order follows document order.",
        "No information conveyed by colour alone - every status chip pairs its colour with a text label, and the status vocabulary lives in one module so the pairing cannot be forgotten.",
        "ARIA on live regions, progress bars, tab lists and dialogs; a modal traps Escape and restores scroll.",
        "prefers-reduced-motion collapses all animation.",
        "Dense tables scroll inside their own container so the page body never scrolls horizontally.",
    ])

    doc.add_heading("10.4 Design system", level=2)
    doc.add_paragraph(
        "tokens.css defines the ink and paper scales, an administrative navy as primary, an Ashoka "
        "blue accent used sparingly, saffron reserved for the sandbox stage, semantic colours, a "
        "type scale down to eleven pixels for table metadata, a four-pixel spacing scale, radius and "
        "a restrained elevation scale. Nothing in the application sets a raw hex value. Typography "
        "pairs Inter for interface with Source Serif 4 for display headings and JetBrains Mono for "
        "file numbers and hashes, which is what gives the surface an editorial rather than a "
        "product feel."
    )

    doc.add_heading("10.5 Reliability", level=2)
    doc.add_paragraph(
        "A render failure anywhere in the tree is caught by an error boundary that presents the "
        "message and a route back, so a demo never shows a blank screen. Multi-row writes are "
        "transactional. The fetch layer cancels in-flight requests on unmount and recovers from a "
        "401 by clearing the token and returning to sign-in."
    )

    doc.add_heading("10.6 Observability", level=2)
    doc.add_paragraph(
        "GET /api/health reports service name, version, environment, database engine and file, and "
        "whether the database has been seeded - enough for a load balancer probe and for a reviewer "
        "to confirm the environment before a demonstration."
    )

    doc.add_heading("10.7 Localisation readiness", level=2)
    doc.add_paragraph(
        "Reference data - sectors, capability tags, states, readiness levels, role labels, status "
        "labels - is served from the API or held in a single client module rather than embedded in "
        "components, so a Hindi layer is a content change rather than a structural one."
    )

    doc.add_heading("10.8 Client structure", level=2)
    doc.add_paragraph(
        "Twenty-four routes, eight public and sixteen authenticated, guarded by a role-aware wrapper "
        "that redirects rather than rendering a forbidden view. All endpoint URLs live in one map so "
        "no component contains a URL string. Navigation is derived from the role predicate, so a "
        "user never sees a link to something the server would refuse."
    )

    doc.add_heading("10.9 Public surface", level=2)
    doc.add_paragraph(
        "The public site carries the landing page, the reference explanation of the mechanism, the "
        "transparency board, published problem statements, the startup registry and the Proven "
        "Solutions Registry. It exists because a procurement mechanism that asks for public trust "
        "should be legible to the public without an account."
    )

    # ----------------------------------------------------------------- 11
    doc.add_heading("11. Integration and deployment design", level=1)
    doc.add_heading("11.1 Integration points", level=2)
    add_table(doc, ["System", "Purpose", "Current state"], [
        ["MCA (CIN)", "Verify corporate identity at registration", "Field captured; live verification is a deployment item"],
        ["GSTN (GSTIN)", "Verify tax registration", "Field captured; live verification is a deployment item"],
        ["Udyam registry", "MSME status for payment protection", "Field captured; live verification is a deployment item"],
        ["GeM", "List a proven solution; place an order", "gem_contract_id field present on procurement"],
        ["PFMS", "Payment status and settlement reference", "pfms_ref field present on payment; recorded at release"],
        ["CPPP", "Publish procurement notices", "Deployment item"],
        ["NIC single sign-on", "Authenticate departmental users", "Deployment item; local passwords in the reference build"],
    ], widths=[1.4, 2.4, 2.9])
    doc.add_paragraph(
        "Each integration is isolated behind a named column rather than an embedded call, so a live "
        "adapter replaces a stub without a schema migration."
    )
    doc.add_heading("11.2 Pre-deployment gates", level=2)
    doc.add_paragraph(
        "Two gates are absolute. No live award may be made before a vulnerability assessment and "
        "penetration test by a CERT-In empanelled auditor. No deployment to a government domain may "
        "occur before an independent GIGW 3.0 conformance audit. Both are recorded as requirements "
        "in AVSAR-RTM-004 and as obligations in AVSAR-DPD-009, not as intentions."
    )

    # ----------------------------------------------------------------- 12
    doc.add_heading("12. Verification design", level=1)
    doc.add_heading("12.1 End-to-end suite", level=2)
    doc.add_paragraph(
        "One suite walks a single problem statement through all five stages against a live API on a "
        "throwaway database, asserting thirty-two conditions. It is organised by stage so a failure "
        "localises immediately, and it deliberately asserts refusals as well as successes: a "
        "problem statement with no KPI, a nodal officer publishing their own work, an illegal "
        "transition, a quote above the ceiling, milestone payouts that do not total one hundred, a "
        "sanction above the ceiling, activation without a data processing agreement, scoring without "
        "a conflict declaration, editing a submitted score, procuring without pilot evidence, "
        "sanctioning without authority, a startup reading another department's data, and an "
        "anonymous caller reaching a draft."
    )
    doc.add_heading("12.2 Seed dataset", level=2)
    doc.add_paragraph(
        "The seed is deterministic and shaped to exercise every state in the workflow, so a "
        "reviewer sees the whole lifecycle without clicking through it: seven departments, "
        "thirty-two users across all seven roles, twelve startups of which two are deliberately "
        "ineligible - one incorporated more than ten years ago and one above the turnover ceiling - "
        "eight problem statements spanning draft to procured, thirteen applications including one "
        "blocked at the gate, nineteen evaluations of which four are left unscored to populate an "
        "evaluator's live worklist, two pilots of which one is closed with all KPIs met and one is "
        "active with a milestone awaiting review, one rate contract, one registry listing and two "
        "cross-department adoptions. Dates are computed so that the cycle-time medians on the "
        "transparency board are coherent."
    )

    doc.add_heading("13. Document generation", level=1)
    doc.add_paragraph(
        "The nine binary documents in docs/ are generated from committed Python source in "
        "docs/tools, sharing one cover-block, palette and table style. The consequence is that a "
        "document and the data behind it cannot diverge: changing a requirement means changing the "
        "source row and regenerating, so a stale spreadsheet cannot be circulated by accident. "
        "Summary tabs use live spreadsheet formulas over the data tabs rather than typed counts, so "
        "editing a status cell updates every figure that depends on it."
    )

    doc.save(path)
    return path
