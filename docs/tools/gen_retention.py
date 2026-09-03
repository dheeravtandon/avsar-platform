"""AVSAR-RET-010 - Data Retention Policy."""

from docx_common import add_table, bullets, callout, cover, footer_note, new_document


def build(path):
    doc = new_document()
    footer_note(doc, "AVSAR-RET-010 Data Retention Policy v1.0 - Internal - Smart India Hackathon submission")

    cover(
        doc, "retention",
        "What AVSAR keeps, for how long, on what legal basis, and how it is erased",
        "This policy states, for every category of data the platform holds, how long it is retained, "
        "what triggers the retention period, the legal basis for keeping it, and how erasure is "
        "carried out. It exists because the Digital Personal Data Protection Act 2023 requires "
        "personal data to be erased once the purpose is no longer served, while procurement law "
        "requires award records to be kept - and those two obligations have to be reconciled "
        "explicitly rather than left to judgement.",
        [["1.0", "03 Sep 2026", "TandSol", "Baseline. Fourteen data categories classified; erasure "
          "process, known gaps and review cycle recorded."]],
        approvals=[
            ["Data Fiduciary (Department Head)", "", "", ""],
            ["Platform Administrator", "Scientist-E, NIC", "", ""],
        ],
    )

    # ------------------------------------------------------------------ 1
    doc.add_heading("1. Scope and principles", level=1)
    doc.add_paragraph(
        "This policy applies to every record created by or stored in the AVSAR platform, whether or "
        "not it constitutes personal data. Four principles govern it."
    )
    bullets(doc, [
        ("Purpose limitation.", "Data is retained only while it serves the purpose for which it was "
         "collected: participation in, or oversight of, a public procurement process."),
        ("Statutory override.", "Where procurement, audit or cyber-security law requires a record to "
         "be kept, that obligation prevails over an erasure request. The categories where this "
         "applies are named in section 3 rather than asserted generally."),
        ("Minimisation on disclosure.", "A record may be retained in full for audit while being "
         "disclosed only in part. Financial and identity fields are withheld from callers who do "
         "not need them, independently of how long the record is kept."),
        ("Erasure means erasure.", "Where a category is erased, the personal data is removed or "
         "irreversibly de-identified, not merely hidden from an interface."),
    ])

    # ------------------------------------------------------------------ 2
    doc.add_heading("2. Roles", level=1)
    add_table(doc, ["Role", "Responsibility under this policy"], [
        ["Data Fiduciary - the procuring department", "Accountable for lawful processing of all data relating to its own problem statements, applications, pilots and contracts, including processing carried out on its behalf by a startup during a pilot."],
        ["Data Processor - a startup during a pilot", "Processes personal data only within the scope of the executed data processing agreement, for the pilot duration, and erases it on closure unless a specific written extension is recorded."],
        ["Platform Administrator", "Operates the retention schedule, executes erasure, maintains the audit trail and its integrity, and reports on this policy at each review."],
        ["Data Principal - a startup founder or official", "May exercise access, correction and erasure rights subject to the statutory overrides in section 3."],
    ], widths=[2.2, 4.5])

    # ------------------------------------------------------------------ 3
    doc.add_heading("3. Retention schedule", level=1)
    doc.add_paragraph(
        "Fourteen categories. The trigger column states the event from which the period runs, "
        "because a period with no stated trigger cannot be operated."
    )
    add_table(doc,
              ["Category", "Examples", "Trigger and period", "Legal basis"],
              [
                  ["Startup identity and recognition",
                   "Legal name, entity type, CIN, GSTIN, Udyam number, DPIIT recognition number and validity, incorporation date",
                   "From account closure or last activity: 8 years. Retained in full while any contract or unsettled payment subsists.",
                   "GFR 2017 record-keeping for procurement participation; Companies Act record alignment"],

                  ["Startup financial declarations",
                   "Turnover for the last financial year, employee count",
                   "From account closure: 8 years, aligned to the eligibility record it supports.",
                   "Evidence of the basis on which eligibility was decided"],

                  ["Contact and account data",
                   "Founder name, email address, telephone number, password hash, last sign-in",
                   "From account closure: 90 days, then erased. Password hash erased immediately on closure.",
                   "DPDP Act 2023 s.8(7) - purpose no longer served"],

                  ["Eligibility gate verdicts",
                   "The itemised verdict frozen onto an application, including each check, its authority and its result",
                   "From the decision: 8 years. Not erasable while the related application or contract record subsists.",
                   "Evidence supporting a procurement decision; audit defensibility"],

                  ["Problem statements",
                   "Problem text, baseline, KPIs, budget ceiling, terms, approval and publication record",
                   "Permanent. Published problem statements are a public record of what the State sought to buy.",
                   "GFR 2017; transparency obligation"],

                  ["Applications",
                   "Solution description, approach, quoted cost, timeline, declared risks, attachments",
                   "From the final decision on the application: 8 years. An unsuccessful application is retained for the same period as a successful one.",
                   "GFR 2017; defence of a challenge to the process"],

                  ["Evaluation scores and remarks",
                   "Per-criterion scores, weighted totals, written justification, recommendation, conflict-of-interest declaration",
                   "From the shortlist decision: 8 years. Never erased on request while the related award subsists.",
                   "Audit of the basis of an award; CAG examination"],

                  ["Pilot records",
                   "Sanction order, scope, milestones, evidence notes, acceptance decisions, KPI readings, closure verdict",
                   "From pilot closure: 8 years.",
                   "GFR 2017; evidence supporting a subsequent procurement"],

                  ["Personal data processed during a pilot",
                   "Any citizen or beneficiary data the startup accesses in the live environment under the pilot",
                   "Erased by the processor at pilot closure. No retention beyond the pilot window without fresh, recorded consent and a written extension to the data processing agreement.",
                   "DPDP Act 2023 s.8(2) and s.8(7); the pilot data processing agreement"],

                  ["Procurement and contract records",
                   "Mode, GFR provision relied on, written justification, contract value and term, purchase order number, GeM contract identifier",
                   "From contract expiry or termination: 8 years.",
                   "GFR 2017; CAG audit"],

                  ["Payment records",
                   "Invoice number, amount, due date, settlement date, PFMS reference",
                   "From settlement: 8 years.",
                   "GFR 2017; MSMED Act 2006 s.15 interest computation"],

                  ["Catalogue listings and adoptions",
                   "Solution description, unit price, proven KPIs, rate contract validity, drawing department and quantity",
                   "From rate contract expiry: 8 years.",
                   "GFR 2017 R.145; price discovery record"],

                  ["Grievances",
                   "Category, description, resolution text, SLA dates",
                   "From resolution: 5 years.",
                   "Demonstrating an effective redressal mechanism under DPDP Act 2023 s.8(9)"],

                  ["Audit and access logs",
                   "Actor, role, action, entity, payload, hash chain, sign-in and failed sign-in events",
                   "Minimum 180 days rolling, retained within Indian jurisdiction. Entries relating to an award are retained for 8 years with the award.",
                   "CERT-In Directions 2022; CAG audit trail integrity"],
              ],
              widths=[1.35, 1.85, 2.15, 1.35], font_size=8.5)

    callout(doc, "Why eight years:",
            "Central government procurement records are conventionally retained for a period that "
            "outlasts the audit cycle for the transaction. Eight years from the terminal event is "
            "adopted here as a single consistent figure across procurement-related categories so "
            "that related records do not expire at different times and leave an incomplete file. A "
            "deploying department should align this with its own record-retention schedule and "
            "record any variation as a revision to this document.")

    # ------------------------------------------------------------------ 4
    doc.add_heading("4. Erasure process", level=1)
    doc.add_heading("4.1 On a data principal's request", level=2)
    add_table(doc, ["Step", "Action", "Owner", "Timeline"], [
        ["1", "Request received through the grievance module under the category Other, or in writing to the Data Protection Officer", "Data Principal", "-"],
        ["2", "Identity of the requester verified against the account and the entity it represents", "Platform Administrator", "3 working days"],
        ["3", "Category-by-category assessment against section 3, identifying which categories carry a statutory override", "Platform Administrator", "5 working days"],
        ["4", "Erase every category not subject to an override; de-identify where a record must be retained but the personal element need not be", "Platform Administrator", "10 working days"],
        ["5", "Written response to the requester listing what was erased, what was retained, and the legal basis for each retention", "Data Protection Officer", "15 working days"],
        ["6", "The erasure action itself recorded on the audit trail - the fact of erasure, not the erased content", "Platform (automatic)", "Immediate"],
    ], widths=[0.5, 3.4, 1.6, 1.2])

    doc.add_heading("4.2 On expiry of a retention period", level=2)
    doc.add_paragraph(
        "A scheduled job identifies records past their retention period and erases or de-identifies "
        "them, writing a summary of the volume erased per category to the audit trail. The job is "
        "not implemented in the reference build; it is a deployment-phase item recorded in section 6."
    )

    doc.add_heading("4.3 De-identification in place of erasure", level=2)
    doc.add_paragraph(
        "Where a record must be retained for audit but the personal element need not be, the "
        "personal fields are replaced rather than the row deleted. A closed evaluation, for example, "
        "retains its scores, its weighted total and its written justification - which is the audit "
        "evidence - while the evaluator's name is replaced with a stable non-reversible identifier "
        "once the retention period for contact data has expired. The scores remain examinable; the "
        "individual is no longer identifiable from them."
    )

    doc.add_heading("4.4 Backups", level=2)
    doc.add_paragraph(
        "Backups are retained for 35 days on a rolling basis. An erasure request is satisfied "
        "against live data immediately and against backups by expiry of that window rather than by "
        "selective restoration, which is recorded in the response to the requester. Backup media is "
        "encrypted and India-resident."
    )

    # ------------------------------------------------------------------ 5
    doc.add_heading("5. Data minimisation in disclosure", level=1)
    doc.add_paragraph(
        "Retention and disclosure are separate controls. A record retained in full for audit is not "
        "therefore visible to everyone who can reach the platform."
    )
    add_table(doc, ["Viewer", "Withheld"], [
        ["Unauthenticated caller", "Turnover, GSTIN, CIN, contact data; every draft or unpublished record"],
        ["A startup", "Every record belonging to another startup; the identity of individual evaluators; any other department's pipeline"],
        ["An evaluator", "Applicant identity until their own score is submitted; applications not assigned to them"],
        ["A departmental official", "Records belonging to another department"],
        ["Platform Administrator", "No read restriction, but no ability to score, approve or sanction on a department's behalf"],
    ], widths=[1.8, 4.9])

    # ------------------------------------------------------------------ 6
    doc.add_heading("6. Known gaps", level=1)
    doc.add_paragraph(
        "This section is stated plainly because a retention policy that overstates its own "
        "implementation is worse than none. The reference build defines the schedule but does not "
        "yet automate it."
    )
    add_table(doc, ["Gap", "Effect", "Owner", "Target"], [
        ["No self-service erasure or account-closure route", "An erasure request must be handled manually through the grievance module", "Scientist-E (NIC)", "31 Dec 2026"],
        ["No scheduled retention-expiry job", "Records past their period are not erased automatically", "Scientist-E (NIC)", "31 Mar 2027"],
        ["No discrete revocable consent artefact", "Consent is evidenced by the timestamped registration action rather than by a withdrawable record", "Scientist-E (NIC)", "31 Dec 2026"],
        ["No single machine-readable data-access export", "A data principal can see all their data in the interface but cannot download it in one action", "Scientist-E (NIC)", "31 Mar 2027"],
        ["No de-identification routine", "Section 4.3 is defined but not implemented", "Scientist-E (NIC)", "31 Mar 2027"],
        ["Notice not available in scheduled languages", "Blocking for a live public deployment", "Design lead", "31 Mar 2027"],
    ], widths=[2.3, 2.3, 1.2, 0.9])
    doc.add_paragraph(
        "Each gap is also recorded on AVSAR-DPD-009 with its statutory reference, so the compliance "
        "tracker and this policy cannot drift apart."
    )

    # ------------------------------------------------------------------ 7
    doc.add_heading("7. Ownership and review", level=1)
    doc.add_paragraph(
        "The procuring department is the data fiduciary and owns this policy for its own records. "
        "The Platform Administrator operates it. A named Data Protection Officer with published "
        "contact details must be appointed before live deployment."
    )
    doc.add_paragraph("This policy is reviewed:")
    bullets(doc, [
        "every six months as a matter of course, the next scheduled review being 31 March 2027;",
        "immediately on any change to the data model that adds or removes a data category;",
        "immediately on any new integration that transfers data to or from another system;",
        "immediately on any amendment to the DPDP Act 2023, the CERT-In Directions or the General Financial Rules that affects retention.",
    ])
    doc.add_paragraph(
        "Every review produces a version increment and a dated revision note on the cover, even "
        "where the conclusion is that no change is required - so that the absence of a change is "
        "itself recorded rather than inferred from silence."
    )

    doc.save(path)
    return path
