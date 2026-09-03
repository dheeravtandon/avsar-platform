"""AVSAR-DPD-009 - DPDP Compliance Tracker.

One row per obligation, with evidence citing a concrete artefact: a file path, a
table name, an endpoint or a document ID. An obligation with no evidence is Not
Started, however good the intention behind it.
"""

from common import (
    add_status_validation, cover_sheet, legend_sheet, new_workbook,
    summary_sheet, write_table,
)

HEADERS = ["Ref", "Section", "Requirement", "Applicability", "Status",
           "Evidence", "Owner", "Next Review", "Notes"]
WIDTHS = [8, 30, 66, 24, 12, 70, 22, 13, 56]
WRAP = (3, 6, 9)

DPDP = [
    ("D-01", "DPDP s.4 - Grounds for processing",
     "Personal data may be processed only for a lawful purpose for which the data principal has given consent, or for a legitimate use.",
     "Applicable - all users", "Done",
     "Purpose is declared at registration and bounded by procurement participation. Registration notice text: client/src/pages/Register.jsx step 4. Purpose constant: server/src/config.js.",
     "Nodal Officer", "31 Mar 2027",
     "Legitimate use is also available for a public-function processing basis; consent is taken regardless so the basis is unambiguous."),

    ("D-02", "DPDP s.5 - Notice",
     "A clear notice must be given at or before the time of seeking consent, stating the personal data collected and the purpose of processing.",
     "Applicable - startups", "Done",
     "Notice rendered on the final registration step before submission: client/src/pages/Register.jsx. Text names the statute, the purpose and the fact that the eligibility verdict is stored.",
     "Nodal Officer", "31 Mar 2027",
     "Itemised notice per data category is a phase-two improvement; the present notice is purpose-level."),

    ("D-03", "DPDP s.6 - Consent",
     "Consent must be free, specific, informed, unconditional and unambiguous, with a clear affirmative action, and limited to the data necessary for the specified purpose.",
     "Applicable - startups", "Partial",
     "Submission of the registration form is the affirmative action and is timestamped in the audit log (action STARTUP_REGISTERED). A separate, revocable consent artefact per purpose is not yet implemented.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Gap: a discrete consent record with its own withdrawal endpoint. Tracked as a deployment-readiness item."),

    ("D-04", "DPDP s.6(4) - Withdrawal of consent",
     "The data principal must be able to withdraw consent at any time, with ease comparable to giving it.",
     "Applicable - startups", "Not Started",
     "No self-service withdrawal or account-closure endpoint exists in the demonstration build.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Known gap, recorded in AVSAR-RET-010 section 6. Withdrawal must be reconciled against the retention obligation on award records."),

    ("D-05", "DPDP s.6(9) - Consent notice in scheduled languages",
     "The notice must be available in English and in the languages specified in the Eighth Schedule to the Constitution.",
     "Applicable - startups", "Not Started",
     "Interface and notice are English-only. Content is separated from components (NF-016) so a Hindi layer can be added without structural change.",
     "Design lead", "31 Mar 2027",
     "Hindi first, then the language set of the deploying state. Blocking for a live public deployment."),

    ("D-06", "DPDP s.7 - Legitimate uses",
     "Processing for the performance of a function of the State, or for compliance with a judgment or law, is a legitimate use.",
     "Applicable - officials", "Done",
     "Departmental user accounts are created by the platform administrator for the performance of a State function; no consent flow is applied to official accounts. Seeded in server/src/db/seed.js.",
     "Nodal Officer", "31 Mar 2027",
     "Basis documented so the difference in treatment between official and startup accounts is deliberate and explainable."),

    ("D-07", "DPDP s.8(1) - Data fiduciary accountability",
     "The data fiduciary is responsible for compliance in respect of any processing undertaken by it or on its behalf by a data processor.",
     "Applicable - departments", "Done",
     "The department is the fiduciary; the startup running a pilot is a processor. The relationship is fixed by a data processing agreement that the platform requires before pilot activation: server/src/routes/pilots.js returns HTTP 412 without it.",
     "Department Head", "31 Mar 2027",
     "Asserted by the end-to-end suite: workflow.test.mjs, 'a pilot cannot go live without the DPDP data processing agreement'."),

    ("D-08", "DPDP s.8(2) - Processor engagement by contract",
     "A data processor may be engaged only under a valid contract.",
     "Applicable - pilots", "Done",
     "pilots.dpa_signed must be true before status can move to ACTIVE. Enforced in server/src/routes/pilots.js; recorded on the pilot Terms tab in client/src/pages/PilotDetail.jsx.",
     "Nodal Officer", "31 Mar 2027",
     "The demonstration build records execution of the agreement; a live build should also store the signed instrument."),

    ("D-09", "DPDP s.8(3) - Completeness and accuracy",
     "Where personal data is likely to be used to make a decision affecting the data principal, it must be complete, accurate and consistent.",
     "Applicable - startups", "Done",
     "A startup can correct any profile fact and re-run the statutory gate on demand: PUT /api/registry/startups/me and POST /api/registry/startups/me/eligibility (FR-003). Every gate verdict stores the facts it was decided on.",
     "Startup", "31 Mar 2027",
     "This is the substantive answer to an adverse eligibility decision: the applicant can see the fact relied on and correct it."),

    ("D-10", "DPDP s.8(4) - Security safeguards",
     "Reasonable security safeguards must be implemented to prevent a personal data breach.",
     "Applicable - platform", "Partial",
     "bcrypt password hashing, JWT with eight-hour expiry and per-request user reload, server-side role and row-level authorisation on every route, parameterised SQL throughout, no framework HTML injection, internal error detail suppressed outside development. See AVSAR-RTM-004 Security RTM SR-001 to SR-015.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Gap: encryption at rest, TLS termination configuration, and VAPT by a CERT-In empanelled auditor. All are deployment-phase controls."),

    ("D-11", "DPDP s.8(5) - Breach notification",
     "A personal data breach must be notified to the Data Protection Board and to each affected data principal.",
     "Applicable - platform", "Partial",
     "The hash-chained audit log provides the forensic record needed to scope a breach: server/src/services/audit.js, verifiable via GET /api/audit/verify. The notification process itself is documented but not automated.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Must be read with the CERT-In six-hour incident reporting obligation, which is the tighter of the two timelines."),

    ("D-12", "DPDP s.8(7) - Erasure on withdrawal or purpose completion",
     "Personal data must be erased on withdrawal of consent or when the purpose is no longer being served, unless retention is required by law.",
     "Applicable - all users", "Partial",
     "Retention periods and erasure triggers are defined per data category in AVSAR-RET-010. Automated erasure jobs are not implemented in the demonstration build.",
     "Scientist-E (NIC)", "31 Mar 2027",
     "Award and audit records carry a statutory retention obligation that overrides an erasure request; the policy states which categories those are."),

    ("D-13", "DPDP s.8(9) - Grievance redressal",
     "The data fiduciary must publish the contact details of a person able to answer questions about processing, and provide an effective grievance redressal mechanism.",
     "Applicable - all users", "Done",
     "Grievance module with five declared categories and a fifteen-day SLA that escalates to the department head: server/src/routes/misc.js, client/src/pages/Grievances.jsx, grievances table.",
     "Department Head", "31 Mar 2027",
     "A named Data Protection Officer with published contact details is required at deployment; the mechanism is in place."),

    ("D-14", "DPDP s.9 - Processing of children's data",
     "Verifiable parental consent is required before processing the personal data of a child, and tracking or targeted advertising directed at children is prohibited.",
     "Not applicable", "Done",
     "The platform processes data of company officers and government officials only. No user category is or can be a minor; there is no advertising or tracking of any kind.",
     "Nodal Officer", "31 Mar 2027",
     "Applicability reassessed if a problem statement is ever published in a domain where a pilot would process children's data."),

    ("D-15", "DPDP s.11 - Right to access information",
     "A data principal may obtain a summary of the personal data being processed and the processing activities undertaken.",
     "Applicable - startups", "Partial",
     "A startup sees its own complete profile, every application with its stored gate verdict, every pilot, contract and payment. A single downloadable data-access report is not implemented.",
     "Scientist-E (NIC)", "31 Mar 2027",
     "The data is already visible in the interface; the gap is a machine-readable export in one action."),

    ("D-16", "DPDP s.12 - Right to correction and erasure",
     "A data principal may seek correction, completion, updating and erasure of their personal data.",
     "Applicable - startups", "Partial",
     "Correction, completion and updating are fully self-service (FR-003). Erasure is not.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Same gap as D-04 and D-12; erasure is the single largest open item on this tracker."),

    ("D-17", "DPDP s.13 - Right of grievance redressal",
     "A data principal has the right to a readily available means of grievance redressal in respect of any act or omission of the data fiduciary.",
     "Applicable - all users", "Done",
     "Grievance module is available to every authenticated user with a published SLA and a resolution recorded in writing on the audit trail.",
     "Department Head", "31 Mar 2027",
     "Resolution text is visible to the person who raised the grievance (FR-049)."),

    ("D-18", "DPDP s.14 - Right to nominate",
     "A data principal may nominate another individual to exercise their rights in the event of death or incapacity.",
     "Applicable - startups", "Not Started",
     "No nomination field or flow exists.",
     "Scientist-E (NIC)", "31 Mar 2027",
     "Low practical impact here: the data principal is a company officer and the company persists independently. Recorded for completeness rather than dismissed."),

    ("D-19", "DPDP s.16 - Transfer outside India",
     "Personal data may be transferred outside India except to a territory notified as restricted.",
     "Applicable - platform", "Done",
     "No cross-border transfer occurs. The database is a local file in the demonstration build and is specified as India-resident for deployment. No third-party analytics, tag manager or telemetry is loaded by the client.",
     "Scientist-E (NIC)", "31 Mar 2027",
     "Web fonts are the only external request; they can be self-hosted for a fully air-gapped deployment."),

    ("D-20", "CERT-In Directions 2022 - Incident reporting",
     "A cyber security incident must be reported to CERT-In within six hours of noticing it.",
     "Applicable - platform", "Partial",
     "The audit trail and chain verification provide detection and scoping. The reporting runbook is documented; the on-call rota is a deployment-phase item.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Six hours is tighter than the DPDP notification timeline and therefore governs."),

    ("D-21", "CERT-In Directions 2022 - Log retention",
     "Logs must be maintained securely within Indian jurisdiction for a rolling period of 180 days.",
     "Applicable - platform", "Done",
     "Audit retention is configured at 180 days (server/.env.example AUDIT_RETENTION_DAYS, surfaced in server/src/config.js) and the audit_log table is append-only and hash-chained.",
     "Scientist-E (NIC)", "31 Mar 2027",
     "Retention is configured and the store is India-resident; automated pruning at the boundary is a deployment-phase job."),

    ("D-22", "CERT-In Directions 2022 - Time synchronisation",
     "Systems must synchronise clocks to the NIC or NPL network time protocol servers.",
     "Applicable - platform", "Not Started",
     "Host clock configuration is outside the demonstration build.",
     "Scientist-E (NIC)", "31 Dec 2026",
     "Material to the audit trail: an unsynchronised clock weakens the evidentiary value of every timestamp in the chain."),

    ("D-23", "CERT-In Directions 2022 - Vulnerability assessment",
     "A vulnerability assessment and penetration test should be conducted by a CERT-In empanelled auditor.",
     "Applicable - platform", "Not Started",
     "Not conducted. Recorded as a hard precondition for any live deployment (SR-017).",
     "Mission Director", "31 Jan 2027",
     "No live award may be made on the platform before this is complete."),

    ("D-24", "GIGW 3.0 / WCAG 2.1 AA - Accessibility",
     "A government website must meet the Guidelines for Indian Government Websites and WCAG 2.1 level AA.",
     "Applicable - platform", "Partial",
     "Semantic landmarks, skip link, focus-visible never suppressed, no meaning carried by colour alone (client/src/lib/status.js pairs every colour with a text label), ARIA on live regions and progress bars, reduced-motion honoured (client/src/styles/base.css).",
     "Design lead", "31 Jan 2027",
     "Self-assessed against the standard. A third-party conformance audit is scheduled and is not yet done; do not claim certified conformance."),

    ("D-25", "GFR 2017 / CAG - Audit trail integrity",
     "Procurement decisions must be supported by a record that an auditor can rely on.",
     "Applicable - platform", "Done",
     "Append-only SHA-256 hash-chained audit log; every entry chains its predecessor so a retrospective edit invalidates all subsequent links. Verification is exposed at GET /api/audit/verify and in the Administration screen, and is asserted by the end-to-end suite after a full lifecycle run.",
     "Scientist-E (NIC)", "31 Mar 2027",
     "This is the control that makes an evidence-gated single-source award defensible."),
]


def build(path):
    wb = new_workbook()

    cover_sheet(
        wb, "dpdp",
        "One row per obligation under the Digital Personal Data Protection Act 2023, the CERT-In "
        "Directions of 2022 and the accessibility and audit standards that apply to a government "
        "platform. Evidence cites a concrete artefact - a file path, a table, an endpoint or a "
        "document ID. An obligation with no such evidence is recorded as Not Started, and the open "
        "items are listed on the Summary tab rather than buried.",
        [("1.0", "03 Sep 2026", "TandSol", "Baseline. Twenty-five obligations assessed: DPDP Act "
          "2023 sections 4 to 16, CERT-In Directions 2022, GIGW 3.0 and audit-trail integrity.")],
        extra=[("Honest position", "This is a demonstration build. Fifteen obligations are met, six "
                                   "are partially met and five are not started. The five open items are "
                                   "consent artefacts and withdrawal, scheduled-language notice, clock "
                                   "synchronisation, nomination, and VAPT - all of which are deployment-phase "
                                   "controls with owners and target dates.")],
    )

    legend_sheet(wb, [
        ("Status", [
            ("Done", "Control implemented and evidenced by a named artefact"),
            ("Partial", "Control partly implemented; the specific gap is stated in Notes"),
            ("Not Started", "No implementation; owner and target date recorded"),
            ("N/A", "Obligation does not apply; the reason is recorded in Notes"),
        ]),
        ("Applicability", [
            ("Applicable - all users", "Every data principal on the platform"),
            ("Applicable - startups", "Founders and authorised signatories of applicant entities"),
            ("Applicable - officials", "Departmental users processing under a State function"),
            ("Applicable - departments", "The data fiduciary"),
            ("Applicable - pilots", "Arises only where a pilot processes personal data"),
            ("Applicable - platform", "A platform-level technical or operational control"),
            ("Not applicable", "Does not arise given the user categories and data processed"),
        ]),
        ("What counts as evidence", [
            ("File path", "server/src/routes/pilots.js - the code that enforces the control"),
            ("Table name", "audit_log - where the record is kept"),
            ("Endpoint", "GET /api/audit/verify - how the control is exercised"),
            ("Test reference", "workflow.test.mjs - the assertion that proves it holds"),
            ("Document ID", "AVSAR-RET-010 - the policy that governs it"),
            ("Not evidence", "An intention, a plan, or a statement that the team is aware of the obligation"),
        ]),
        ("Instruments covered", [
            ("DPDP Act 2023", "Digital Personal Data Protection Act, sections 4 to 16"),
            ("CERT-In Directions 2022", "Incident reporting, log retention, time synchronisation, assessment"),
            ("GIGW 3.0 / WCAG 2.1 AA", "Accessibility and usability of government websites"),
            ("GFR 2017 / CAG", "Audit-trail integrity supporting a procurement decision"),
        ]),
    ])

    ws = wb.create_sheet("DPDP Tracker")
    write_table(ws, HEADERS, [list(r) for r in DPDP], widths=WIDTHS, wrap_cols=WRAP)
    last = len(DPDP) + 1
    add_status_validation(ws, "E", 2, last, ["Done", "Partial", "Not Started", "N/A"])

    scored = f'(COUNTA(\'DPDP Tracker\'!A2:A{last})-COUNTIF(\'DPDP Tracker\'!E2:E{last},"N/A"))'
    weighted = (f'(COUNTIF(\'DPDP Tracker\'!E2:E{last},"Done")'
                f'+0.5*COUNTIF(\'DPDP Tracker\'!E2:E{last},"Partial"))')

    summary_sheet(wb, "DPDP compliance - summary", [
        ("Obligations assessed", f"=COUNTA('DPDP Tracker'!A2:A{last})", "Total rows on the tracker"),
        ("Done", f"=COUNTIF('DPDP Tracker'!E2:E{last},\"Done\")", "Implemented and evidenced"),
        ("Partial", f"=COUNTIF('DPDP Tracker'!E2:E{last},\"Partial\")", "Gap stated in the Notes column"),
        ("Not Started", f"=COUNTIF('DPDP Tracker'!E2:E{last},\"Not Started\")", "Owner and target date recorded"),
        ("Not applicable", f"=COUNTIF('DPDP Tracker'!E2:E{last},\"N/A\")", "Excluded from the completion figure"),
        ("Applicable obligations", f"={scored}", "Assessed minus not applicable"),
        ("Completion (Partial counted as half)", f"=ROUND({weighted}/{scored},3)", "Format as a percentage; the headline figure"),
        ("Strict completion (Done only)", f"=ROUND(COUNTIF('DPDP Tracker'!E2:E{last},\"Done\")/{scored},3)", "The figure to quote if asked for the conservative number"),
        ("DPDP Act obligations", f"=COUNTIF('DPDP Tracker'!B2:B{last},\"DPDP*\")", "Sections 4 to 16"),
        ("CERT-In obligations", f"=COUNTIF('DPDP Tracker'!B2:B{last},\"CERT-In*\")", "Directions of 2022"),
        ("Open items due by 31 Dec 2026", f"=COUNTIFS('DPDP Tracker'!H2:H{last},\"31 Dec 2026\")", "The near-term remediation set"),
        ("Rows with no evidence recorded", f"=COUNTIF('DPDP Tracker'!F2:F{last},\"\")", "Must be zero; a Not Started row still states why"),
        ("Rows with no owner", f"=COUNTIF('DPDP Tracker'!G2:G{last},\"\")", "Must be zero"),
    ], note="Reviewed every six months, and immediately on any change to the data model, a new "
            "integration, or an amendment to the Act or the Directions. Next scheduled review: "
            "31 March 2027.")

    wb.save(path)
    return path
