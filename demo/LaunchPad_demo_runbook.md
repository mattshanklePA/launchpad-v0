# LaunchPad — Demo Runbook

**Audience:** Ramesh (acting CAIO, pragmatic, *obsessed with lean*, focused on the **value/outcomes** of AI initiatives), Scott Barker (experience-design PO), Chris (facilitating, already sold), Jonathan (your champion).

**Positioning (one line):** *LaunchPad is the governable front door for AI ideas at USPTO* — one intake where staff turn rough ideas into vetted, decision-ready use cases, so leadership sees the whole pipeline and decides what's worth funding instead of chasing shadow AI.

**Two logins you'll use:** the **submitter** (`submitter@uspto.gov` / `launchpad`, "USPTO Submitter" — assigned to you as reviewer) and **your own admin** account. Admin = reviewer + admin tools, so it covers both the pipeline review and the leadership views.

---

## Demo flow at a glance

- **Frame the problem** — talk, no screen yet.
- **Log in as the submitter** → land on the public **landing page** (the "governable front door"). *(Drop the architecture line while you log in.)*
- **Start a new idea** → problem-first wizard; type something vague first to trigger **Scout's clarifying question**.
- **Save & Exit** → lands back on the **dashboard**; reopen via **Resume** to show nothing is lost.
- **Work through** Solution → Value → **Strategic Alignment (Scout auto-fills it)** → Feasibility & the **AI-risk questions**.
- **Idea Overview** → run the **AI readiness review** (Ready / Needs work + exec summary) → **Submit**.
- **Log out → log in as admin (you).**
- **Pipeline view** → portfolio by status, **color-coded readiness bars**, filter by business unit / assignee.
- **Open the idea** → **Scout's reviewer read** + **risk panel** → **Request info** (Draft with Scout) → Send.
- **Log out → log in as the submitter** → **Action needed** → **Edit submission** → change a field → **resubmit** (loop closes, conversation preserved).
- **Log out → log in as admin** → **Decision Center**: compare 2–3 → **executive briefing**.
- **Admin → Form Config**: toggle fields live (lean, no COTS limits) → **close**.

> Pacing: switching roles and the Decision Center briefing eat the most time. Pre-stage all logins and pre-generate one briefing. Keep Scout moments short — one question, one scaffold.

---

## The walkthrough

### 0. Before you start (have this ready)
- Three browser tabs/logins pre-opened: **submitter**, **admin** (you), and a second admin tab parked on the **Decision Center** with a **pre-generated briefing** (it's the slow call, ~20s).
- **Lean form config set** (Admin → Form Config → keep on: impacted users, implementation complexity, business value, cost/time savings, strategic focus areas, success metrics, timeline; everything else off). This is Ramesh's #1 reaction point.
- Confirm Scout returns a real, specific answer in the deployed app (if the Anthropic key isn't live in prod, Scout silently falls back to canned scaffolds).
- Have the **trademark use-case content** handy to paste (problem/solution/value/metrics for "AI-Assisted Conflicting-Mark Search").

### 1. Frame the problem (talk, no screen) — ~1.5 min
"Right now AI ideas at USPTO are decentralized — they come through SharePoint, email, hallway conversations. There's no single governable front door, and no consistent way to see what's worth funding. Ramesh, you've said the question now is *what value these initiatives actually bring*. That's what LaunchPad answers."

### 2. Log in as the submitter + show the landing page — ~1.5 min
Log in as **`submitter@uspto.gov`**. While you're logging in, deliver the **architecture line casually** — it preempts "is this just a form," "where would it run," and "is the model compliant":

> *"Quick note on what this is under the hood while I log in: a standard web app — Next.js front end, Postgres database, server-side APIs. The AI is Claude, running server-side, not in the browser. In your environment it drops onto AWS — Postgres becomes RDS or Aurora, hosting becomes ECS or Fargate, all inside your FedRAMP boundary. And Claude is already authorized at FedRAMP High and DoD IL4/5 through Amazon Bedrock in AWS GovCloud, so the model runs inside your accredited boundary, it's American-built, and no data leaves USPTO control."*

> **Confidence note:** the Bedrock FedRAMP High / IL4/5 authorization for Claude in AWS GovCloud is real and current (AWS + Anthropic, 2025). Safe to state as fact.

On the landing page: "This is the front door. One place for any staff member to bring an AI idea — and notice sign-up is locked; accounts are provisioned, so nothing pollutes the pipeline."

### 3. Start a new idea — problem-first + Scout — ~3 min
Click **Start a new idea**. Point out it jumps straight to **the problem**, not the solution: *"the finding is people have 'ideas' that aren't even AI — we lead with the problem so we catch that early."* Call out the **lean, two-field, radio-driven** steps: *"Ramesh, you wanted three questions — we'll show you how you control that at the end."*

**The Scout moment:** type something vague (e.g. "AI to help attorneys find similar marks"). Scout **asks one clarifying question with clickable options** instead of dumping feedback — and the options are domain-real (search strategies, design codes, goods/services relatedness). Land the line: *"This is Claude in the back. Most of the IP is in the prompts — Scout knows trademark examination; it's not a generic chatbot. It coaches; the human stays in control."* Pick an option and note it **folds your answer into a sharper problem statement** rather than making you rewrite.

Paste the real problem when ready: *"Trademark examining attorneys manually search for confusingly similar prior marks across word, design, and goods/services dimensions. Searches vary between attorneys, similar marks get missed, and that drives pendency and inconsistent likelihood-of-confusion refusals."*

> **If anyone runs an accessibility scanner (axe/Lighthouse):** *"Exactly the right check. It's accessible by construction — semantic headings, labels, keyboard operability, ARIA on the interactive pieces, tested to WCAG 2.0 AA, the Section 508 standard. A scan on a prototype may flag items; full conformance with a VPAT and a Trusted Tester pass are part of standing it up. Those are fixes, not redesigns."* **Do not claim "fully 508 compliant."**

### 4. Save & Exit → reopen the draft — ~1 min
Hit **Save & Exit**. It drops you **back on your dashboard** (not some random page) with a "Draft saved" confirmation. Point to the **In progress** draft and click **Resume**: *"Nothing's lost — the wizard auto-saves every keystroke. A submitter can walk away and come back."* *(Optional: note the **Delete** button next to Resume — they can abandon a draft cleanly.)*

### 5. Solution → Value → Strategic Alignment → Feasibility — ~3 min
Move quickly through **Solution** and **Value** (paste the prepared content; call out the **quantified** cost/time savings — *"this is the value signal leadership triages on"*).

**Strategic Alignment — the auto-fill beat (new):** when you land here, **Scout has already filled it in** from your earlier answers — focus areas, alignment language — and a banner says *"Scout filled this in… please review and edit."* Land it: *"I never filled in strategic alignment. Scout did it from what I told it — and it flags that I should review it. The human still owns the final word."* The selected priorities are **highlighted** so you can see exactly what it chose.

**Feasibility & the AI-risk questions:** these are the **mandated** disclosures — PII / sensitive data, does the AI make a decision about a person, model sourcing (American-built / U.S.-hosted), mandatory human review. *"This is the governable part — the DoC- and EO-mandated questions, built into the intake, not bolted on after."* Answer them clean (No PII, informational-only, American-built, human-in-the-loop) so the risk profile is green.

> **If asked about security / who can see what:** *"Today this is demo-grade — sessions and three roles, all data access server-side, the database credential never reaches the browser. In your environment we adopt your standards: federate to your IdP via OIDC or SAML through Cognito or an ALB, PIV/CAC and MFA per your ICAM policy, map your IdP groups to the three roles, and enforce row-level security in Postgres so a submitter only ever sees their own records at the database layer. We don't ask you to trust our security model — we plug into yours."*

### 6. Idea Overview → AI readiness review → Submit — ~2 min
On the **Idea Overview** step, Scout drafts a **title and description** from everything entered. Then the **readiness review**: a verdict (**Ready / Needs work / Early stage**) plus an **executive summary**. *"Every submission comes out structured, comparable, and quality-gated before it ever reaches a reviewer."* **Submit.**

### 7. Log out → log in as admin → the pipeline — ~3 min
Log out, log in as **yourself (admin)**. Open the **pipeline**: the whole portfolio by status, with **color-coded readiness bars** (green = ready, amber = needs work, red = early) — *"at a glance, here's which ideas are actually decision-ready."* Show **filter by business unit and assignee** (multi-select): *"every idea is auto-routed to the reviewer for its business unit."*

> **If asked "can it pull people/roles from our systems of record (Dataverse, Oracle APEX)?":** *"Yes — and it should. The tool shouldn't be another place you maintain people and roles. Identity and group membership come from your IdP via SSO. Reference data — people, products, org units — is read from the authoritative source: Dataverse via its OData Web API, or Oracle/APEX via ORDS. 'Role' and 'business unit' are already first-class here — we route reviewers by business unit today — so swapping seeded users for a live feed is a contained integration. The tool stays a thin governance layer on top of your sources of truth."*

### 8. Open the idea → Scout's reviewer read + risk panel → Request info — ~3 min
Open the idea you just submitted. Show **Scout's read** (advisory verdict, strengths, gaps, suggested disposition — *human decides*) and the **risk panel** (PII / American-built / human review / decisional). Then run the loop: **Request info → Draft with Scout** (it writes the specific gap message) **→ Send.**

### 9. Log in as the submitter → Edit & resubmit (close the loop) — ~2.5 min
Log out, back in as the **submitter**. **Action needed** shows the returned idea with the reviewer's note. Click **Edit submission** — it **reopens the actual form** with everything intact, change a field, and **resubmit**. *"A review isn't a dead end — the submitter edits the real submission and sends it back, and the whole conversation is preserved. It updates the same record, not a duplicate."* *(Optional aside: a submitter can also **Withdraw** a submission to pull it back to draft themselves — they're never locked in.)*

### 10. Log in as admin → Decision Center → Form Config → close — ~3 min
Log out, back in as **admin**. Open the **Decision Center**, compare **2–3** ideas, and show the **executive briefing** — quantified value, strategic alignment, risk, and a recommendation, side by side. *(Use the pre-generated one to skip the wait.)* *"This is the leadership view — this is how you decide what to fund."*

Then **Admin → Form Config**: toggle a couple of fields off **live**. *"Ramesh — you wanted it leaner? Ten seconds. Fully customizable; no COTS limits."*

**Close:** *"It's bespoke to you, runs on your infrastructure, points at whatever model you approve, and it's customizable as you learn. We'd love your read on it."* Then stop and let them react.

---

## If something breaks
- **Scout returns generic text** → API key not live in prod; talk through it ("Scout's drafting here") and move on.
- **Briefing spins** → use the pre-generated one; "this is a heavier call, we're tuning performance."
- **A status/assignee looks wrong** → fall back to a different seeded example.
- **Auto-fill on Strategic Alignment doesn't fire** → there's a "Fill with Scout" button right there; click it, or fill the focus areas manually.

## Other likely questions (quick answers)
- **"Is this just a Microsoft Form?"** No — real intelligence (Claude) server-side; it produces structured, comparable data and a readiness score, and coaches the submitter. A form can't.
- **"Does the AI make the decisions?"** No. Advisory only, human-in-the-loop by design — and the tool actively flags decisional AI without human review as a risk.
- **"Can we have the code / is it GitLab?"** It's in a repo and can be shared. *(Defer terms: "great question — let me sync with my team and come back to you.")*
- **"Multi-draft / scale?"** Single in-progress draft per user today; scales fine, multi-draft is on the roadmap.
- **"PII / data security?"** Demo uses no real data; the mandated risk questions are built in; real deployment scopes data access and adds row-level security.
