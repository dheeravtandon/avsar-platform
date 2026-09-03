"""AVSAR-RTM-004 - Requirements Traceability Matrix."""

from common import (
    add_status_validation, cover_sheet, legend_sheet, new_workbook,
    summary_sheet, write_table,
)

HEADERS = [
    "Req ID", "Module", "Description", "User Role", "Pri", "Type",
    "Source", "Design Ref", "Test Ref", "Compliance Tag", "Status",
]
WIDTHS = [11, 20, 74, 20, 6, 7, 26, 16, 30, 20, 12]
WRAP = (3, 7, 9)

# Req ID, Module, Description, Role, MoSCoW, Type, Source, Design ref, Test ref, Compliance, Status
FUNCTIONAL = [
    ("FR-001", "Onboarding", "A startup shall self-register with its DPIIT recognition number, incorporation date, entity type and last-year turnover in a single form.", "Startup", "M", "FUN", "DPIIT G.S.R. 127(E)", "SDD 7.1", "workflow.test.mjs / stage V", "DPDP-CONSENT", "Verified"),
    ("FR-002", "Onboarding", "On submission the platform shall run the statutory eligibility gate and return an itemised verdict naming the rule behind each check.", "Startup", "M", "FUN", "GFR 2017 R.173(i)", "SDD 7.2", "workflow.test.mjs / gate", "GFR-173", "Verified"),
    ("FR-003", "Onboarding", "A startup shall be able to correct profile facts and re-run the eligibility gate on demand without raising a new application.", "Startup", "S", "FUN", "Grievance design", "SDD 7.2", "Manual - Profile screen", "-", "Verified"),
    ("FR-004", "Onboarding", "The platform shall record CIN, GSTIN and Udyam numbers and expose a KYC state of PENDING, VERIFIED or REJECTED.", "Admin", "S", "FUN", "Onboarding control", "SDD 7.1", "Manual - Administration", "-", "Developed"),
    ("FR-005", "Challenge", "A nodal officer shall create a problem statement capturing problem, background, baseline, desired outcome, sector, tags, TRL floor, budget ceiling, duration, scale-up value, deployment environment, data availability and IP terms.", "Nodal Officer", "M", "FUN", "Charter 4.1", "SDD 8.1", "workflow.test.mjs / stage A", "-", "Verified"),
    ("FR-006", "Challenge", "The platform shall refuse to accept a problem statement that declares no measurable KPI.", "Nodal Officer", "M", "FUN", "Charter 4.1", "SDD 8.1", "workflow.test.mjs / no-KPI", "-", "Verified"),
    ("FR-007", "Challenge", "Each KPI shall carry a target, a unit and a direction of improvement.", "Nodal Officer", "M", "FUN", "Charter 4.1", "SDD 8.1", "workflow.test.mjs / scorecard", "-", "Verified"),
    ("FR-008", "Challenge", "A problem statement shall receive a permanent file number of the form AVS/CH/YYYY/NNNN on creation.", "System", "M", "FUN", "Government file practice", "SDD 8.4", "workflow.test.mjs / stage A", "-", "Verified"),
    ("FR-009", "Challenge", "Only a department head or platform administrator shall be able to approve and publish a problem statement.", "Department Head", "M", "FUN", "Separation of duties", "SDD 9.2", "workflow.test.mjs / self-publish", "SOD", "Verified"),
    ("FR-010", "Challenge", "On publication the platform shall notify eligible startups whose declared sector matches the problem statement.", "Startup", "S", "FUN", "Charter 4.2", "SDD 8.6", "Manual - notification panel", "-", "Verified"),
    ("FR-011", "Challenge", "A published problem statement, its KPIs and its budget ceiling shall be visible without authentication.", "Public", "M", "FUN", "Transparency", "SDD 8.5", "workflow.test.mjs / anon draft", "TRANSPARENCY", "Verified"),
    ("FR-012", "Challenge", "A draft, pending or returned problem statement shall never be disclosed to an unauthenticated caller.", "Public", "M", "SEC", "Transparency", "SDD 9.3", "workflow.test.mjs / anon draft", "-", "Verified"),
    ("FR-013", "Discovery", "A department shall be able to search the startup registry by sector, state, readiness level, women-led status and free text.", "Nodal Officer", "M", "FUN", "Charter 4.3", "SDD 8.7", "Manual - Registry screen", "-", "Verified"),
    ("FR-014", "Discovery", "The platform shall rank eligible startups against a problem statement using a transparent weighted model.", "Nodal Officer", "M", "FUN", "Charter 4.3", "SDD 8.7", "Manual - Discover tab", "AUDIT-DEFENSIBLE", "Verified"),
    ("FR-015", "Discovery", "The match score shall return a human-readable reason and a point value for every contributing factor.", "Nodal Officer", "M", "FUN", "Audit defensibility", "SDD 8.7", "Manual - Discover tab", "AUDIT-DEFENSIBLE", "Verified"),
    ("FR-016", "Discovery", "Prior government supply shall contribute to the match score but shall never act as a qualification gate.", "System", "M", "CMP", "GFR 2017 R.173(i)", "SDD 8.7", "workflow.test.mjs / relaxations", "GFR-173", "Verified"),
    ("FR-017", "Application", "A startup shall apply to a published problem statement with solution title, summary, approach, claimed TRL, prior deployments, team size, quoted pilot cost, timeline, differentiators and declared risks.", "Startup", "M", "FUN", "Charter 4.4", "SDD 8.2", "workflow.test.mjs / stage V", "-", "Verified"),
    ("FR-018", "Application", "A startup shall not be able to submit more than one application to the same problem statement.", "System", "M", "FUN", "Fairness", "SDD 8.2", "Schema UNIQUE constraint", "-", "Verified"),
    ("FR-019", "Application", "On submission the platform shall run the challenge fit gate on TRL floor, budget ceiling and timeline window and store the verdict verbatim on the application.", "System", "M", "FUN", "Charter 4.4", "SDD 8.2", "workflow.test.mjs / over-ceiling", "-", "Verified"),
    ("FR-020", "Application", "A blocked application shall display the exact criterion that failed and the rule it derives from.", "Startup", "M", "FUN", "Natural justice", "SDD 8.2", "workflow.test.mjs / over-ceiling", "AUDIT-DEFENSIBLE", "Verified"),
    ("FR-021", "Application", "A startup shall be able to withdraw its own application before evaluation concludes.", "Startup", "C", "FUN", "Charter 4.4", "SDD 8.2", "Manual - Applications screen", "-", "Developed"),
    ("FR-022", "Evaluation", "A nodal officer shall assign one or more evaluators to an application from the evaluator pool, with current workload visible.", "Nodal Officer", "M", "FUN", "Charter 4.5", "SDD 8.3", "workflow.test.mjs / committee", "-", "Verified"),
    ("FR-023", "Evaluation", "An evaluator shall not see the applicant identity until their own score is submitted.", "Evaluator", "M", "FUN", "Bias reduction", "SDD 8.3", "workflow.test.mjs / blinded", "SOD", "Verified"),
    ("FR-024", "Evaluation", "The platform shall refuse to accept a score unless a conflict-of-interest declaration has been made.", "Evaluator", "M", "SEC", "Integrity control", "SDD 9.2", "workflow.test.mjs / COI", "SOD", "Verified"),
    ("FR-025", "Evaluation", "Scoring shall follow a two-envelope model of technical 70 and commercial 30 against a rubric published in advance.", "Evaluator", "M", "FUN", "Charter 4.5", "SDD 8.3", "workflow.test.mjs / score", "-", "Verified"),
    ("FR-026", "Evaluation", "A technical score below 45 of 70 shall disqualify an application regardless of its commercial score.", "System", "M", "FUN", "Charter 4.5", "SDD 8.3", "workflow.test.mjs / score", "-", "Verified"),
    ("FR-027", "Evaluation", "A submitted score shall be immutable.", "Evaluator", "M", "SEC", "Integrity control", "SDD 9.2", "workflow.test.mjs / lock", "AUDIT", "Verified"),
    ("FR-028", "Evaluation", "Where committee scores differ by more than 20 marks the platform shall flag a mandatory reconciliation sitting.", "Nodal Officer", "S", "FUN", "Integrity control", "SDD 8.3", "Manual - Application detail", "-", "Verified"),
    ("FR-029", "Evaluation", "The platform shall produce a comparative statement of all applications to a problem statement with committee averages.", "Department Head", "S", "RPT", "Charter 4.5", "SDD 8.3", "GET /evaluations/challenge/:id/summary", "-", "Developed"),
    ("FR-030", "Pilot", "A pilot shall be created only from a shortlisted application and only within the published budget ceiling.", "Nodal Officer", "M", "FUN", "Charter 4.6", "SDD 8.8", "workflow.test.mjs / over-ceiling sanction", "-", "Verified"),
    ("FR-031", "Pilot", "Milestone payout percentages shall sum to exactly one hundred before a pilot can be created.", "System", "M", "FUN", "Financial control", "SDD 8.8", "workflow.test.mjs / milestone total", "-", "Verified"),
    ("FR-032", "Pilot", "A pilot shall not become active until the DPDP data processing agreement is recorded.", "System", "M", "CMP", "DPDP Act 2023", "SDD 9.4", "workflow.test.mjs / DPDP gate", "DPDP-DPA", "Verified"),
    ("FR-033", "Pilot", "A startup shall submit evidence against each milestone and the department shall accept or return it with remarks.", "Startup", "M", "FUN", "Charter 4.6", "SDD 8.8", "workflow.test.mjs / milestone", "-", "Verified"),
    ("FR-034", "Pilot", "Acceptance of a milestone shall automatically raise a payment due within forty-five days.", "System", "M", "CMP", "MSMED Act 2006 s.15", "SDD 8.9", "workflow.test.mjs / 45-day window", "MSMED-45", "Verified"),
    ("FR-035", "Pilot", "KPI readings shall be recorded per period by the startup and by the pilot monitor, each attributed.", "Pilot Monitor", "M", "FUN", "Charter 4.6", "SDD 8.8", "workflow.test.mjs / KPI", "-", "Verified"),
    ("FR-036", "Pilot", "The platform shall compute attainment against each declared KPI, honouring the declared direction of improvement.", "System", "M", "FUN", "Charter 4.6", "SDD 8.8", "workflow.test.mjs / scorecard", "-", "Verified"),
    ("FR-037", "Pilot", "Only a pilot monitor or department head shall record the closure verdict of SUCCESS, PARTIAL or FAILED.", "Pilot Monitor", "M", "FUN", "Separation of duties", "SDD 9.2", "workflow.test.mjs / verdict", "SOD", "Verified"),
    ("FR-038", "Pilot", "A failed pilot shall close with structured feedback and shall place no bar on future applications by that startup.", "System", "M", "FUN", "Charter 3.2", "SDD 8.8", "Manual - pilot closure", "-", "Verified"),
    ("FR-039", "Procurement", "A procurement shall not be drafted against a pilot that has no recorded SUCCESS or PARTIAL verdict.", "System", "M", "FUN", "Evidence gate", "SDD 8.10", "workflow.test.mjs / evidence gate", "AUDIT-DEFENSIBLE", "Verified"),
    ("FR-040", "Procurement", "Every procurement shall name its mode and the General Financial Rules provision it rests on.", "Procurement Officer", "M", "CMP", "GFR 2017", "SDD 8.10", "workflow.test.mjs / GFR rule", "GFR-MODE", "Verified"),
    ("FR-041", "Procurement", "A written justification of at least fifty characters shall be mandatory and shall be written to the audit record.", "Procurement Officer", "M", "CMP", "Audit requirement", "SDD 8.10", "workflow.test.mjs / procurement", "AUDIT", "Verified"),
    ("FR-042", "Procurement", "Only a department head shall sanction a procurement; a procurement officer may prepare but not sanction.", "Department Head", "M", "SEC", "Separation of duties", "SDD 9.2", "workflow.test.mjs / sanction authority", "SOD", "Verified"),
    ("FR-043", "Procurement", "Issue of a purchase order shall generate a purchase order number and raise an advance payment.", "Procurement Officer", "M", "FUN", "Charter 4.7", "SDD 8.10", "workflow.test.mjs / PO", "-", "Verified"),
    ("FR-044", "Procurement", "A payment release shall record a PFMS transaction reference.", "Procurement Officer", "M", "INT", "PFMS integration", "SDD 8.9", "Manual - Procurement detail", "-", "Developed"),
    ("FR-045", "Catalogue", "A live or completed contract shall be listable on the Proven Solutions Registry with the measured pilot KPIs attached.", "Procurement Officer", "M", "FUN", "Charter 4.8", "SDD 8.11", "workflow.test.mjs / listing", "-", "Verified"),
    ("FR-046", "Catalogue", "Any department shall be able to draw down a listed solution against its rate contract without repeating discovery, evaluation or pilot.", "Nodal Officer", "M", "FUN", "Charter 3.3", "SDD 8.11", "workflow.test.mjs / adoption", "GFR-145", "Verified"),
    ("FR-047", "Catalogue", "A listing shall refuse adoption once its rate contract validity has lapsed.", "System", "M", "FUN", "Financial control", "SDD 8.11", "Manual - Catalogue", "-", "Verified"),
    ("FR-048", "Grievance", "Any user shall raise a grievance under a declared category and receive a fifteen-day resolution SLA.", "Startup", "M", "FUN", "Natural justice", "SDD 8.12", "Manual - Grievances", "-", "Verified"),
    ("FR-049", "Grievance", "A grievance resolution shall be recorded in writing and be visible to the person who raised it.", "Department Head", "M", "FUN", "Natural justice", "SDD 8.12", "Manual - Grievances", "AUDIT", "Verified"),
    ("FR-050", "Reporting", "The platform shall publish, without authentication, a conversion funnel, cycle-time medians, sector distribution, department activity and payment SLA performance.", "Public", "M", "RPT", "Transparency", "SDD 8.5", "workflow.test.mjs / public board", "TRANSPARENCY", "Verified"),
    ("FR-051", "Reporting", "Cycle time shall be measured from the transactional tables, not from a separately maintained reporting copy.", "Public", "S", "RPT", "Transparency", "SDD 8.5", "GET /dashboard/public", "TRANSPARENCY", "Verified"),
    ("FR-052", "Notification", "The platform shall notify a user in-app on every state change that affects a record they own or oversee.", "All", "S", "FUN", "Charter 4.9", "SDD 8.6", "Manual - notification panel", "-", "Verified"),
]

SECURITY = [
    ("SR-001", "AuthN", "Passwords shall be stored only as bcrypt hashes with a per-password salt and shall never be returned by any endpoint.", "System", "M", "SEC", "OWASP ASVS 2.4", "SDD 9.1", "Code review - auth.js", "-", "Verified"),
    ("SR-002", "AuthN", "Sessions shall use a signed JSON Web Token with an expiry of not more than eight hours.", "System", "M", "SEC", "OWASP ASVS 3.3", "SDD 9.1", "Code review - auth.js", "-", "Verified"),
    ("SR-003", "AuthN", "Every authenticated request shall reload the user record so that a suspended account fails immediately rather than at token expiry.", "System", "M", "SEC", "OWASP ASVS 3.3", "SDD 9.1", "Code review - authenticate()", "-", "Verified"),
    ("SR-004", "AuthZ", "Role authorisation shall be enforced server-side on every route; client-side navigation shall not be relied upon as a control.", "System", "M", "SEC", "OWASP ASVS 4.1", "SDD 9.2", "workflow.test.mjs / cross-role", "-", "Verified"),
    ("SR-005", "AuthZ", "Row-level ownership shall be checked on every read and write of a challenge, application, pilot, procurement or payment.", "System", "M", "SEC", "OWASP ASVS 4.2", "SDD 9.2", "workflow.test.mjs / cross-role", "-", "Verified"),
    ("SR-006", "Input", "Every request body shall be parsed and coerced by a schema at the route boundary; a failure shall return field-level errors.", "System", "M", "SEC", "OWASP ASVS 5.1", "SDD 9.5", "workflow.test.mjs / no-KPI", "-", "Verified"),
    ("SR-007", "Injection", "All database access shall use parameterised statements; no user input shall be concatenated into SQL.", "System", "M", "SEC", "OWASP ASVS 5.3", "SDD 9.5", "Code review - db/index.js", "-", "Verified"),
    ("SR-008", "XSS", "The client shall not use raw HTML injection anywhere; all interpolation shall pass through framework escaping.", "System", "M", "SEC", "OWASP ASVS 5.3", "SDD 9.5", "Code review - grep dangerouslySetInnerHTML", "-", "Verified"),
    ("SR-009", "Audit", "Every state change shall append an entry to a hash-chained, append-only audit log recording actor, role, action, entity and payload.", "System", "M", "SEC", "CAG audit readiness", "SDD 9.6", "workflow.test.mjs / chain", "AUDIT", "Verified"),
    ("SR-010", "Audit", "The platform shall provide an integrity check that walks the whole chain and reports the first entry where verification fails.", "Admin", "M", "SEC", "CAG audit readiness", "SDD 9.6", "workflow.test.mjs / chain", "AUDIT", "Verified"),
    ("SR-011", "Audit", "Audit entries shall be retained for at least one hundred and eighty days.", "System", "M", "CMP", "CERT-In Directions 2022", "SDD 9.6", "Config - AUDIT_RETENTION_DAYS", "CERTIN-LOG", "Verified"),
    ("SR-012", "Privacy", "Financial and identity fields of a startup shall be withheld from unauthenticated callers and from other startups.", "System", "M", "SEC", "DPDP Act 2023 s.8", "SDD 9.3", "Code review - registry.js", "DPDP-MINIMISE", "Verified"),
    ("SR-013", "Privacy", "Personal data shall be collected only for the declared purpose of public procurement participation.", "System", "M", "CMP", "DPDP Act 2023 s.4", "SDD 9.4", "AVSAR-DPD-009", "DPDP-PURPOSE", "Verified"),
    ("SR-014", "Secrets", "No credential, token or signing secret shall be committed to the repository; all shall be read from the environment.", "System", "M", "SEC", "OWASP ASVS 6.4", "SDD 9.1", "Code review - .gitignore, config.js", "-", "Verified"),
    ("SR-015", "Errors", "A server error shall not disclose a stack trace or internal detail to the client outside development.", "System", "M", "SEC", "OWASP ASVS 7.4", "SDD 9.5", "Code review - error.js", "-", "Verified"),
    ("SR-016", "Transport", "All production traffic shall be served over TLS 1.2 or above.", "System", "M", "SEC", "CERT-In Directions 2022", "SDD 11.2", "Deployment control - not in scope of demo", "CERTIN-TLS", "Approved"),
    ("SR-017", "Testing", "A vulnerability assessment and penetration test by a CERT-In empanelled auditor shall precede any live deployment.", "System", "M", "CMP", "CERT-In Directions 2022", "SDD 11.2", "Pre-deployment gate", "CERTIN-VAPT", "Approved"),
]

NFR = [
    ("NF-001", "Performance", "A list view shall return within 300 ms at the demonstration data volume.", "All", "S", "NFR", "Usability", "SDD 10.1", "Manual - network panel", "-", "Verified"),
    ("NF-002", "Performance", "The production client bundle shall be split so that charting code does not block first paint.", "All", "S", "NFR", "Usability", "SDD 10.1", "Build output - three chunks", "-", "Verified"),
    ("NF-003", "Portability", "The platform shall install and run with no natively compiled dependency.", "All", "M", "NFR", "Deployability", "SDD 10.2", "npm install on a clean machine", "-", "Verified"),
    ("NF-004", "Portability", "The database schema shall be portable SQL so that a move to PostgreSQL requires no query rewriting.", "All", "M", "NFR", "Deployability", "SDD 10.2", "Code review - schema.sql", "-", "Verified"),
    ("NF-005", "Accessibility", "The interface shall provide semantic landmarks, a skip link and a visible focus indicator that is never suppressed.", "All", "M", "NFR", "GIGW 3.0 / WCAG 2.1 AA", "SDD 10.3", "Manual - keyboard traversal", "GIGW", "Verified"),
    ("NF-006", "Accessibility", "No information shall be conveyed by colour alone; every status indicator shall carry a text label.", "All", "M", "NFR", "WCAG 2.1 AA 1.4.1", "SDD 10.3", "Code review - status.js", "GIGW", "Verified"),
    ("NF-007", "Accessibility", "The interface shall honour a reduced-motion preference.", "All", "S", "NFR", "WCAG 2.1 AA 2.3.3", "SDD 10.3", "Code review - base.css", "GIGW", "Verified"),
    ("NF-008", "Accessibility", "A third-party GIGW 3.0 conformance audit shall precede any live deployment.", "All", "S", "CMP", "GIGW 3.0", "SDD 11.2", "Pre-deployment gate", "GIGW", "Approved"),
    ("NF-009", "Maintainability", "Every legal state transition shall be declared in one module rather than distributed through route handlers.", "All", "M", "NFR", "Reviewability", "SDD 8.13", "Code review - workflow.js", "-", "Verified"),
    ("NF-010", "Maintainability", "Every statutory limit shall be declared once, in one module, beside the rule it derives from.", "All", "M", "NFR", "Reviewability", "SDD 8.13", "Code review - config.js POLICY", "-", "Verified"),
    ("NF-011", "Maintainability", "The visual layer shall derive from a single token file so the platform re-themes without component changes.", "All", "S", "NFR", "Reusability", "SDD 10.4", "Code review - tokens.css", "-", "Verified"),
    ("NF-012", "Reliability", "A render failure in any page shall present a readable message and a route back, never a blank screen.", "All", "S", "NFR", "Usability", "SDD 10.5", "Code review - ErrorBoundary.jsx", "-", "Verified"),
    ("NF-013", "Reliability", "Multi-row writes shall be transactional so that a partial failure leaves no orphaned record.", "System", "M", "NFR", "Data integrity", "SDD 7.4", "Code review - tx()", "-", "Verified"),
    ("NF-014", "Testability", "An end-to-end suite shall exercise every stage gate against a live API on a throwaway database.", "All", "M", "NFR", "Quality gate", "SDD 12.1", "npm test - 32 assertions", "-", "Verified"),
    ("NF-015", "Observability", "The API shall expose a health endpoint reporting service version, environment and database seeding state.", "Admin", "S", "NFR", "Operability", "SDD 10.6", "GET /api/health", "-", "Verified"),
    ("NF-016", "Localisation", "Content shall be separable from components so a Hindi interface can be added without structural change.", "All", "C", "NFR", "GIGW 3.0", "SDD 10.7", "Deferred to phase 2", "GIGW", "Approved"),
    ("NF-017", "Interoperability", "Integration points for GeM, PFMS and CPPP shall be isolated behind named fields so a live adapter replaces a stub.", "System", "S", "INT", "Charter 6.2", "SDD 11.1", "Code review - procurements schema", "-", "Developed"),
]

ROLE_REF = [
    ("Startup", "Founder or authorised signatory of a DPIIT-recognised entity", "Own applications, pilots, contracts and payments"),
    ("Nodal Officer", "Drafts problem statements, assigns the committee, shortlists, creates pilots", "Own department; cannot approve own publication"),
    ("Department Head", "Approves publication, sanctions procurement, records pilot verdicts", "Own department plus approval authority"),
    ("Evaluator", "Scores assigned applications against the published rubric", "Assigned applications only, blind until submission"),
    ("Pilot Monitor", "Reviews milestone evidence, verifies KPI readings, records the verdict", "Pilots in own department"),
    ("Procurement Officer", "Drafts procurement, issues purchase orders, releases payments", "Procurement and payments in own department"),
    ("Platform Admin", "Manages accounts, verifies KYC, verifies audit-chain integrity", "Platform-wide; cannot score, approve or sanction"),
    ("Public", "Unauthenticated reader", "Everything published; nothing in draft"),
]


def build(path):
    wb = new_workbook()

    cover_sheet(
        wb, "rtm",
        "Bidirectional traceability between the outcomes stated in the Project Charter, the "
        "requirements they generate, the design sections that satisfy them and the tests that "
        "verify them. A requirement with no design reference or no test reference is an open gap "
        "and is visible as such on the Summary tab.",
        [("1.0", "03 Sep 2026", "TandSol", "Baseline for the Smart India Hackathon submission. "
          "52 functional, 17 security and 17 non-functional requirements captured from the Charter "
          "and traced to the Software Design Document and the end-to-end test suite.")],
    )

    legend_sheet(wb, [
        ("Priority - MoSCoW", [
            ("M", "Must have. The mechanism does not function without it."),
            ("S", "Should have. Materially degrades the mechanism if absent."),
            ("C", "Could have. Desirable, deferred without loss of function."),
            ("W", "Will not have this release. Recorded so the decision is explicit."),
        ]),
        ("Requirement type", [
            ("FUN", "Functional behaviour of the mechanism"),
            ("SEC", "Security control"),
            ("CMP", "Statutory or regulatory compliance obligation"),
            ("NFR", "Quality attribute: performance, accessibility, maintainability"),
            ("INT", "Integration with an external government system"),
            ("RPT", "Reporting or transparency output"),
        ]),
        ("Status lifecycle", [
            ("Proposed", "Captured, not yet agreed"),
            ("Approved", "Agreed and in scope; not yet designed"),
            ("In Design", "Design section being written"),
            ("Developed", "Implemented, not yet tested"),
            ("Tested", "Test executed, result not yet reviewed"),
            ("Verified", "Test executed and result reviewed against the requirement"),
        ]),
        ("Compliance tags", [
            ("GFR-173", "GFR 2017 Rule 173(i) - relaxation of prior turnover and prior experience"),
            ("GFR-145", "GFR 2017 Rule 145 - rate contract"),
            ("GFR-MODE", "GFR 2017 Rules 145 / 149 / 162 / 166 - modes of procurement"),
            ("MSMED-45", "MSMED Act 2006 section 15 - payment within forty-five days"),
            ("DPDP-CONSENT", "DPDP Act 2023 - notice and consent at collection"),
            ("DPDP-PURPOSE", "DPDP Act 2023 section 4 - purpose limitation"),
            ("DPDP-MINIMISE", "DPDP Act 2023 - data minimisation in disclosure"),
            ("DPDP-DPA", "DPDP Act 2023 - data processing agreement with a processor"),
            ("CERTIN-LOG", "CERT-In Directions 2022 - 180-day log retention in India"),
            ("CERTIN-TLS", "CERT-In Directions 2022 - transport security"),
            ("CERTIN-VAPT", "CERT-In Directions 2022 - assessment by an empanelled auditor"),
            ("GIGW", "GIGW 3.0 and WCAG 2.1 level AA"),
            ("SOD", "Separation of duties control"),
            ("AUDIT", "Written to the tamper-evident audit record"),
            ("AUDIT-DEFENSIBLE", "Produces an explanation a public auditor can follow"),
            ("TRANSPARENCY", "Published without authentication"),
        ]),
        ("Deprecated requirements", [
            ("Convention", "A withdrawn requirement keeps its row and its ID. The description is "
                            "prefixed [DEPRECATED - reason] so historical traceability is never broken "
                            "by renumbering."),
        ]),
    ])

    statuses = ["Proposed", "Approved", "In Design", "Developed", "Tested", "Verified"]

    for name, rows in [("Functional RTM", FUNCTIONAL), ("Security RTM", SECURITY), ("NFR RTM", NFR)]:
        ws = wb.create_sheet(name)
        write_table(ws, HEADERS, rows, widths=WIDTHS, wrap_cols=WRAP)
        add_status_validation(ws, "K", 2, len(rows) + 1, statuses)

    ws = wb.create_sheet("Role Ref")
    write_table(ws, ["Role", "Who they are", "Scope of visibility"], ROLE_REF,
                widths=[24, 62, 62], wrap_cols=(2, 3))

    n_f, n_s, n_n = len(FUNCTIONAL), len(SECURITY), len(NFR)
    total = f"({n_f}+{n_s}+{n_n})"
    verified = (f"COUNTIF('Functional RTM'!K2:K{n_f + 1},\"Verified\")"
                f"+COUNTIF('Security RTM'!K2:K{n_s + 1},\"Verified\")"
                f"+COUNTIF('NFR RTM'!K2:K{n_n + 1},\"Verified\")")

    summary_sheet(wb, "Requirements traceability - summary", [
        ("Functional requirements", f"=COUNTA('Functional RTM'!A2:A{n_f + 1})", "Count of rows on the Functional RTM tab"),
        ("Security requirements", f"=COUNTA('Security RTM'!A2:A{n_s + 1})", "Count of rows on the Security RTM tab"),
        ("Non-functional requirements", f"=COUNTA('NFR RTM'!A2:A{n_n + 1})", "Count of rows on the NFR RTM tab"),
        ("Total requirements", f"=COUNTA('Functional RTM'!A2:A{n_f + 1})+COUNTA('Security RTM'!A2:A{n_s + 1})+COUNTA('NFR RTM'!A2:A{n_n + 1})", "Sum of the three requirement tabs"),
        ("Must-have requirements", f"=COUNTIF('Functional RTM'!E2:E{n_f + 1},\"M\")+COUNTIF('Security RTM'!E2:E{n_s + 1},\"M\")+COUNTIF('NFR RTM'!E2:E{n_n + 1},\"M\")", "MoSCoW priority M across all tabs"),
        ("Verified", f"={verified}", "Test executed and result reviewed"),
        ("Verified share", f"=ROUND(({verified})/{total},3)", "Format as a percentage; the headline completion figure"),
        ("Developed but not verified", f"=COUNTIF('Functional RTM'!K2:K{n_f + 1},\"Developed\")+COUNTIF('Security RTM'!K2:K{n_s + 1},\"Developed\")+COUNTIF('NFR RTM'!K2:K{n_n + 1},\"Developed\")", "Implemented, awaiting a verification pass"),
        ("Approved but not yet built", f"=COUNTIF('Functional RTM'!K2:K{n_f + 1},\"Approved\")+COUNTIF('Security RTM'!K2:K{n_s + 1},\"Approved\")+COUNTIF('NFR RTM'!K2:K{n_n + 1},\"Approved\")", "In scope, deferred to a deployment phase"),
        ("Compliance-tagged requirements", f"=COUNTA('Functional RTM'!J2:J{n_f + 1})+COUNTA('Security RTM'!J2:J{n_s + 1})+COUNTA('NFR RTM'!J2:J{n_n + 1})-COUNTIF('Functional RTM'!J2:J{n_f + 1},\"-\")-COUNTIF('Security RTM'!J2:J{n_s + 1},\"-\")-COUNTIF('NFR RTM'!J2:J{n_n + 1},\"-\")", "Rows carrying a statutory or standards tag"),
        ("Requirements missing a design reference", f"=COUNTIF('Functional RTM'!H2:H{n_f + 1},\"\")+COUNTIF('Security RTM'!H2:H{n_s + 1},\"\")+COUNTIF('NFR RTM'!H2:H{n_n + 1},\"\")", "Must be zero for the chain to be complete"),
        ("Requirements missing a test reference", f"=COUNTIF('Functional RTM'!I2:I{n_f + 1},\"\")+COUNTIF('Security RTM'!I2:I{n_s + 1},\"\")+COUNTIF('NFR RTM'!I2:I{n_n + 1},\"\")", "Must be zero for the chain to be complete"),
    ], note="All figures are live formulas over the requirement tabs. Editing a Status cell updates "
            "this tab; nothing here is a typed number.")

    wb.save(path)
    return path
