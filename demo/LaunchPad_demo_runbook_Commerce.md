# LaunchPad — Demo Runbook (Department of Commerce / Doug Freeman)

**Who you're demoing to:** **Doug Freeman** — Director, Customer Experience Design & Digital Delivery Lead, and **Acting Responsible AI Official**, Office of the CTO (OCIO / Office of the Secretary), U.S. Department of Commerce.

**Read him this way:** a 20-year customer-experience and digital-delivery leader (Sprint, H&R Block, CenturyLink, agency-side at ITA), not a machine-learning person. His religion is **human-centered design, plain language, and customer experience**; his newest hat is **responsible AI**. He thinks in service outcomes and platforms (Commerce is a ServiceNow shop), not model internals. Keep the AI talk **outcome- and governance-oriented**, not technical. He was just named a **MeriTalk "America 250" AI Innovator (government)** — open by congratulating him.

> **Important framing — you're running the USPTO build.** USPTO is a Department of Commerce bureau, so this is honest: *"What you're seeing is live in another Commerce bureau. Here's how it maps to your shop."* The seeded use cases are written in Commerce/customer terms. The one place the USPTO origin shows is the **Strategic Alignment** step, which lists USPTO's priority set — you have a one-liner to handle that gracefully (see step 5).

**Positioning (one line):** *LaunchPad is the human-centered front door and responsible-AI governance layer for AI ideas* — one plain-language intake where staff turn rough ideas into vetted, decision-ready use cases, so a Responsible AI Official sees the whole inventory, the risk posture, and what's actually worth funding — instead of chasing shadow AI.

**Two logins you'll use:** the **submitter** (`submitter@uspto.gov` / `launchpad`) and your **admin** account (admin = reviewer + leadership tools).

---

## Why this lands for Doug (keep these threads running)

- **Human-centered + plain language.** The wizard leads with the *problem in plain English*, and Scout coaches a non-technical submitter to clarity. That's his discipline, made operational. Lean on it harder than the architecture.
- **Customer experience as the headline use case.** The centerpiece is a **plain-language, multilingual, accessible public assistant** — exactly the CX/digital-delivery problem he owns.
- **Responsible AI as the governance spine.** Every idea captures the mandated AI-risk disclosures (decisional impact, model sourcing, human review, PII), gets a readiness verdict, and the Decision Center **steers the lower-risk path first and flags public-facing guardrail work**. That's the Responsible AI Official's job, done for him.
- **Accessibility / 508 / plain-language statutes** (21st Century IDEA Act) are first-class, not afterthoughts.
- **Plugs into your stack, doesn't replace it.** Identity from your IdP, data from your systems of record, model from whatever you've authorized. A thin governance layer on top of sources of truth.

---

## Demo flow at a glance

- **Congratulate + frame the problem** — talk, no screen yet.
- **Log in as the submitter** → **landing page** (the human-centered front door). *(Drop the architecture/identity line while you log in.)*
- **Start a new idea** → problem-first wizard; type a vague problem live to trigger **Scout's clarifying question**.
- **Save & Exit** → land back on the dashboard → **Resume** the in-progress draft (nothing lost).
- **Solution → Value → Strategic Alignment (Scout auto-fills)** → **Feasibility & the AI-risk questions** (the responsible-AI beat).
- **Idea Overview** → run the **readiness review** → **Submit**.
- **Log in as admin** → **pipeline** (portfolio by status, readiness bars, filters).
- **Open the idea** → **Scout's reviewer read + risk panel** → **Request info (Draft with Scout)** → Send.
- **Log in as submitter** → **Action needed** → edit → **resubmit** (loop closes).
- **Log in as admin** → **Decision Center** → compare the **two customer-experience candidates** → **actionable executive briefing** (the responsible-AI money moment).
- **Admin → Form Config**: toggle fields live → **close**.

> Pacing: role switches and the briefing call eat the most time. Pre-stage all logins and **pre-generate one briefing**. Keep Scout moments short — one question, one scaffold.

---

## 0. Before you start (pre-flight)

- **Load the demo data.** Re-seed so the two customer-experience use cases are present:
  - *Plain-Language Customer Assistant for Public Services* (the centerpiece, "In review")
  - *Contact-Center Response Assistant (Agent Copilot)* (the comparison candidate, "Submitted")
  - Use your Admin **Reset demo data** action, or hit the seed route, so they land in the database.
- **Stage the in-progress draft** (for the Save/Resume beat): *Proactive Plain-Language Status Updates*. The reset stages it automatically; if you need to force it, paste this in the browser console and reload:
  ```js
  localStorage.setItem('aid-form-data', JSON.stringify({
    useCaseDescription: "Proactively tell customers, in plain language, when their application status changes — so they stop having to call or email just to ask 'where is my application?'",
    coreProblem: "Customers are left in the dark between status changes, so they generate avoidable call and email volume asking for updates — and when they do see a status, it's in language they can't understand.",
    targetAudience: "applicant", impactedUsersCount: "gt_500", publicIndicator: "public"
  })); localStorage.setItem('aid-current-step','3'); location.reload();
  ```
- **Pre-generate one Decision Center briefing** (it's the slow call, ~10–20s) on a parked admin tab.
- **Confirm Scout is live** in the deployed app (if the Anthropic key isn't live in prod, Scout silently falls back to canned scaffolds — fine, just narrate it).
- **Three tabs ready:** submitter, admin, and admin parked on the Decision Center.

---

## The walkthrough

### 1. Congratulate + frame the problem (talk, no screen) — ~2 min

Open warm: *"Before anything — congrats on the MeriTalk America 250 AI Innovator recognition. Well earned."*

Then frame in his language: *"Across Commerce, AI ideas show up everywhere — SharePoint, email, hallway conversations. For a Responsible AI Official that's the hard part: you can't govern, inventory, or prioritize what you can't see, and the public-facing ones carry the most risk. And separately, the customer-experience problem is real — people can't get plain-language answers about their applications. LaunchPad addresses both: it's the human-centered front door where any idea becomes a vetted, decision-ready, risk-scored use case — and the place you decide what's actually worth funding."*

### 2. Log in as the submitter + the landing page — ~1.5 min

Log in as **`submitter@uspto.gov`**. While logging in, deliver the **architecture + identity line casually** (preempts "is this just a form," "where does it run," "is it compliant," "who manages users"):

> *"Quick note under the hood while I log in: a standard web app — Next.js front end, Postgres, server-side APIs. The AI is Claude, server-side, never in the browser. In your environment it drops onto AWS inside your FedRAMP boundary, and Claude is already authorized at FedRAMP High and DoD IL4/5 through Amazon Bedrock in GovCloud — American-built, running inside your accredited boundary, no data leaving Commerce control. And LaunchPad isn't another place to manage users: identity and role come from your IdP via SSO — OIDC or SAML, PIV/CAC and MFA per your ICAM policy — and people/org data is read from your systems of record. We map your existing groups to the three roles. It's a thin governance layer on top of your sources of truth; we plug into your security model, not ours."*

> **Confidence note:** the Bedrock FedRAMP High / IL4/5 authorization for Claude in GovCloud is real and current (AWS + Anthropic, 2025). Safe to state as fact.

On the landing page: *"This is the front door — one plain-language place for any staff member to bring an AI idea. Notice sign-up is locked; accounts are provisioned, so nothing pollutes the inventory."*

### 3. Start a new idea — problem-first + Scout (the human-centered beat) — ~3.5 min

Click **Start a new idea**. Point out it jumps straight to **the problem in plain English**, not a solution or a technology: *"Doug, this is the human-centered part you care about — we lead with the problem and who's affected, in plain language. A lot of 'AI ideas' aren't even AI; leading with the problem catches that early."* Note the **lean, plain-language, radio-driven** steps.

**The Scout moment — type something vague, live:**

```
We want an AI chatbot on our website to help the public get answers faster.
```

Scout **asks one clarifying question with clickable options** instead of dumping feedback — and the options are real (who's the audience, what channels, is it answering from official content, what happens when it's unsure). Land the line: *"This is Claude in the back, but most of the value is in the prompts — Scout coaches a non-technical submitter toward a clear, well-scoped problem. The human stays in control; it folds your answer into a sharper problem statement instead of making you rewrite."*

Pick options, then use this as the **refined problem statement** (paste-ready):

```
Members of the public and businesses can't get fast, plain-language answers about our programs or what their application status means. Self-service content is written for insiders, isn't available after hours or in multiple languages, and pushes avoidable volume into the phone and email queues — and the burden falls hardest on first-time and limited-English customers.
```

Impacted Users → **500+**

> If he reacts to the plain-language framing: *"That's the point — the tool models the behavior we want from the AI itself: clear, human, and honest about what it doesn't know."*

### 4. Save & Exit → resume the draft — ~1 min

Hit **Save & Exit**. It drops you **back on your dashboard** with a "Draft saved" confirmation, and the **In progress** draft (*Proactive Plain-Language Status Updates*) is sitting there. Click **Resume**: *"Nothing's lost — it auto-saves every keystroke. A submitter can step away and pick up exactly where they were."* *(Note the Delete option — they can abandon a draft cleanly.)*

### 5. Solution → Value → Strategic Alignment → Feasibility — ~3.5 min

Move quickly through **Solution** and **Value** (paste-ready content below; call out the **quantified** value signal). Then the two beats that matter most to Doug.

**Strategic Alignment — the auto-fill beat.** When you land here, **Scout has already filled it in** from your earlier answers, with a banner: *"Scout filled this in — review and edit."* Land it: *"I never filled this in — Scout mapped my idea to the published priorities and flagged that I should review it. The human owns the final word."*

> **Handle the USPTO priority set (say this):** *"One honest note — this instance is the USPTO bureau's, so the priorities listed are theirs. In your stand-up we load Commerce's customer-experience and responsible-AI priorities. The point is the tool maps each idea to whatever priority set you configure — it isn't hard-coded."* (The priorities it picked here — customer/employee experience, public good, responsible AI use — map cleanly to your world anyway.)

**Feasibility & the AI-risk questions — the responsible-AI beat.** These are the **mandated disclosures**: PII / sensitive data, does the AI make a decision about a person, **model sourcing** (American-built / U.S.-hosted), and **mandatory human review**. *"Doug, this is the Responsible AI Official's view, built into intake instead of bolted on after — the EO and Commerce-mandated questions, captured on every idea so your AI use-case inventory and risk posture are a byproduct of submitting, not a separate compliance exercise."* Answer them clean for this informational, public-facing assistant: **PII = yes (scoped status lookups), decisional = No (informational only), model = American-built, human review = Yes (handoff).**

> **If a 508 / accessibility scanner comes up (likely, given his role):** *"Exactly the right check. It's accessible by construction — semantic headings, labels, keyboard operability, ARIA, built to WCAG 2.0 AA / Section 508. A scan on a prototype may flag items; full conformance with a VPAT and a Trusted Tester pass are part of standing it up. Those are fixes, not redesigns."* **Do not claim "fully 508 compliant."**

### 6. Idea Overview → readiness review → Submit — ~2 min

On **Idea Overview**, Scout drafts a **title and description** from everything entered. Then the **readiness review**: a verdict (**Ready / Needs work / Early stage**) plus an **executive summary**. *"Every submission comes out structured, comparable, risk-scored, and quality-gated before a reviewer ever sees it."* Set **Public**, then **Submit.**

### 7. Log in as admin → the pipeline — ~3 min

Log out, log in as **yourself (admin)**. Open the **pipeline**: the whole portfolio by status with **color-coded readiness bars** (green = ready, amber = needs work, red = early) — *"at a glance, here's the AI inventory and which ideas are actually decision-ready."* Show **filter by business unit and assignee** — *"every idea auto-routes to the right reviewer."*

### 8. Open the idea → Scout's reviewer read + risk panel → Request info — ~3 min

Open the *Plain-Language Customer Assistant*. Show **Scout's reviewer read** (advisory verdict, strengths, gaps, suggested disposition — *human decides*) and the **risk panel** (PII / American-built / human review / decisional). Then run the loop: **Request info → Draft with Scout** (it writes the specific gap message — here, a groundedness/508 validation ask) **→ Send.**

### 9. Log in as submitter → edit & resubmit (close the loop) — ~2.5 min

Log out, back in as the **submitter**. **Action needed** shows the returned idea with the reviewer's note. Click **Edit submission** — it reopens the real form intact, change a field, **resubmit**. *"A review isn't a dead end — the submitter edits the real record and sends it back, and the whole conversation is preserved. Same record, not a duplicate."* *(Aside: a submitter can **Withdraw** to pull it back to draft themselves.)*

### 10. Log in as admin → Decision Center → Form Config → close — ~4 min

Log out, back in as **admin**. Open the **Decision Center** and compare the **two customer-experience candidates** — the *Plain-Language Customer Assistant* (public-facing) and the *Contact-Center Response Assistant* (internal copilot). Show the **executive briefing**. *(Use the pre-generated one to skip the wait.)*

**This is the money moment for Doug.** The briefing isn't a wall of text — it's **actionable**: a single **"fund first" recommendation**, a **verdict per candidate** (Fund now / Fund with conditions / Hold), the **one gap that matters most** for each, how they differ, and the biggest portfolio gap. Land it:

> *"Watch what it does, Doug. Two ways to improve customer service — one public-facing, one internal agent-assist. It steers you to fund the lower-risk path first, and it funds the public-facing assistant **with a condition** — validate answer groundedness and Section 508 before it goes in front of the public. That's your responsible-AI judgment, surfaced automatically and honestly. It invents nothing; it names the gap."*

Then **Admin → Form Config**: toggle a couple of fields off **live**. *"Want it leaner, or want Commerce's exact questions? Ten seconds. Fully customizable, no COTS limits."*

**Close:** *"It's bespoke to you, runs on your infrastructure, points at whatever model you've authorized, captures your responsible-AI disclosures on every idea, and it's plain-language and accessible by design. We'd love your read."* Then stop and let him react.

---

## Paste-ready content — *Plain-Language Customer Assistant for Public Services*

**Problem & Users**

Core Problem:
```
Members of the public and businesses can't get fast, plain-language answers about our programs or what their application status means. Self-service content is written for insiders, isn't available after hours or in multiple languages, and pushes avoidable volume into the phone and email queues — and the burden falls hardest on first-time and limited-English customers.
```
Impacted Users → **500+**

**Solution**

Proposed Solution:
```
A retrieval-grounded assistant that answers only from official, published content and cites the source for every answer, with plain-language rewriting and multilingual support. For status questions it reads from a scoped, authenticated status API — it never stores or decides anything. Low-confidence or sensitive questions route to a person. Every interaction is logged for oversight. The assistant is informational only; it never determines eligibility or issues a decision.
```
Implementation Complexity → **Medium**

**Value**

Value to the Business:
```
Deflects a large share of repetitive contact-center volume to self-service, shortens response times, and raises trust and accessibility for the public — letting staff focus on the complex cases that actually need a person.
```
Estimated Cost / Time Savings → **$250K–$1M**

**Strategic Alignment** — Scout auto-fills. *(If setting manually: customer/employee experience + bring innovation to the public good + responsible AI use.)*

**Feasibility & risk questions**
- Uses PII / sensitive data → **Yes** (scoped, authenticated status lookups)
- AI makes a decision about a person → **No** (informational only)
- AI model sourcing → **American-built (commercial)**
- Mandatory human review → **Yes** (handoff on sensitive / low-confidence)

**Success Metrics**
```
Self-service deflection rate, human-rated answer groundedness/accuracy (target: high, with zero un-cited guidance), customer satisfaction, time-to-answer, escalation rate, and language coverage — measured in a pilot against a control.
```
Timeline for Results → **6–12 months**

**Idea Overview** — accept Scout's draft, or:
- Title: `Plain-Language Customer Assistant for Public Services`
- Public / Excluded → **Public**

---

## If something breaks
- **Scout returns generic text** → API key not live in prod; narrate ("Scout's drafting here") and move on.
- **Briefing spins** → use the pre-generated one; "heavier call, we're tuning performance."
- **Strategic Alignment auto-fill doesn't fire** → there's a Scout fill / re-suggest prompt right on the step; click it, or set focus areas manually.
- **The two CX use cases aren't there** → re-run the seed/reset; they're the most recent two in the pipeline.
- **The draft isn't on the dashboard** → paste the console snippet in the pre-flight, reload.

## Likely questions (quick answers)
- **"Is this just a web form?"** No — Claude server-side produces structured, comparable, risk-scored data and coaches the submitter. A form can't.
- **"Does the AI make decisions?"** No. Advisory, human-in-the-loop by design — and it actively flags decisional AI without human review as a risk.
- **"How does this help me as the Responsible AI Official?"** Your AI use-case inventory and risk posture become a byproduct of intake; the Decision Center makes the fund/hold call defensible and names gaps honestly.
- **"Is it accessible / 508?"** Accessible by construction, WCAG 2.0 AA target; full conformance (VPAT + Trusted Tester) is part of stand-up.
- **"Can we customize the questions and priorities?"** Yes — live, in Form Config; priorities and fields are configured per tenant, not hard-coded.
