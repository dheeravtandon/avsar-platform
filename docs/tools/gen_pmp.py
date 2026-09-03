"""AVSAR-PMP-003 - Project Management Plan."""

from docx_common import add_table, bullets, callout, cover, footer_note, new_document


def build(path):
    doc = new_document()
    footer_note(doc, "AVSAR-PMP-003 Project Management Plan v1.0 - Internal - Smart India Hackathon submission")

    cover(
        doc, "pmp",
        "How the AVSAR programme is planned, executed, controlled and closed",
        "This plan states how the work authorised by AVSAR-CHR-002 is actually run: the delivery "
        "approach, the schedule and its critical path, how scope changes are handled, how quality "
        "is assured, how risk is managed, who communicates what to whom, and what closure means. "
        "It is the operational counterpart to the Charter: the Charter says what and why, this "
        "document says how.",
        [["1.0", "03 Sep 2026", "TandSol", "Baseline for the Smart India Hackathon submission."]],
        approvals=[
            ["Sponsor", "Mission Director", "", ""],
            ["Project Manager", "TandSol", "", ""],
        ],
    )

    # ------------------------------------------------------------------ 1
    doc.add_heading("1. Delivery approach", level=1)
    doc.add_paragraph(
        "The programme is delivered in sixteen phases over fourteen weeks to submission, followed "
        "by two quarters of deployment readiness. Nine of the sixteen phases run in parallel, which "
        "is what allows a five-stage mechanism with seven roles to be built and tested inside a "
        "single quarter."
    )
    doc.add_paragraph("Three sequencing rules govern the plan:")
    bullets(doc, [
        ("Policy before design.", "The statutory basis is mapped and confirmed before any schema "
         "is written, because the eligibility gate and the procurement modes are the design. "
         "Getting the rule wrong invalidates everything downstream."),
        ("Workflow before features.", "Every legal state transition is declared and frozen before "
         "route handlers are written. A state machine discovered incrementally through handlers is "
         "a state machine nobody can review."),
        ("Design system before screens.", "The token and component layer is built alongside the API "
         "so that no screen is ever blocked on styling decisions, and so that thirty-one routes "
         "look like one product rather than twenty-four."),
    ])

    doc.add_heading("1.1 Work breakdown", level=2)
    add_table(doc, ["Level 1", "Level 2", "Phases"], [
        ["1 Policy and requirements", "Statutory mapping, Charter, RTM baseline", "P1, P2"],
        ["2 Architecture", "Data model, workflow state machines, design system", "P3, P4"],
        ["3 API construction", "Identity and challenge; evaluation and pilot; procurement and registry; audit and transparency", "P5, P6, P7, P8"],
        ["4 Client construction", "Public site; role workspaces", "P9, P10"],
        ["5 Data and verification", "Seed dataset, end-to-end suite, accessibility and security pass", "P11, P12, P14"],
        ["6 Documentation and submission", "Document set, demonstration, submission", "P13, P15"],
        ["7 Deployment readiness", "Live verification, single sign-on, PostgreSQL, integrations, VAPT, accessibility audit", "P16"],
    ], widths=[1.8, 3.3, 1.6])

    doc.add_heading("1.2 Critical path", level=2)
    doc.add_paragraph(
        "P1 policy mapping to P2 requirements to P3 data model and workflow to P5 identity and "
        "challenge API to P6 evaluation and pilot API to P12 end-to-end suite to P15 submission. "
        "The design-system and client phases run alongside the API and are not on the critical path; "
        "a one-week slip in either is absorbable, whereas a one-week slip in P3 or P6 moves the "
        "submission date."
    )
    callout(doc, "Schedule detail:",
            "Phase dates, durations, owners, sequential or parallel mode, and a week-level Gantt are "
            "maintained in AVSAR-TML-008. That workbook is the schedule of record; this section "
            "states the approach, not the dates.")

    # ------------------------------------------------------------------ 2
    doc.add_heading("2. Scope management", level=1)
    doc.add_paragraph(
        "Scope is defined in AVSAR-CHR-002 section 4 and decomposed into requirements in "
        "AVSAR-RTM-004. No work is undertaken that does not trace to a requirement, and no "
        "requirement is admitted that does not trace to a Charter objective."
    )
    doc.add_heading("2.1 Change control", level=2)
    add_table(doc, ["Step", "Action", "Owner"], [
        ["1", "Raise the change against the affected requirement ID, stating the objective it serves", "Requester"],
        ["2", "Assess the effect on the critical path, the RTM and the Risk Register", "Project Manager"],
        ["3", "Decide: accept, defer to a later phase, or reject with the reason recorded", "Sponsor for a scope change; Project Manager within scope"],
        ["4", "Update AVSAR-RTM-004 with the new or amended row in the same turn as the decision", "Project Manager"],
        ["5", "Version-increment every affected document with a dated revision note", "Project Manager"],
    ], widths=[0.5, 4.3, 1.9])
    callose = (
        "A withdrawn requirement keeps its row and its ID in the RTM. The description is prefixed "
        "[DEPRECATED - reason] rather than deleted, so historical traceability is never broken by "
        "renumbering."
    )
    callout(doc, "Deprecation convention:", callose)

    # ------------------------------------------------------------------ 3
    doc.add_heading("3. Quality management", level=1)
    doc.add_heading("3.1 Definition of done", level=2)
    doc.add_paragraph("A unit of work is complete only when all five hold:")
    add_table(doc, ["#", "Gate", "Evidence"], [
        ["1", "It parses, imports resolve, no undefined references", "Production build completes with no error"],
        ["2", "Happy path and at least one edge case behave correctly", "An assertion in the end-to-end suite, or a recorded manual pass"],
        ["3", "No injection, no cross-site scripting, parameterised SQL, secrets in the environment", "Security RTM row moved to Verified"],
        ["4", "Web-visible behaviour confirmed in a running application", "Screen exercised against a live API, not only against a test"],
        ["5", "Code Register and RTM updated in the same turn as the change", "AVSAR-CDR-006 row present; RTM status advanced"],
    ], widths=[0.4, 2.8, 3.5])

    doc.add_heading("3.2 Verification approach", level=2)
    add_table(doc, ["Layer", "Method", "Coverage"], [
        ["Statutory rules", "Assertion against each gate with both a passing and a failing case", "Eligibility, fit, ceiling, payout total, DPDP precondition, evidence gate"],
        ["Workflow", "Assertion that a legal transition succeeds and an illegal one returns 409", "All four state machines"],
        ["Authorisation", "Cross-role assertion that a forbidden call returns 403", "Publication authority, sanction authority, cross-department reads"],
        ["Integrity", "Full-chain audit verification after a complete lifecycle run", "Every state change written during the run"],
        ["Client", "Manual pass per role against a live API", "All thirty-one routes"],
        ["Build", "Production build as a compile check across every module", "872 modules"],
        ["Accessibility", "Keyboard traversal, contrast check, screen-reader review", "Public site and all seven workspaces"],
    ], widths=[1.2, 2.6, 2.9])
    doc.add_paragraph(
        "The end-to-end suite is the primary quality gate. It runs against a live API on a "
        "throwaway database and walks one problem statement through all five stages, asserting "
        "thirty-two conditions including every refusal the mechanism depends on. A change that "
        "breaks a gate breaks the suite."
    )

    doc.add_heading("3.3 Quality metrics", level=2)
    add_table(doc, ["Metric", "Target", "Actual at baseline"], [
        ["End-to-end assertions passing", "100%", "32 of 32"],
        ["Requirements verified", "At least 85%", "See AVSAR-RTM-004 Summary"],
        ["Files registered in the Code Register", "100%", "See AVSAR-CDR-006 Summary"],
        ["Production build errors", "Zero", "Zero"],
        ["Natively compiled dependencies", "Zero", "Zero"],
        ["Chunks above 500 kB after minification", "Zero", "Zero"],
        ["High-severity risks without a dated mitigation", "Zero", "See AVSAR-RSK-007 Summary"],
        ["Compliance obligations with no evidence recorded", "Zero", "See AVSAR-DPD-009 Summary"],
    ], widths=[3.0, 1.6, 2.1])

    # ------------------------------------------------------------------ 4
    doc.add_heading("4. Risk management", level=1)
    doc.add_paragraph(
        "Risks are recorded in AVSAR-RSK-007, scored as likelihood multiplied by impact on a "
        "one-to-five scale, and banded High at fifteen or above, Medium from eight to fourteen, and "
        "Low from one to seven. Score and severity are spreadsheet formulas, so re-scoring a risk "
        "reclassifies it automatically and the register cannot drift out of agreement with itself."
    )
    add_table(doc, ["Severity", "Review cadence", "Escalation"], [
        ["High", "Weekly", "Sponsor, with a dated mitigation and a named owner"],
        ["Medium", "Fortnightly", "Project Manager"],
        ["Low", "At each phase gate", "Monitored on the register"],
    ], widths=[1.1, 1.9, 3.7])
    doc.add_paragraph(
        "A mitigation must name the control that addresses the risk, not an intention to address it. "
        "On this register, for example, the mitigation for an undeclared conflict of interest is the "
        "precondition the API enforces before accepting a score - not a statement that evaluators "
        "will be reminded to declare."
    )

    # ------------------------------------------------------------------ 5
    doc.add_heading("5. Communication plan", level=1)
    add_table(doc, ["Audience", "What", "Format", "Cadence"], [
        ["Sponsor", "Progress against milestones, high risks, decisions needed", "One-page note plus the transparency board", "Fortnightly"],
        ["Nodal officers", "New capability affecting authoring or shortlisting", "Release note and a short walkthrough", "On release"],
        ["Startups", "State change on a record they own", "In-app notification", "Immediate"],
        ["Evaluators", "Assignment and reconciliation requirement", "In-app notification", "Immediate"],
        ["Delivery team", "Priorities, blockers, review of the definition of done", "Stand-up", "Daily"],
        ["Delivery team", "Phase gate: RTM status, register updates, risk re-score", "Phase review", "At each phase boundary"],
        ["Audit and oversight", "Decision record for any transaction", "Audit trail, self-service", "On demand"],
        ["Public", "Funnel, cycle time, payment discipline, proven solutions", "Public transparency board", "Continuous"],
    ], widths=[1.3, 2.4, 1.9, 1.1])

    # ------------------------------------------------------------------ 6
    doc.add_heading("6. Resource plan", level=1)
    add_table(doc, ["Role", "Responsibility", "Allocation"], [
        ["Project Manager", "Schedule, change control, document set, phase gates", "Full time"],
        ["Policy Lead", "Statutory mapping, procurement modes, relaxation logic", "Phases P1 to P3, then advisory"],
        ["Solution Architect", "Data model, workflow state machines, service boundaries", "Phases P3 to P8"],
        ["Backend Engineer", "API, domain services, audit, seed data", "Phases P5 to P11"],
        ["Frontend Engineer", "Design system implementation, public site, role workspaces", "Phases P4, P9, P10"],
        ["Design Lead", "Token layer, component patterns, accessibility policy", "Phase P4, then advisory"],
        ["QA Lead", "End-to-end suite, accessibility and security pass", "Phases P12, P14"],
    ], widths=[1.5, 3.5, 1.7])

    doc.add_heading("6.1 Responsibility assignment", level=2)
    doc.add_paragraph("R responsible, A accountable, C consulted, I informed.")
    add_table(doc, ["Activity", "PM", "Policy", "Architect", "Backend", "Frontend", "QA", "Sponsor"], [
        ["Statutory mapping", "A", "R", "C", "I", "I", "I", "I"],
        ["RTM baseline", "R", "C", "C", "C", "C", "C", "A"],
        ["Data model and workflow", "A", "C", "R", "C", "I", "C", "I"],
        ["Design system", "I", "I", "C", "I", "R", "I", "I"],
        ["API construction", "A", "C", "C", "R", "I", "C", "I"],
        ["Client construction", "A", "I", "C", "C", "R", "C", "I"],
        ["End-to-end suite", "A", "I", "C", "C", "C", "R", "I"],
        ["Document set", "R", "C", "C", "C", "C", "C", "A"],
        ["Scope change decision", "R", "C", "C", "I", "I", "I", "A"],
        ["Submission", "R", "C", "C", "C", "C", "C", "A"],
    ], widths=[2.2, 0.5, 0.6, 0.75, 0.7, 0.7, 0.5, 0.65], font_size=9)

    # ------------------------------------------------------------------ 7
    doc.add_heading("7. Configuration management", level=1)
    bullets(doc, [
        ("Version control.", "Git, initialised at project start. One commit per logical change, "
         "typed as feat, fix, refactor, docs, chore or test, with a body explaining why where the "
         "change is not self-evident."),
        ("Environment configuration.", "All configuration is read from the environment. "
         "server/.env.example is committed as the template; .env itself is ignored. No credential, "
         "token or signing secret is ever committed."),
        ("Database.", "The schema is the single source of truth in server/src/db/schema.sql, "
         "applied idempotently at boot. The seeded database file is ignored by version control so a "
         "developer's working data never enters a commit."),
        ("Documents.", "Every document carries a Document ID, a version and a dated revision note. "
         "The nine binary documents are generated from committed source in docs/tools, so a document "
         "and the data behind it cannot diverge."),
        ("Build artefacts.", "dist/ and node_modules/ are ignored. The production build is "
         "reproducible from a clean checkout with npm install and npm run build."),
    ])

    # ------------------------------------------------------------------ 8
    doc.add_heading("8. Procurement and third-party management", level=1)
    doc.add_paragraph(
        "The reference implementation has no third-party engagement. Deployment readiness requires "
        "three, and each is a gate rather than a task:"
    )
    add_table(doc, ["Engagement", "Basis", "Gate it satisfies"], [
        ["VAPT by a CERT-In empanelled auditor", "Empanelled-auditor list; limited tender", "SR-017, D-23. No live award before completion."],
        ["Third-party GIGW 3.0 conformance audit", "Limited tender among accessibility auditors", "NF-008, D-24. No government-domain deployment before completion."],
        ["India-resident hosting and operations", "Existing NIC or MeitY-empanelled cloud arrangement", "D-19, D-21. Data residency and log retention."],
    ], widths=[2.1, 2.2, 2.4])

    # ------------------------------------------------------------------ 9
    doc.add_heading("9. Monitoring and control", level=1)
    add_table(doc, ["Control", "What is checked", "When"], [
        ["Phase gate", "RTM statuses advanced, Code Register current, risks re-scored, definition of done met for every item in the phase", "At each phase boundary"],
        ["Build gate", "Production build clean; no chunk above the size threshold", "Every commit touching the client"],
        ["Test gate", "All end-to-end assertions pass", "Before any commit touching a gate or a state machine"],
        ["Document gate", "Traceability chain intact: no requirement without a design reference or a test reference; no registered file without a design reference", "At each phase boundary; formulas on the Summary tabs report it"],
        ["Compliance gate", "No obligation on AVSAR-DPD-009 without recorded evidence and a named owner", "Every six months, and on any data-model change"],
    ], widths=[1.2, 3.6, 1.9])
    doc.add_paragraph(
        "The document gate is machine-checked rather than eyeballed. The Summary tab of each "
        "workbook carries live formulas that count requirements missing a design reference, "
        "requirements missing a test reference, registered files missing a design reference, risks "
        "without a target date and obligations without evidence. Each must read zero for the phase "
        "gate to pass."
    )

    # ------------------------------------------------------------------ 10
    doc.add_heading("10. Closure", level=1)
    doc.add_paragraph("The programme closes on satisfaction of all seven criteria:")
    add_table(doc, ["#", "Closure criterion", "Verified by"], [
        ["1", "All Must-have requirements at status Verified", "AVSAR-RTM-004 Summary"],
        ["2", "End-to-end suite green across every stage gate", "npm test output"],
        ["3", "Every source file registered and traced", "AVSAR-CDR-006 Summary"],
        ["4", "No High-severity risk without a dated mitigation and named owner", "AVSAR-RSK-007 Summary"],
        ["5", "Every compliance obligation assessed with evidence or a dated remediation", "AVSAR-DPD-009 Summary"],
        ["6", "Retention policy published with erasure triggers per data category", "AVSAR-RET-010"],
        ["7", "Document set baselined at version 1.0 with the traceability chain intact", "This plan, section 9"],
    ], widths=[0.4, 4.2, 2.1])
    doc.add_paragraph(
        "Closure of the reference implementation is not closure of the mechanism. The deployment "
        "readiness phase carries its own gates, of which two are absolute: no live award may be "
        "made before VAPT is complete, and no government-domain deployment may occur before the "
        "accessibility audit is complete."
    )

    doc.save(path)
    return path
