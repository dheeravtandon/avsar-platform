"""AVSAR-CHR-002 - Project Charter."""

from docx_common import add_table, bullets, callout, cover, footer_note, new_document


def build(path):
    doc = new_document()
    footer_note(doc, "AVSAR-CHR-002 Project Charter v1.0 - Internal - Smart India Hackathon submission")

    cover(
        doc, "charter",
        "Startup-friendly public procurement mechanism for government departments",
        "This Charter states why AVSAR exists, what it is authorised to change, what it will "
        "deliberately not attempt, who is accountable, and how success will be judged. It is the "
        "root of the traceability chain: every requirement in AVSAR-RTM-004 derives from an "
        "objective stated here, and every design decision in AVSAR-SDD-005 serves a requirement "
        "traced back to this document.",
        [["1.0", "03 Sep 2026", "TandSol", "Baseline for the Smart India Hackathon submission."]],
        approvals=[
            ["Sponsor", "Mission Director", "", ""],
            ["Project Manager", "TandSol", "", ""],
            ["Policy Lead", "Deputy Secretary (Innovation)", "", ""],
        ],
    )

    # ------------------------------------------------------------------ 1
    doc.add_heading("1. Problem statement", level=1)
    doc.add_paragraph(
        "Government departments in India cannot readily buy from startups. The obstacle is not "
        "policy hostility - the Government of India has actively encouraged startup participation "
        "since 2016 - but process design. Public procurement is built to buy known things safely, "
        "and every safeguard that makes it safe also excludes a young company before merit is ever "
        "considered."
    )
    doc.add_paragraph("Three mechanisms do the excluding, in order of how often they bite:")
    bullets(doc, [
        ("Specification, not outcome.", "A tender's technical specification is written from what "
         "the market already sells. A genuinely different approach is non-responsive before it is "
         "read, so the process cannot discover anything it did not already know about."),
        ("Qualification by history.", "Bid qualification asks for prior turnover and prior "
         "experience of similar supply. A three-year-old company has neither, and no amount of "
         "technical merit substitutes for a five-year audited record."),
        ("No budget line for uncertainty.", "There is no safe, small, defensible way for a "
         "department to spend money finding out whether something unproven works. The choice is "
         "framed as buy or do not buy, so departments do not buy."),
    ])
    doc.add_paragraph(
        "Two consequences follow. Departments continue to buy solutions that do not move the "
        "numbers they are accountable for. And startups with working technology conclude that "
        "government is not a reachable market, so the public sector is served last by domestic "
        "innovation rather than first."
    )
    callout(doc, "The gap this Charter addresses:",
            "The relaxations that would fix this already exist in law. GFR 2017 Rule 173(i) waives "
            "prior turnover and prior experience for recognised startups; Rule 170 exempts Earnest "
            "Money Deposit. The gap is not the rule. It is that the relaxation must be claimed, is "
            "applied inconsistently, and leaves no standard record that an auditor can rely on.")

    # ------------------------------------------------------------------ 2
    doc.add_heading("2. Project purpose and justification", level=1)
    doc.add_paragraph(
        "AVSAR delivers a single mechanism through which a government department can identify, "
        "pilot, procure and scale an innovative solution from an eligible startup, without any new "
        "statute or amendment. Its contribution is to apply the existing rules consistently and "
        "automatically, and to leave behind a record that survives audit."
    )
    doc.add_paragraph("The justification rests on four points:")
    bullets(doc, [
        ("It requires no legislative change.", "Every relaxation applied and every route to award "
         "is drawn from the General Financial Rules 2017 or a standing notification. The project "
         "carries no legislative dependency and therefore no legislative timeline."),
        ("It makes uncertainty affordable.", "A capped, time-boxed, KPI-measured pilot converts an "
         "unbounded procurement risk into a bounded and budgeted one, with an exit that costs the "
         "department nothing if the KPIs are missed."),
        ("It makes a decision defensible.", "Eligibility is decided by statute rather than opinion; "
         "shortlists are produced by an explainable model; procurement rests on measured evidence "
         "under a named rule with a written justification on an append-only record."),
        ("It stops the country paying twice.", "A solution that clears a pilot is placed on a rate "
         "contract that any other department can draw down without repeating discovery, evaluation "
         "or pilot. This is where the compounding return lies."),
    ])

    # ------------------------------------------------------------------ 3
    doc.add_heading("3. Objectives and success criteria", level=1)
    add_table(doc,
              ["#", "Objective", "How success is measured", "Target"],
              [
                  ["O1", "Departments can express a need as an outcome rather than a specification",
                   "Share of published problem statements carrying a declared baseline and at least one measurable KPI with a unit and a direction",
                   "100% - the platform refuses to publish otherwise"],
                  ["O2", "Statutory eligibility is decided consistently and explainably",
                   "Share of applications carrying a stored, itemised gate verdict citing the rule behind each check",
                   "100%"],
                  ["O3", "The GFR relaxations reach every eligible applicant without being claimed",
                   "Share of eligible applications with prior-turnover and prior-experience waiver recorded on the file",
                   "100%"],
                  ["O4", "Uncertainty is resolved by evidence, not by argument",
                   "Share of procurements linked to a pilot carrying a recorded verdict against pre-declared KPIs",
                   "100% - the platform refuses otherwise"],
                  ["O5", "The cycle from published need to award is materially shorter than a conventional tender",
                   "Median days from publication to procurement raised, against a 300-day benchmark for a comparable open tender",
                   "Under 240 days"],
                  ["O6", "A proven solution is reused rather than re-tendered",
                   "Cross-department adoptions per listing on the Proven Solutions Registry",
                   "At least 2 within 12 months of listing"],
                  ["O7", "Payment discipline is visible and enforced",
                   "Share of milestone payments settled inside the 45-day window under MSMED Act s.15",
                   "At least 95%"],
                  ["O8", "First-time suppliers reach the public sector",
                   "Share of contracts awarded to a supplier with no prior government order",
                   "At least 40%"],
                  ["O9", "Every decision is auditable and tamper-evident",
                   "Audit chain integrity verified across the full history",
                   "Intact, continuously"],
                  ["O10", "The mechanism is accessible to every intended user",
                   "Conformance with GIGW 3.0 and WCAG 2.1 level AA, independently assessed",
                   "Level AA before live deployment"],
              ],
              widths=[0.4, 1.9, 3.1, 1.3])

    # ------------------------------------------------------------------ 4
    doc.add_heading("4. Scope", level=1)
    doc.add_heading("4.1 In scope - Stage A, Assess", level=2)
    bullets(doc, [
        "Outcome-based problem statement authoring: problem, background, quantified baseline, desired outcome, KPIs with target, unit and direction, sector, capability tags, technology readiness floor, pilot budget ceiling, pilot duration, indicative scale-up value and volume, deployment environment, data availability, intellectual property terms and security clearance requirement.",
        "A permanent government file number issued on creation and carried through every downstream record.",
        "Approval separated from authoring: a nodal officer drafts, only a department head publishes.",
        "Publication to a public surface visible without authentication, with sector-matched notification to eligible startups.",
    ])

    doc.add_heading("4.2 In scope - Stage V, Validate", level=2)
    bullets(doc, [
        "Startup self-registration capturing DPIIT recognition, incorporation date, entity type, turnover, CIN, GSTIN and Udyam number.",
        "An automatic statutory eligibility gate returning an itemised verdict, each check naming the rule it derives from.",
        "A challenge fit gate on readiness floor, budget ceiling and timeline window.",
        "Automatic application of the prior-turnover, prior-experience, EMD and tender-fee relaxations, recorded on the file.",
        "Reverse discovery: a department searches the startup registry and receives an explainable ranking rather than waiting for applications.",
        "Committee assignment with visible workload, a mandatory conflict-of-interest declaration, a blind first pass, two-envelope scoring at 70 and 30, a qualifying technical threshold, score immutability on submission, and a dispersion flag forcing reconciliation.",
    ])

    doc.add_heading("4.3 In scope - Stage S, Sandbox", level=2)
    bullets(doc, [
        "Pilot creation from a shortlisted application, validated against the published ceiling.",
        "A pilot agreement recording scope, milestones, payment schedule, intellectual property ownership and exit terms.",
        "A hard precondition that the DPDP Act 2023 data processing agreement is executed before a pilot may go live.",
        "Milestone-linked payment release with payouts summing to exactly one hundred per cent, evidence submission and departmental acceptance or return.",
        "Periodic KPI readings against the Stage A targets, attributed to the person who recorded them.",
        "Automatic opening of a payment due within forty-five days on milestone acceptance.",
        "A closure verdict of SUCCESS, PARTIAL or FAILED recorded by the pilot monitor or department head, with a written note.",
    ])

    doc.add_heading("4.4 In scope - Stage A, Adopt", level=2)
    bullets(doc, [
        "An evidence gate: no procurement may be drafted against a pilot without a recorded verdict.",
        "Four procurement modes, each carrying the General Financial Rules provision it rests on.",
        "A mandatory written justification placed on the audit record.",
        "Sanction authority reserved to the department head.",
        "Purchase order issue and payment release against a PFMS transaction reference.",
    ])

    doc.add_heading("4.5 In scope - Stage R, Ramp-up", level=2)
    bullets(doc, [
        "A Proven Solutions Registry listing solutions that cleared a pilot, with the measured KPIs attached.",
        "A published rate contract with unit price, unit of measure and validity.",
        "Single-action adoption by any other department, skipping discovery, evaluation and pilot, with automatic refusal once the rate contract lapses.",
    ])

    doc.add_heading("4.6 In scope - cross-cutting", level=2)
    bullets(doc, [
        "Seven roles with server-side authorisation and row-level ownership enforcement.",
        "A hash-chained, append-only audit trail with full-chain verification exposed to the administrator and to audit.",
        "A public transparency board publishing the conversion funnel including failures, cycle-time medians against a conventional-tender benchmark, sector and department activity, and payment SLA performance.",
        "Grievance redressal with five declared categories and a fifteen-day SLA escalating to the department head.",
        "In-app notification on every state change affecting a record the user owns or oversees.",
    ])

    doc.add_heading("4.7 Explicitly out of scope for this release", level=2)
    add_table(doc, ["Excluded", "Reason"], [
        ["Live verification against MCA, GSTN and the Udyam registry",
         "Requires onboarding to central systems, which is a governance process rather than an engineering task. The gate already records the declaration, the verdict and the rule, so a false claim is attributable. Live verification is a hard precondition for any live award."],
        ["Live GeM, PFMS and CPPP integration",
         "Same dependency. Integration points are isolated behind named fields so a live adapter replaces a stub without schema change."],
        ["Payment execution",
         "AVSAR records the obligation, the due date and the settlement reference. Money moves through PFMS and the treasury, which remain the systems of record."],
        ["National single sign-on",
         "NIC single sign-on for officials and Startup India or DigiLocker federation for startups is a deployment-phase dependency."],
        ["Machine learning in the decision path",
         "A deliberate exclusion, not a deferral. A shortlist must be explainable to a public auditor, so ranking uses a transparent weighted model that reports the reason for every point awarded."],
        ["Multilingual interface",
         "English only in this release. Content is separated from components so a Hindi layer can be added without structural change. Blocking for live public deployment."],
        ["Certified accessibility conformance",
         "Built to GIGW 3.0 and WCAG 2.1 AA and self-assessed, but not independently audited. No conformance claim is made."],
        ["Reversal of a committee's scoring judgement",
         "Grievance redressal can require that reasons be stated, correct a gate result founded on a mistaken fact, and escalate a payment. It cannot substitute a different technical opinion."],
    ], widths=[2.1, 4.6])

    # ------------------------------------------------------------------ 5
    doc.add_heading("5. Stakeholders", level=1)
    add_table(doc, ["Stakeholder", "Interest", "Influence", "Engagement"], [
        ["Sponsoring ministry or mission", "A mechanism that produces measurable outcomes and survives audit", "High", "Charter approval; monthly review of the transparency board"],
        ["Nodal officers", "A way to solve a problem they are accountable for without carrying process risk", "High", "Co-design of the authoring form; the primary daily users"],
        ["Department heads", "Defensible approval and sanction decisions", "High", "Approval and sanction authority is theirs alone"],
        ["Procurement officers", "A named rule for every award and a clean file", "High", "Mode and justification design"],
        ["Evaluators", "A bounded, fair scoring task with protected independence", "Medium", "Rubric design; conflict-of-interest process"],
        ["Startups", "A reachable route to a public-sector customer", "High", "Registration and application design; grievance route"],
        ["Comptroller and Auditor General", "Evidence sufficient to test whether public money was well spent", "High", "Audit trail and justification design"],
        ["Data Protection Board", "Lawful processing of personal data", "Medium", "DPDP tracker AVSAR-DPD-009 and the retention policy"],
        ["Citizens", "Public money spent on things that demonstrably work", "Medium", "The public transparency board, including published failures"],
        ["NIC and MeitY", "Security, hosting and interoperability with central systems", "Medium", "Deployment readiness phase"],
    ], widths=[1.5, 2.4, 0.8, 2.0])

    # ------------------------------------------------------------------ 6
    doc.add_heading("6. Assumptions, constraints and dependencies", level=1)
    doc.add_heading("6.1 Assumptions", level=2)
    bullets(doc, [
        "A participating department can identify at least one quantified problem for which it holds a baseline measurement.",
        "A pilot budget of the order of thirty to seventy lakh rupees is available from a departmental innovation head without fresh appropriation.",
        "Domain experts can be assembled into an evaluation committee within two weeks of applications closing.",
        "DPIIT recognition data is authoritative for the statutory definition of a startup.",
        "A department can grant a startup access to a live operational environment under a data processing agreement.",
    ])
    doc.add_heading("6.2 Constraints", level=2)
    bullets(doc, [
        "No new statute, rule amendment or notification may be required. Every step must rest on existing authority.",
        "Sanction and approval authority may not be altered; the platform must work within existing delegation of financial powers.",
        "Audit logs must be retained for one hundred and eighty days within Indian jurisdiction.",
        "The interface must target GIGW 3.0 and WCAG 2.1 level AA.",
        "No credential, secret or personal data may be committed to the repository.",
    ])
    doc.add_heading("6.3 Dependencies", level=2)
    add_table(doc, ["Dependency", "Owner", "Needed by"], [
        ["MCA, GSTN and Udyam verification API access", "NIC / MeitY", "Before any live award"],
        ["GeM seller and contract API onboarding", "GeM", "Phase 2"],
        ["PFMS payment status integration", "Controller General of Accounts", "Phase 2"],
        ["NIC single sign-on for departmental users", "NIC", "Before live deployment"],
        ["VAPT by a CERT-In empanelled auditor", "CERT-In empanelled auditor", "Before live deployment"],
        ["Third-party GIGW 3.0 conformance audit", "Accessibility auditor", "Before live deployment"],
    ], widths=[3.2, 2.0, 1.5])

    # ------------------------------------------------------------------ 7
    doc.add_heading("7. High-level milestones", level=1)
    add_table(doc, ["Milestone", "Description", "Date"], [
        ["M1", "Requirements traceability matrix baselined", "01 Aug 2026"],
        ["M2", "Data model and workflow state machines frozen", "15 Aug 2026"],
        ["M3", "API feature complete across all five stages", "08 Sep 2026"],
        ["M4", "Client feature complete across all seven roles", "12 Sep 2026"],
        ["M5", "End-to-end suite green across every stage gate", "17 Sep 2026"],
        ["M6", "Document set baselined and submission made", "30 Sep 2026"],
        ["M7", "Deployment readiness: live verification, sign-on, VAPT, accessibility audit", "31 Mar 2027"],
    ], widths=[0.9, 4.4, 1.4])

    # ------------------------------------------------------------------ 8
    doc.add_heading("8. Budget outline", level=1)
    doc.add_paragraph(
        "This Charter covers the reference implementation, which was built by a small team without "
        "external cost. The figures below are the indicative cost of taking it to live operation in "
        "one department, and are stated so that the sponsor can judge the scale of the commitment "
        "rather than as a tender estimate."
    )
    add_table(doc, ["Item", "Basis", "Indicative"], [
        ["Deployment engineering", "Live verification APIs, single sign-on, PostgreSQL migration, GeM and PFMS adapters", "INR 35 lakh"],
        ["Security assessment", "VAPT by a CERT-In empanelled auditor, plus remediation", "INR 8 lakh"],
        ["Accessibility audit", "Third-party GIGW 3.0 conformance assessment and remediation", "INR 5 lakh"],
        ["Hosting and operations", "India-resident hosting, backup, monitoring, per year", "INR 12 lakh per annum"],
        ["Change management", "Authoring workshops for nodal officers across participating departments", "INR 10 lakh"],
        ["Pilot fund (per department, indicative)", "Six pilots at an average ceiling of INR 45 lakh", "INR 2.7 crore"],
    ], widths=[2.4, 3.2, 1.1])
    callout(doc, "Note on the pilot fund:",
            "The pilot fund is not a project cost. It is departmental procurement spend that would "
            "otherwise be committed to a conventional tender with no evidence behind it. The "
            "mechanism changes what the money buys, not how much is spent.")

    # ------------------------------------------------------------------ 9
    doc.add_heading("9. Governance and authority", level=1)
    add_table(doc, ["Decision", "Authority", "Cannot be exercised by"], [
        ["Approve and publish a problem statement", "Department Head", "The nodal officer who drafted it"],
        ["Determine statutory eligibility", "The platform, by rule", "Any individual - the gate is automatic and its verdict is stored"],
        ["Assign an evaluation committee", "Nodal Officer", "The applicant, or an evaluator"],
        ["Score an application", "Evaluator, after declaring conflict of interest", "Anyone else; and no score may be edited after submission"],
        ["Shortlist an application", "Nodal Officer", "An evaluator acting alone"],
        ["Sanction a pilot", "Nodal Officer within the published ceiling", "Anyone, above the published ceiling"],
        ["Record a pilot closure verdict", "Pilot Monitor or Department Head", "The startup running the pilot"],
        ["Sanction a procurement", "Department Head", "The procurement officer who prepared it"],
        ["Suspend an account or verify KYC", "Platform Administrator", "A departmental user"],
        ["Score, approve or sanction on a department's behalf", "Nobody", "Including the platform administrator"],
    ], widths=[2.2, 2.3, 2.2])

    doc.add_heading("10. Charter acceptance", level=1)
    doc.add_paragraph(
        "Acceptance of this Charter authorises the scope in section 4, commits the governance in "
        "section 9, and baselines the objectives in section 3 as the measures against which the "
        "project will be judged. Any change to scope requires a version increment of this document "
        "and a corresponding update to AVSAR-RTM-004 in the same revision."
    )

    doc.save(path)
    return path
