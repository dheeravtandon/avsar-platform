# AVSAR — Every Feature, Explained Like You're Five (Well, Twenty-Five)

**Document ID** AVSAR-LAY-012 · **Version** 1.0 · **Date** 04 September 2026 · **Status** Living
**Prepared by** TandSol · **Classification** Internal — team preparation
**Related** AVSAR-HBK-001 (README) · AVSAR-QAB-011 (Question bank) · AVSAR-SDD-005 (Design)

This document has one job: if someone points at any screen, any button, or any word like
"eligibility gate" or "hash-chained audit log" and asks *"okay but what does that actually mean"* —
the answer is in here, in plain words, with an analogy that sticks.

No code in this document. If you want the code, the file path is given at the end of each section —
open the linked source file directly for that.

---

## 1. The big idea, in one sentence

**A government department says what problem it has and what "fixed" looks like in numbers. Startups
apply. The system checks they're legally allowed to apply, an explainable evidence engine evaluates the good ones, the winner
gets a small paid trial run, and only if that trial actually works does the government sign a real
contract — and other departments can then buy the same thing without redoing any of this.**

Think of it like a hiring pipeline, except the "candidate" is a piece of technology and the "job" is
solving a government problem. Nobody gets a permanent contract without first passing a background
check, an interview, and a paid trial period.

---

## 2. The five stages (this is where the name comes from)

**AVSAR** = **A**ssess → **V**alidate → **S**andbox → **A**dopt → **R**amp-up. It also means
"opportunity" in Hindi, which is not an accident.

| Stage | What it means in plain words | Real-world comparison |
|---|---|---|
| **Assess** | The department writes down the problem and what "success" looks like as a number — not what software to build. | Posting a job listing that says "we need someone who can cut delivery time by 30%," not "we need someone who knows exactly this one tool." |
| **Validate** | The system checks that the startup is legally who it says it is, then a versioned evidence engine evaluates the applications. | Checking a job candidate's ID, evidence and references against the same published decision rules. |
| **Sandbox** | The winning startup gets a small, time-boxed, paid trial to prove the idea actually works in the real world. | A 90-day probation period before a job becomes permanent. |
| **Adopt** | If the trial worked, the department signs a real contract — and has to write down, in words, exactly why. | Confirming the hire, with HR keeping a note of exactly why this person was chosen. |
| **Ramp-up** | Once one department has proven a solution works, any other department can just buy it too, at the same price, without repeating the whole process. | If one branch of a company hires a great contractor, every other branch can hire the same person on the same terms without re-interviewing them. |

**File:** [server/src/services/workflow.js](../server/src/services/workflow.js)

---

## 3. The eligibility gate — "are you even allowed to apply?"

**In plain words:** Before a startup's application is even looked at by a human, the system runs six
automatic yes/no checks. If any required check fails, the application is stopped right there and the
startup is told exactly which rule it failed — not just "rejected."

**The checks, in human language:**
1. Does this company have a valid "recognised startup" certificate from the government (DPIIT)? Has it expired?
2. Is the company younger than 10 years old? (Older companies don't need this special track — they use the normal tender process.)
3. Has the company made more than ₹100 crore in a single year? (If yes, it's not really a "startup" anymore for this purpose.)
4. Is this a genuinely new company, or is it just an old company that renamed itself to look new? (That's not allowed.)
5. Is it registered as the right kind of legal entity (private limited company, LLP, or partnership)?
6. Has someone verified its tax and company registration numbers?

**Why it matters:** This is the single biggest reason startups normally can't sell to the government —
old-fashioned tenders ask "how many years have you been in business" and "show us three past
government clients," which automatically disqualifies any young company no matter how good their
product is. This gate flips that: instead of blocking young companies, it uses their "young company"
status as the *reason* they qualify for special treatment (no security deposit, no tender fee, faster
payment).

**Analogy:** It's an airport security checklist. The queue doesn't stop and argue with you — either
you have a valid boarding pass and ID, or you don't, and if you don't, the screen tells you exactly
which document is missing instead of just saying "denied."

**File:** [server/src/services/eligibility.js](../server/src/services/eligibility.js)

---

## 4. The matching engine — "which startups should this department even look at?"

**In plain words:** A department publishing a problem doesn't have to manually scroll through every
registered startup. The system automatically ranks every eligible startup against that specific
problem and shows the top matches with a score out of 100 — and, importantly, *shows its work*, so a
department can see exactly why a startup scored high or low.

**What it scores on:**
- Does the startup work in the same industry/sector as the problem? (worth the most points)
- Does the startup's stated skills/tags overlap with what the problem needs?
- Is the startup's technology mature enough for what's being asked? (Not too early-stage, not
  over-qualified.)
- Has this startup successfully delivered for a government client before? (a bonus, never a
  requirement — this never blocks a first-time applicant)
- Is the startup based nearby, if that matters for this problem?

**Why "shows its work" matters:** A black-box "AI recommendation" that a department can't explain
would never survive an audit ("why did you pick this company and not that one?"). Every point on the
scorecard has a plain-English reason attached, so a department officer can literally read out the
justification.

**Analogy:** It's a resume-matching tool for a job posting, except every match comes with a note
saying *"85/100 — strong sector match, all required skills present, technology maturity right where
we need it, first-time government supplier (not held against them)."*

**File:** [server/src/services/matching.js](../server/src/services/matching.js)

---

## 5. The evaluation panel — "who actually picks the winner?"

**In plain words:** An authorised evaluator starts a blind, automated evidence assessment. The
versioned server-side engine combines the facts AVSAR already holds about eligibility, capability,
problem fit, references, governance, finance, security, scalability and pilot readiness.

**Why it is explainable:** Weak evidence reduces otherwise high claims. Hard gates such as an
eligibility failure or critical security risk override the weighted average. The result contains the
final score, risk level, recommendation, positive and negative factors, mandatory review flags and a
list of information AVSAR could not verify.

**What remains human:** The evaluator must declare conflict of interest and initiate the calculation.
Authorised officials still make shortlisting, pilot and procurement decisions. The algorithm never
awards a contract automatically.

**Blind evaluation:** The applicant's identity is withheld until the result is submitted and locked.
The engine receives the application file code rather than the startup's legal name.

**Important:** This is deterministic evidence scoring, not a generative-AI opinion. Running the same
algorithm version on the same records produces the same answer.

**Files:** [server/src/services/evaluationEngine.js](../server/src/services/evaluationEngine.js) and
[server/src/services/automatedEvaluation.js](../server/src/services/automatedEvaluation.js)

---

## 6. The pilot — "the paid trial run"

**In plain words:** Before any real money-on-the-line contract is signed, the winning startup runs a
small, short, funded pilot — think of it as a "proof it actually works" phase, not a "build the whole
thing and hope" phase.

**How the money is protected:** The pilot's budget isn't handed over in one lump sum. It's split into
**milestones** — checkpoints, each worth a percentage of the total budget. The startup only gets paid
for a milestone after they submit evidence and a government reviewer approves it. If a milestone is
rejected, the startup fixes it and resubmits — the money for that step simply doesn't move until the
work is actually accepted.

**How "did it work" is measured, not guessed:** Every pilot has specific numeric KPI targets set from
day one (e.g. "reduce average processing time from 12 days to 4 days"). The startup (or the
department) logs actual readings against those targets over time, and the system automatically
calculates a percentage: *"currently achieving 78% of target."* At the end, the pilot gets one of
three honest verdicts — **Success**, **Partial success**, or **Failed** — recorded with a written
reason. A failed pilot is not a black mark that follows the startup forever; it's just information.

**Analogy:** It's a home renovation contract paid in stages — you don't pay the contractor the full
amount up front; you pay after the plumbing is inspected and approved, then after the electrical is
inspected and approved, and so on. And you're tracking a real number the whole time (e.g. water
pressure before vs. after) instead of just trusting someone's word that it's "better now."

**Files:** [server/src/routes/pilots.js](../server/src/routes/pilots.js)

---

## 7. Turning a successful pilot into a real contract

**In plain words:** A department can't just decide to buy something because they liked it — the
system requires the pilot to have a recorded "Success" or "Partial success" verdict *first*, and it
requires a written justification for exactly which government purchasing rule is being used and why.
That justification is saved permanently, not just typed and forgotten.

**The four ways a purchase can happen** (each is an existing government rule, nothing invented):
- **Single source** — "we tested this, only this solution meets our needs, we're buying directly
  from them" (used when the pilot clearly proved out one specific solution).
- **Limited tender** — "more than one pilot succeeded, so we're getting price quotes from just that
  small proven group" (not the whole open market, just the startups who already proved themselves).
- **GeM direct** — buying through India's official government online marketplace.
- **Rate contract** — a pre-agreed price and terms that *any* department can use, not just the one
  that ran the pilot.

**Analogy:** It's the difference between "we're hiring this contractor because we already trialed
their work and it was great, here's our written reasoning" versus just picking a name out of a hat.

**File:** [server/src/routes/procurement.js](../server/src/routes/procurement.js)

---

## 8. The Proven Solutions Registry — "buy once, reuse everywhere"

**In plain words:** Once a solution has been through a successful pilot *and* has a signed contract,
it gets listed in a shared catalogue that every other government department can browse. Any other
department can then "adopt" it — meaning they place their own order against the *same* agreed price
and terms — without running their own pilot, their own evaluation panel, or their own discovery
process from scratch.

**Why this is the biggest time-saver in the whole system:** Normally, if the Water Department in one
city finds a great flood-sensor startup, the Water Department in the next city over has no way of
knowing that happened — they'd start their entire multi-month process over from zero. This registry
means the second department can literally click "adopt," specify a quantity, and skip straight to
placing an order.

**Analogy:** It's exactly like a franchise model, or a company-wide approved vendor list — once Legal
has vetted and approved a supplier for one office, every other office in the company can just order
from that same supplier without re-doing the legal review.

**File:** [server/src/routes/catalogue.js](../server/src/routes/catalogue.js)

---

## 9. The 45-day payment clock

**In plain words:** Once a startup's milestone work is accepted, the system automatically calculates
a payment due date 45 days later and starts tracking it. If that date passes and the invoice still
isn't marked "paid," the system flags it as **overdue** — visible on a dashboard, not buried in email
threads.

**Why 45 days specifically:** It's not a made-up number — it's a legal requirement under Indian law
(the MSMED Act) for how quickly small businesses have to be paid once their work is accepted. Big
companies can survive being paid late; a small startup often can't. The system doesn't let that
deadline quietly slip.

**Analogy:** It's a bill with an automatic "days overdue" counter, the kind a bank shows you on a
loan — except here the government is the one being tracked, so a startup and a department both know
exactly where things stand at any moment, instead of a startup having to chase someone for money.

**File:** [server/src/routes/procurement.js](../server/src/routes/procurement.js) (payment ledger section)

---

## 10. The tamper-evident audit trail

**In plain words:** Every important action in the system — a problem statement approved, an
application submitted, a score entered, a payment released — gets written into a permanent activity
log. But this log has one special property: **each entry is mathematically linked to the entry before
it**, so if anyone ever tried to sneak in and quietly edit or delete a past entry, every single entry
written *after* that point would instantly stop matching up. There's a built-in check that scans the
whole chain and says "intact" or "broken, right here."

**Why this matters for government work:** Auditors (like India's CAG — the government's official
auditor) need to trust that a record wasn't altered after the fact to cover something up. A normal
database log can be quietly edited by anyone with admin access and no one would ever know. This one
can't be — not without it being detectable.

**Analogy:** It's the same trick blockchains use, minus the cryptocurrency part — think of it like a
police evidence log where each new entry has to physically reference the exact page number and
content of the entry before it. Tear out or alter page 12, and page 13 onward visibly no longer lines
up.

**File:** [server/src/services/audit.js](../server/src/services/audit.js)

---

## 11. Who can do what — roles and permissions

**In plain words:** Not everyone who logs in sees the same thing or can do the same things. The
system has seven types of accounts, and each one is only allowed to do what that job would actually
be trusted to do in real life:

| Role | What they can do | What they can't do |
|---|---|---|
| **Startup** | Apply to problems, run their pilot, submit milestone evidence | Evaluate their own application, approve their own payment |
| **Nodal Officer** | Draft problem statements, assign an authorised evaluator | Approve and publish it themselves (needs sign-off) |
| **Department Head** | Approve/publish problem statements, sanction procurement | — |
| **Evaluator** | Declare conflicts and initiate the evidence engine for assigned applications | Change a locked result or see the applicant identity before submission |
| **Pilot Monitor** | Review milestone evidence, record the final pilot verdict | Approve their own department's budget |
| **Procurement Officer** | Draft and process the actual purchase paperwork | Approve their own draft (needs Department Head sign-off) |
| **Admin** | Sees and manages everything, for platform operation | — |

**Why the "can't approve your own work" pattern matters:** This is the same principle as "you can't
be your own manager" — a nodal officer can *draft* a problem statement, but only the Department Head
can *approve* it. A procurement officer can *draft* a purchase, but only the Department Head can
*sanction* it. This isn't red tape for its own sake — it's what stops one person from being able to
quietly approve their own decisions.

**Analogy:** It's like a set of building keys where the receptionist's key opens the lobby but not the
server room, and the security guard's key opens every door but they still need someone else's sign-off
to authorize a new hire. Everyone gets exactly the access their job needs, nothing more.

**File:** [server/src/middleware/auth.js](../server/src/middleware/auth.js)

---

## 12. How "logging in" actually works (JWT, in plain words)

**In plain words:** When you log in, the system doesn't remember you by keeping a note in its own
memory (that gets complicated and slow). Instead, after checking your password, it hands your browser
a signed digital "wristband" (a token) that says who you are and what role you have. Every time you
click something afterward, your browser shows that wristband, the system quickly checks it's genuine
(it has a tamper-proof digital signature), and lets the action through — without needing to look
anything up in a big list of "who's currently logged in."

**Why this matters practically:** It's what lets the system run as lightweight, on-demand pieces
(see section 15, "serverless") instead of one big always-on computer — because nothing needs to be
"remembered" between requests except the wristband itself.

**Analogy:** It's a wristband at a festival or concert — security doesn't need to look you up in a
guest list every time you walk past a gate; they just glance at the wristband and check it's not a
forgery.

**File:** [server/src/middleware/auth.js](../server/src/middleware/auth.js)

---

## 13. The workflow rules — "you can't skip steps"

**In plain words:** A problem statement, an application, a pilot, and a purchase order each move
through a fixed sequence of stages (draft → published → closed → ..., etc.), and the system flatly
refuses any attempt to jump stages out of order — for example, you cannot mark a pilot "Successful"
if it was never even marked "Active" first, and you cannot issue a purchase order for a pilot that
never got a Success/Partial verdict.

**Why this matters:** Without this, it would be technically possible for someone to skip the "did the
trial actually work" step entirely and go straight to "sign the contract" — which defeats the entire
point of the system. This isn't a suggestion in a policy document that a busy person might forget to
follow; it's a rule the software itself enforces, the same way an ATM simply won't let you withdraw
money before it's verified your PIN.

**Analogy:** It's like an assembly line with physical guards on it — you literally cannot bolt on the
wheels before the frame exists; the machine won't let the next part move down the line until the
previous step is done.

**File:** [server/src/services/workflow.js](../server/src/services/workflow.js)

---

## 14. Notifications and grievances

**In plain words — notifications:** Whenever something relevant happens to you (your application was
shortlisted, a milestone was approved, a payment is now overdue), the system drops a message in your
in-app inbox. It's a simple, quiet alert system — no one has to remember to check on things manually.

**In plain words — grievances:** If a startup thinks something was handled unfairly (a rejection they
don't understand, a payment that's late, a scoring dispute), they can file a formal complaint right
inside the platform. That complaint automatically gets a **15-day resolution deadline** stamped on it
the moment it's filed, and it shows up as overdue on an official's dashboard if that deadline passes
unaddressed — the same way the payment deadline does.

**Analogy:** Notifications are like the notification bell on any app you already use. The grievance
system is like a formal customer-complaint ticket that automatically escalates itself if nobody
responds in time — it doesn't rely on the complainer having to follow up.

**Files:** [server/src/services/notify.js](../server/src/services/notify.js),
[server/src/routes/misc.js](../server/src/routes/misc.js)

---

## 15. The transparency dashboard — the public can watch too

**In plain words:** Anyone — not just logged-in officials — can visit a public page and see real,
live numbers: how many problem statements have been published, how many applications came in, how
many made it through the eligibility gate, how many pilots succeeded, how much money has actually
been committed and spent, and how long each stage is *actually* taking on average (compared to the
9–18 months a normal tender process typically takes).

**Why this matters:** A system that only officials can see invites the question "how do we know
you're not just making this up." A public, always-live dashboard answers that by default — anyone can
check the platform's own numbers against its own claims, at any time.

**Analogy:** It's a live public scoreboard, the same idea as a "server status" page a company
publishes so customers can check uptime for themselves instead of taking the company's word for it.

**File:** [server/src/routes/dashboard.js](../server/src/routes/dashboard.js)

---

## 16. Where the data actually lives

**In plain words:** All of this information — every startup, every application, every score, every
pilot reading, every payment — is stored in a single, self-contained database file, using a very
lightweight built-in database technology (`node:sqlite`, part of Node.js itself — no separate database
software had to be installed or configured). It's simple by design: fast, easy to inspect, and
requires nothing extra to run.

**The honest trade-off (worth knowing, not hiding it):** On the live deployed demo, this database file
lives in temporary storage that gets wiped and automatically **re-seeded with a full, realistic demo
dataset** every time the server "wakes up" from being idle. That's a deliberate choice for a
demo/hackathon environment — it guarantees the demo always opens in a clean, coherent state instead of
an empty or half-broken one. For a permanent real-world deployment, this would be swapped for a
proper always-on database (Postgres or a hosted SQLite-compatible service) — a swap the code is
already structured to make easy, since all database access goes through one small set of helper
functions in one file.

**Analogy:** It's like the difference between keeping your notes in a single well-organized notebook
(what this is) versus a filing cabinet with a dozen separate folders you have to coordinate by hand
(a bigger, heavier database system). For a demo, the notebook is faster and just as accurate; for a
building full of people all writing in it at once for years, you'd eventually want the filing cabinet.

**File:** [server/src/db/index.js](../server/src/db/index.js)

---

## 17. How the website is actually hosted (serverless, in plain words)

**In plain words:** Instead of renting one computer that runs 24/7 whether anyone's using the site or
not, the site runs on "serverless" hosting (Vercel) — which means the actual code only spins up and
runs *at the exact moment* someone makes a request, and then shuts back down. You're never paying for
or running idle computer time.

**Why the database gets "wiped" on cold starts (tying back to section 16):** Because each spin-up is
a fresh, temporary environment, anything written to disk during one request doesn't automatically
carry over to the next spin-up unless it's saved to a proper always-on database. That's the trade-off
that comes with this hosting style — and again, it's a known, deliberate choice for this stage of the
project, not an oversight.

**Analogy:** It's the difference between owning a restaurant that's open (and staffed, and costing
money) 24 hours a day, versus a food truck that only shows up, cooks, and serves when there's actually
a customer standing there — cheaper, but it also means the food truck doesn't remember yesterday's
leftovers unless someone specifically restocks it each morning.

**File:** [server/src/app.js](../server/src/app.js), [api/index.js](../api/index.js)

---

## 18. Quick-reference glossary

| Term used in the app | What it actually means |
|---|---|
| DPIIT recognition | The official government certificate that says "yes, this is legally a startup," issued by the Department for Promotion of Industry and Internal Trade. |
| TRL (Technology Readiness Level) | A 1–9 scale for "how proven is this technology" — 1 is a raw idea, 9 is something already working in the real world at scale. |
| KPI (Key Performance Indicator) | The specific number being tracked to decide if something is working (e.g. "average wait time in minutes"). |
| GFR (General Financial Rules) | The rulebook the Indian government already uses for how it's allowed to spend money — this platform doesn't bypass it, it applies it. |
| EMD (Earnest Money Deposit) | A refundable deposit normally required just to be allowed to bid — DPIIT-recognised startups are legally exempt from this, and the platform applies that exemption automatically. |
| Milestone | A checkpoint inside a pilot — a piece of work that has to be finished and approved before the next slice of the budget is released. |
| Verdict | The final, one-word, on-the-record outcome of a pilot: Success, Partial, or Failed. |
| Rate contract | A pre-agreed price and set of terms that stays valid for a period of time, so anyone can buy at that price without renegotiating. |

---

*If a judge or reviewer asks about something not covered here, the honest answer is almost certainly
one paragraph in the [source file] linked next to the relevant section above — this document was
written by walking through every route and service file in the codebase, not written first and coded
to match.*
