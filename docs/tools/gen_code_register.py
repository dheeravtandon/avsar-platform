"""AVSAR-CDR-006 - Code Register.

One row per source file, carrying the RTM requirement IDs it satisfies and the
Software Design Document section that specifies it. Check this register before
opening source files, and update it in the same turn as any file create or edit.
"""

from common import cover_sheet, legend_sheet, new_workbook, summary_sheet, write_table

HEADERS = ["File Path", "Layer", "Purpose", "Route / Policy", "Key SQL Tables",
           "RTM Req ID", "Design Ref", "Status"]
WIDTHS = [42, 14, 72, 34, 34, 30, 12, 12]
WRAP = (3, 4, 5, 6)

ROWS = [
    # ------------------------------------------------------------- root
    ("package.json", "Build", "Workspace root: npm workspaces for server and client, dev/seed/build/test scripts.", "npm run dev | seed | build | test", "-", "NF-003", "SDD 6.1", "Complete"),
    ("client/vite.config.js", "Build", "Vite config: React plugin, /api dev proxy so no host is compiled into the bundle, three-way manual chunking.", "Dev proxy /api to API_PORT", "-", "NF-002, NF-003", "SDD 10.1", "Complete"),
    ("client/index.html", "Client", "Document shell: metadata, theme colour, font preconnect, root mount point, noscript notice.", "-", "-", "NF-005", "SDD 10.3", "Complete"),
    (".claude/launch.json", "Build", "Dev-server launch definition used by the preview tooling.", "Port 5173", "-", "-", "SDD 6.1", "Complete"),

    # ----------------------------------------------------------- server
    ("server/src/index.js", "API", "Express bootstrap: CORS, JSON body limit, request log, health endpoint, mounts eleven route modules, error handlers last.", "GET /api/health", "users", "NF-015", "SDD 6.2", "Complete"),
    ("server/src/config.js", "Config", "Environment configuration and the POLICY block: every statutory limit declared once with the rule it derives from.", "-", "-", "NF-010, FR-002", "SDD 8.13", "Complete"),
    ("server/src/db/schema.sql", "Data", "Seventeen tables in portable SQL with foreign keys, unique constraints and indexes.", "-", "all", "NF-004, FR-018", "SDD 7", "Complete"),
    ("server/src/db/index.js", "Data", "node:sqlite connection, WAL mode, foreign keys on, query helpers, insert/update builders, transaction wrapper, bind normalisation.", "-", "all", "NF-003, NF-013, SR-007", "SDD 7.4", "Complete"),
    ("server/src/db/seed.js", "Data", "Deterministic demo dataset: 7 departments, 32 users, 12 startups, 8 problem statements, 13 applications, 19 evaluations, 2 pilots, 1 contract, 1 listing.", "npm run seed", "all", "-", "SDD 12.2", "Complete"),

    ("server/src/middleware/auth.js", "Security", "JWT signing and verification, per-request user reload, role authorisation, optional auth for public routes, current-startup resolution.", "authenticate | authorize | softAuthenticate", "users, startups", "SR-001, SR-002, SR-003, SR-004", "SDD 9.1", "Complete"),
    ("server/src/middleware/error.js", "API", "Zod errors to HTTP 422 with field paths, async handler wrapper, internal detail suppressed outside development.", "notFound | errorHandler", "-", "SR-006, SR-015", "SDD 9.5", "Complete"),

    ("server/src/services/workflow.js", "Domain", "The canonical lifecycle: five stages plus every legal transition for challenges, applications, pilots and procurements, declared in one file.", "assertTransition", "-", "NF-009, FR-009", "SDD 8.13", "Complete"),
    ("server/src/services/eligibility.js", "Domain", "Statutory eligibility gate and the challenge fit gate. Each check returns code, label, authority, required, pass and detail so a rejection is always explainable.", "checkEligibility | checkChallengeFit", "startups, challenges", "FR-002, FR-019, FR-020", "SDD 8.2", "Complete"),
    ("server/src/services/matching.js", "Domain", "Explainable weighted discovery score: sector 30, capability 30, readiness 20, track record 10, geography 10, with a reason per factor.", "scoreMatch | rankStartups", "startups, challenges", "FR-014, FR-015, FR-016", "SDD 8.7", "Complete"),
    ("server/src/services/scoring.js", "Domain", "Two-envelope evaluation: bucket caps 70/30, qualifying technical threshold, committee consensus and dispersion flag.", "computeTotal | consensus", "evaluation_criteria, evaluations", "FR-025, FR-026, FR-028", "SDD 8.3", "Complete"),
    ("server/src/services/audit.js", "Security", "Append-only hash-chained audit log and full-chain verification.", "record | verifyChain", "audit_log", "SR-009, SR-010, SR-011", "SDD 9.6", "Complete"),
    ("server/src/services/ids.js", "Domain", "Government file numbering: AVS/<type>/<year>/<sequence>, sequence per table per calendar year.", "nextCode", "challenges, applications, pilots, procurements, catalogue, grievances", "FR-008", "SDD 8.4", "Complete"),
    ("server/src/services/notify.js", "Domain", "In-app notification create, list, mark-read.", "-", "notifications", "FR-052", "SDD 8.6", "Complete"),

    ("server/src/routes/auth.js", "API", "Sign-in with failed-attempt audit, startup self-registration running the eligibility gate inside a transaction, current-user profile, password change.", "POST /api/auth/login | /register/startup, GET /me, POST /password", "users, startups", "FR-001, FR-002, SR-001, SR-002", "SDD 8.1", "Complete"),
    ("server/src/routes/challenges.js", "API", "Problem statement list with role-scoped visibility and per-startup match score, detail with stage and audit timeline, create, edit, guarded transitions, reverse discovery scan.", "GET/POST /api/challenges, POST /:id/transition, GET /:id/discover", "challenges, departments, applications, startups", "FR-005 to FR-016", "SDD 8.1", "Complete"),
    ("server/src/routes/applications.js", "API", "Application list scoped by role, detail with committee scores and consensus, create, submit through both gates, withdraw, department transitions, committee assignment.", "GET/POST /api/applications, POST /:id/submit | /transition | /committee", "applications, challenges, startups, evaluations, pilots", "FR-017 to FR-022", "SDD 8.2", "Complete"),
    ("server/src/routes/evaluations.js", "API", "Published rubric, evaluator worklist blinded until submission, score submission with conflict-of-interest gate and immutability, comparative statement per problem statement.", "GET /api/evaluations/criteria | /mine, POST /:id/score", "evaluations, evaluation_criteria, applications", "FR-022 to FR-029, SR-024", "SDD 8.3", "Complete"),
    ("server/src/routes/pilots.js", "API", "Pilot list with milestone progress, detail with KPI scorecard and audit timeline, creation with ceiling and payout validation, DPDP-gated activation, milestone submit and review, KPI readings.", "GET/POST /api/pilots, POST /:id/transition | /milestones/:mid/submit | /review | /kpi", "pilots, milestones, kpi_readings, payments, applications", "FR-030 to FR-038", "SDD 8.8", "Complete"),
    ("server/src/routes/procurement.js", "API", "Procurement modes with their GFR provisions, evidence-gated creation, sanction-authority transitions, purchase order issue, payment release with PFMS reference, payment ledger with live SLA computation.", "GET/POST /api/procurement, POST /:id/transition, POST /payments/:id/pay, GET /payments/ledger", "procurements, pilots, payments, milestones", "FR-039 to FR-044, FR-034", "SDD 8.10", "Complete"),
    ("server/src/routes/catalogue.js", "API", "Proven Solutions Registry: public listing, detail with adoption history, listing from a live contract with measured KPIs attached, cross-department adoption with expiry check.", "GET /api/catalogue, POST / | /:id/adopt | /adoptions/:id/transition", "catalogue, adoptions, procurements, pilots, kpi_readings", "FR-045, FR-046, FR-047", "SDD 8.11", "Complete"),
    ("server/src/routes/dashboard.js", "API", "Public transparency board (funnel, conversion, sector, department, cycle-time medians, payment SLA) and role-aware personal dashboard.", "GET /api/dashboard/public | /me", "all", "FR-050, FR-051", "SDD 8.5", "Complete"),
    ("server/src/routes/registry.js", "API", "Startup registry search with privacy-scoped fields, startup profile with track record, self-service profile edit and eligibility recheck, department list, evaluator and monitor pools.", "GET /api/registry/startups | /:id | /departments | /evaluators | /monitors, PUT /startups/me", "startups, departments, users, pilots, procurements", "FR-003, FR-013, SR-012", "SDD 8.7", "Complete"),
    ("server/src/routes/meta.js", "API", "Single reference-data call: sectors, capability tags, states, TRL scale, roles, stages, every state machine, the policy block with statutory citations, match weights and the evaluation rubric.", "GET /api/meta", "evaluation_criteria", "FR-007, NF-010", "SDD 8.14", "Complete"),
    ("server/src/routes/misc.js", "API", "Notifications, grievances with SLA, audit trail with integrity report, administration of accounts and KYC.", "GET/POST /api/notifications | /grievances | /audit | /admin/*", "notifications, grievances, audit_log, users, startups", "FR-004, FR-048, FR-049, SR-010", "SDD 8.12", "Complete"),
    ("server/test/workflow.test.mjs", "Test", "End-to-end lifecycle suite: 32 assertions across all five stages plus cross-cutting controls, run against a live API on a throwaway database.", "npm test", "all", "NF-014", "SDD 12.1", "Complete"),

    # ----------------------------------------------------------- client
    ("client/src/main.jsx", "Client", "React root: router, auth provider, toast provider, error boundary, stylesheet order.", "-", "-", "NF-012", "SDD 10.5", "Complete"),
    ("client/src/App.jsx", "Client", "Route table: 8 public and 16 authenticated routes, with a role-aware route guard.", "24 routes", "-", "SR-004", "SDD 10.8", "Complete"),
    ("client/src/styles/tokens.css", "Client", "The whole design system: ink and paper scales, brand navy, Ashoka accent, saffron, semantic colours, type scale, 4px spacing scale, radius, elevation, layout constants.", "-", "-", "NF-011", "SDD 10.4", "Complete"),
    ("client/src/styles/base.css", "Client", "Reset, typography, focus-visible policy, skip link, screen-reader utility, reduced-motion block, layout utilities.", "-", "-", "NF-005, NF-007", "SDD 10.3", "Complete"),
    ("client/src/styles/components.css", "Client", "Component layer: shell, sidebar, topbar, cards, tiles, dense tables, chips, buttons, forms, stepper, timeline, modal, drawer, tabs, toasts, public site, auth split, print rules.", "-", "-", "NF-011", "SDD 10.4", "Complete"),
    ("client/src/lib/api.js", "Client", "Single fetch client with token handling and 401 recovery, typed error with field errors, and the endpoint map so no URL string lives in a component.", "62 endpoints", "-", "NF-009", "SDD 10.8", "Complete"),
    ("client/src/lib/auth.jsx", "Client", "Auth context: sign-in, startup registration, session restore, sign-out, and the role predicate hook used by every guard.", "-", "-", "SR-004", "SDD 10.8", "Complete"),
    ("client/src/lib/hooks.js", "Client", "useApi with cancellation and reload, debounce, document title, dismiss-on-escape-or-outside-click.", "-", "-", "NF-001", "SDD 10.8", "Complete"),
    ("client/src/lib/format.js", "Client", "Indian-numbering currency, tabular numbers, dates, relative time, initials, title case, truncation.", "-", "-", "-", "SDD 10.4", "Complete"),
    ("client/src/lib/status.js", "Client", "Status vocabulary: tone and label for every code, with context overrides where one code reads differently on different entities.", "-", "-", "NF-006", "SDD 10.4", "Complete"),
    ("client/src/components/AppShell.jsx", "Client", "Authenticated shell: role-derived navigation, breadcrumbs, notification panel with polling, account menu.", "-", "-", "SR-004, FR-052", "SDD 10.8", "Complete"),
    ("client/src/components/PublicShell.jsx", "Client", "Public shell: government strip, masthead, primary navigation, four-column footer with the compliance line.", "-", "-", "NF-005", "SDD 10.8", "Complete"),
    ("client/src/components/ui.jsx", "Client", "Shared primitives: Status, Card, Tile, PageHead, Notice, Empty, Bar, DL, Tabs, DataTable, Field, Input, Textarea, Select, CheckLine, TagPicker, Button, Modal, toasts, Loading, ErrorState.", "-", "-", "NF-006, NF-011", "SDD 10.4", "Complete"),
    ("client/src/components/Stepper.jsx", "Client", "The five-stage lifecycle indicator, shared by the public site and the workspace.", "-", "-", "FR-005", "SDD 8.13", "Complete"),
    ("client/src/components/Icons.jsx", "Client", "Hand-rolled 24px stroke icon set so the bundle carries no icon library.", "-", "-", "NF-002", "SDD 10.4", "Complete"),
    ("client/src/components/ErrorBoundary.jsx", "Client", "Catches a render failure and presents a readable message with a route back.", "-", "-", "NF-012", "SDD 10.5", "Complete"),

    ("client/src/pages/Landing.jsx", "Client", "Public landing: live statistics band, the five stages, the blocker-versus-mechanism table, audience panels, statutory basis.", "/", "-", "FR-011, FR-050", "SDD 10.9", "Complete"),
    ("client/src/pages/HowItWorks.jsx", "Client", "Reference page: five stages step by step with owner, duration, artefact and gate; roles and access; statutory instruments; scoring model; technology.", "/how-it-works", "-", "FR-005, FR-025", "SDD 10.9", "Complete"),
    ("client/src/pages/PublicDashboard.jsx", "Client", "Transparency board: headline tiles, conversion funnel, conversion rates, cycle time against benchmark, sector distribution, department activity, payment discipline, proven solutions.", "/dashboard", "-", "FR-050, FR-051", "SDD 8.5", "Complete"),
    ("client/src/pages/PublicChallenges.jsx", "Client", "Public problem statement list with filters, and the public detail view with KPIs, terms and eligibility notes.", "/challenges | /challenges/:id", "-", "FR-011, FR-012", "SDD 8.1", "Complete"),
    ("client/src/pages/PublicRegistry.jsx", "Client", "Public startup registry with sector, state, readiness and women-led filters.", "/registry", "-", "FR-013, SR-012", "SDD 8.7", "Complete"),
    ("client/src/pages/PublicSolutions.jsx", "Client", "Public Proven Solutions Registry with measured pilot KPIs and rate-contract validity.", "/solutions", "-", "FR-045", "SDD 8.11", "Complete"),
    ("client/src/pages/Login.jsx", "Client", "Sign-in with one-click demo roles and session-expiry notice.", "/login", "users", "SR-002", "SDD 8.1", "Complete"),
    ("client/src/pages/Register.jsx", "Client", "Four-step startup registration, ending in the itemised statutory gate verdict with relaxations.", "/register", "startups", "FR-001, FR-002", "SDD 8.1", "Complete"),
    ("client/src/pages/Dashboard.jsx", "Client", "Role-aware workspace home: tiles, and a distinct body for startup, evaluator and departmental users.", "/app", "-", "FR-052", "SDD 8.5", "Complete"),
    ("client/src/pages/Challenges.jsx", "Client", "Workspace problem statement list with department scoping and per-startup fit score.", "/app/challenges", "challenges", "FR-005, FR-014", "SDD 8.1", "Complete"),
    ("client/src/pages/ChallengeDetail.jsx", "Client", "Problem statement detail: stepper, brief, KPIs, applications, reverse discovery with per-factor explanation, audit trail, guarded transition actions.", "/app/challenges/:id", "challenges", "FR-009, FR-014, FR-015", "SDD 8.1", "Complete"),
    ("client/src/pages/ChallengeForm.jsx", "Client", "Problem statement authoring: outcome fields, repeatable KPI rows, commercial terms, IP and clearance.", "/app/challenges/new | /:id/edit", "challenges", "FR-005, FR-006, FR-007", "SDD 8.1", "Complete"),
    ("client/src/pages/Applications.jsx", "Client", "Application list scoped by role with a blocked-at-gate banner for startups.", "/app/applications", "applications", "FR-020", "SDD 8.2", "Complete"),
    ("client/src/pages/ApplicationDetail.jsx", "Client", "Application detail: proposal, itemised gate result with relaxations, committee scores and consensus, committee assignment, shortlist and pilot creation.", "/app/applications/:id", "applications", "FR-019 to FR-031", "SDD 8.2", "Complete"),
    ("client/src/pages/ApplyForm.jsx", "Client", "Application form with live ceiling, window and readiness validation against the published terms.", "/app/challenges/:id/apply", "applications", "FR-017, FR-019", "SDD 8.2", "Complete"),
    ("client/src/pages/Evaluations.jsx", "Client", "Evaluator worklist and the blinded score sheet with rubric sliders, live envelope totals, conflict-of-interest declaration and submission lock.", "/app/evaluations", "evaluations", "FR-023 to FR-027", "SDD 8.3", "Complete"),
    ("client/src/pages/Pilots.jsx", "Client", "Pilot list with milestone progress and verdicts.", "/app/pilots", "pilots", "FR-030", "SDD 8.8", "Complete"),
    ("client/src/pages/PilotDetail.jsx", "Client", "Pilot detail: KPI scorecard with target reference lines, milestones, payments with SLA, terms, audit trail, and every stage action from agreement to verdict to procurement.", "/app/pilots/:id", "pilots", "FR-032 to FR-039", "SDD 8.8", "Complete"),
    ("client/src/pages/Procurement.jsx", "Client", "Procurement list and detail: justification, mode with its GFR provision, payments with release, and listing on the registry.", "/app/procurement | /:id", "procurements", "FR-040 to FR-045", "SDD 8.10", "Complete"),
    ("client/src/pages/Catalogue.jsx", "Client", "Proven Solutions Registry inside the workspace, with cross-department adoption.", "/app/catalogue", "catalogue", "FR-046", "SDD 8.11", "Complete"),
    ("client/src/pages/Payments.jsx", "Client", "Payment ledger with the live 45-day statutory clock and a breach banner.", "/app/payments", "payments", "FR-034", "SDD 8.9", "Complete"),
    ("client/src/pages/Registry.jsx", "Client", "Departmental startup registry search with a full profile drawer and track record.", "/app/registry", "startups", "FR-013", "SDD 8.7", "Complete"),
    ("client/src/pages/Profile.jsx", "Client", "Startup self-service profile with an itemised eligibility panel and on-demand recheck.", "/app/profile", "startups", "FR-003", "SDD 8.1", "Complete"),
    ("client/src/pages/Grievances.jsx", "Client", "Grievance raise and resolve with SLA tracking.", "/app/grievances", "grievances", "FR-048, FR-049", "SDD 8.12", "Complete"),
    ("client/src/pages/Audit.jsx", "Client", "Audit trail viewer with chain integrity status, head hash and payload filter.", "/app/audit", "audit_log", "SR-009, SR-010", "SDD 9.6", "Complete"),
    ("client/src/pages/Admin.jsx", "Client", "Administration: accounts with suspend and reinstate, startup KYC, departments, audit re-verification.", "/app/admin", "users, startups, departments", "FR-004, SR-010", "SDD 8.12", "Complete"),
    ("client/src/pages/NotFound.jsx", "Client", "404 page pointing back to the file-number search route.", "*", "-", "-", "SDD 10.9", "Complete"),

    # ------------------------------------------------------------ docs
    ("docs/tools/common.py", "Docs", "Shared cover block, palette, table styling, legend and live-formula summary helpers for the document set.", "-", "-", "-", "SDD 13", "Complete"),
    ("docs/tools/generate_all.py", "Docs", "Regenerates all nine binary documents from source data in one command.", "python docs/tools/generate_all.py", "-", "-", "SDD 13", "Complete"),
]


def build(path):
    wb = new_workbook()

    cover_sheet(
        wb, "code",
        "One row per source file: what it is for, the route or policy it exposes, the tables it "
        "touches, the requirements it satisfies and the design section that specifies it. This "
        "register is the entry point to the codebase - consult it before opening source files, and "
        "update it in the same turn as any file create or modify.",
        [("1.0", "03 Sep 2026", "TandSol", "Baseline. Every source file in the repository registered "
          "and traced to the RTM and the Software Design Document.")],
        extra=[("Convention", "A deleted file keeps its row with Status set to Removed and the "
                              "commit that removed it noted, so historical traceability survives.")],
    )

    legend_sheet(wb, [
        ("Layer", [
            ("Build", "Toolchain, workspace and bundling configuration"),
            ("Config", "Environment and policy constants"),
            ("Data", "Schema, connection, query helpers, seed data"),
            ("Security", "Authentication, authorisation, audit"),
            ("Domain", "Business rules with no HTTP or SQL concerns"),
            ("API", "HTTP route modules"),
            ("Client", "Browser application"),
            ("Test", "Automated verification"),
            ("Docs", "Document generation"),
        ]),
        ("Status", [
            ("Planned", "Registered, not yet written"),
            ("In Progress", "Being written"),
            ("Complete", "Written and exercised by a test or a manual pass"),
            ("Removed", "Deleted; row retained for traceability"),
        ]),
        ("How to read the RTM Req ID column", [
            ("FR-nnn", "Functional requirement on the Functional RTM tab of AVSAR-RTM-004"),
            ("SR-nnn", "Security requirement on the Security RTM tab"),
            ("NF-nnn", "Non-functional requirement on the NFR RTM tab"),
            ("Ranges", "FR-030 to FR-038 means the file participates in every requirement in that span"),
        ]),
    ])

    ws = wb.create_sheet("Code Register")
    write_table(ws, HEADERS, ROWS, widths=WIDTHS, wrap_cols=WRAP)

    n = len(ROWS)
    last = n + 1
    summary_sheet(wb, "Code register - summary", [
        ("Files registered", f"=COUNTA('Code Register'!A2:A{last})", "Total rows on the register"),
        ("Complete", f"=COUNTIF('Code Register'!H2:H{last},\"Complete\")", "Written and exercised"),
        ("In progress", f"=COUNTIF('Code Register'!H2:H{last},\"In Progress\")", "Should be zero at a baseline"),
        ("Planned", f"=COUNTIF('Code Register'!H2:H{last},\"Planned\")", "Registered but not yet written"),
        ("Completion share", f"=ROUND(COUNTIF('Code Register'!H2:H{last},\"Complete\")/COUNTA('Code Register'!A2:A{last}),3)", "Format as a percentage"),
        ("Server-side files", f"=COUNTIF('Code Register'!A2:A{last},\"server/*\")", "Files under server/"),
        ("Client-side files", f"=COUNTIF('Code Register'!A2:A{last},\"client/*\")", "Files under client/"),
        ("API route modules", f"=COUNTIF('Code Register'!A2:A{last},\"server/src/routes/*\")", "One module per bounded area"),
        ("Domain service modules", f"=COUNTIF('Code Register'!A2:A{last},\"server/src/services/*\")", "Business rules isolated from HTTP and SQL"),
        ("Client page modules", f"=COUNTIF('Code Register'!A2:A{last},\"client/src/pages/*\")", "One module per route"),
        ("Files with no requirement traced", f"=COUNTIF('Code Register'!F2:F{last},\"-\")", "Acceptable only for formatting and glossary files"),
        ("Files with no design reference", f"=COUNTIF('Code Register'!G2:G{last},\"\")", "Must be zero"),
    ], note="Wildcard counts rely on the path convention in column A. If the directory layout "
            "changes, update these formulas in the same turn.")

    wb.save(path)
    return path
