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

## "How do we get this?" — the acquisition & IP conversation

This question **will** come up — Doug came to you through **Scott Merker (USPTO)**, who raised exactly this concern and who pushed the Commerce-wide vision. So Doug likely already has Scott's framing. Get ahead of it, be forthright, lay out the paths, and signal you're already working the structure behind the scenes. Do **not** wing the legal terms in the room.

### The concern, named honestly (say it before he has to)
> *"Scott raised the right question, and I want to put it on the table myself: under federal rules, code the government pays to develop — or that a government employee writes — can fall into the public domain under a CC0 license. We never want that to erode the product, and you never want to be locked into us. So we've designed the deal specifically to avoid that, and our counsel is finalizing it now."*

### How we keep it clean (the structure)
- **Commercial product, licensed — not custom-built for hire, not transferred.** LaunchPad was built at Packaged Agile's private expense. The federal open-source / source-code policy reaches *custom code the government funds*, not a commercial product you license. That's the whole game.
- **The core stays ours; government-funded work happens only in a thin adapter layer.** Identity, your AI endpoint, storage, connectors, branding, field config — that integration layer is where any government-paid work lives, cleanly separated from the proprietary core. So even when your people are "hands on keyboard," they're working the adapter, not the core. (This is the architecture boundary in `docs/BOUNDARY.md` / `docs/ARCHITECTURE.md` — it's an IP-protection boundary as much as a technical one.)
- **A generous but scoped entry, so we never give the whole department away.** Lead with a free pilot, a free first bureau, or free access for DoC HQ / OCTO governance users (whatever lands). Beyond that scope, bureaus are licensed as we expand, and you pay for **our people** on rollout (configuration, integration, hosting, support). The free piece is the wedge to get in and prove value, not a free department-wide license across the 13 bureaus. This also fits Doug's own framing: Commerce wants to leverage its purchasing power and fund this cost-effectively at the enterprise level.
- **We host it; source isn't handed over** (see *Hosting* below), with **source-code escrow** (not open source) for your continuity comfort.

### Free to start, paid to scale — how the money works (and why it's clean of CC0)

This is the heart of the question, so be crisp. The entry is **free but scoped** (a pilot, a first bureau, or the DoC governance layer), and we bill our **people's time (FTE hours)** for the rollout: configuration, customization, integration with your systems, hosting, and support. As it expands across bureaus, the bureaus are licensed. So how do we charge for real build work, and license across the bureaus, without that code falling into CC0/public domain?

- **The CC0 rule bites two things — and our model avoids both.** It reaches (1) *custom code the government funds and takes delivery of*, and (2) *code a government employee writes* (automatically public domain). In our model **our engineers do the build, not yours**, and the deliverable is a **running, configured, hosted system — a service outcome — not a pile of source code handed to the government to own.** No government-owned code, nothing to open-source.
- **The valuable core is pre-existing commercial software, built at our private expense.** It's *licensed*, not developed-for-hire under your contract — so the federal source-code / open-source mandate (which targets custom-developed code) doesn't reach it.
- **Funded custom work is confined to the thin adapter layer.** Connectors, auth, your AI endpoint, config, branding. We're genuinely fine if *that* layer is shareable — it's plumbing, not the IP. The core never enters that conversation.
- **We assert and mark our data rights** (commercial computer software, restricted rights) so nothing silently defaults to government-purpose or public rights, and we use **escrow** for your continuity instead of open-sourcing.
- **The contracting tell:** buy it as **services around a commercial product**, not as a **custom software-development deliverable**. Same FTE hours either way — completely different IP outcome.

> Sayable line: *"You're not paying us to write code you then own and have to open-source. You're paying for our people to stand up and run a commercial product we license to you. We can make the pilot or the first bureau free to get going, then license bureaus as we scale across the department. The code stays ours, hosted in your boundary; you get the working capability at a great price, and none of the CC0 baggage."*

### Hosting — how would we run it?

Three real options; lead with the first for Commerce.

- **In your cloud boundary, PA-managed (recommended).** We deploy LaunchPad as a PA-owned image into **your** AWS GovCloud (or Azure Gov) inside your FedRAMP / ATO boundary — Postgres becomes RDS/Aurora, the app runs on ECS/Fargate, and Claude runs **server-side via Amazon Bedrock** (FedRAMP High, DoD IL4/5, American-built). Your data never leaves your boundary, we manage and patch the image, and **source is never delivered** (image + escrow). Best balance of your security/ATO needs and our IP — and it matches the architecture line you gave at sign-in.
- **PA-hosted SaaS.** We run it in our cloud and you consume it — fastest to stand up, least ops burden on you. But a SaaS handling federal data generally needs **FedRAMP authorization**, so it's a longer runway for production use; good for a **pilot/sandbox** with non-sensitive data while the in-boundary option is stood up.
- **Your team hosts, we deploy + support.** You operate it in your environment; we provide the licensed build and do the deployment and support as labor. Source still isn't delivered; escrow covers continuity.

> Sayable line: *"Simplest answer: it runs inside your boundary, on your cloud, with the model already authorized at FedRAMP High through Bedrock — so nothing leaves Commerce control. We manage the image; you never have to take delivery of source for it to keep running."* **Be honest on maturity:** it's a pre-ATO prototype; the pilot includes the security/ATO path in your environment.

**"But if it runs in our cloud, doesn't it become ours / open source?"** (likely Doug question — answer it head-on):
> *"No — where it runs and who owns it are two different questions. Commercial software runs inside federal boundaries every day and stays the vendor's; deploying into your GovCloud is a data-residency and security fact, not an ownership transfer. What makes code CC0 is who authored it, how it was funded, the data-rights clauses, and whether you take delivery of the source — not the server it sits on. We deploy a PA-owned image, your people never author the core, your data stays yours, and you never take delivery of source — so it runs entirely in your boundary and stays a licensed commercial product. The thing that would create a CC0 claim isn't the hosting — it's structuring it as custom development with government data rights, which is exactly what we're not doing."*

### The paths to actually contract it (the "vehicles")
Two are clean for Commerce as a civilian agency:
- **GSA MAS** — Packaged Agile holds Schedule contract **#47QTCA22D008Z**. Commerce can order against it with a task order — the standard commercial path, minimal friction.
- **HUBZone sole-source** — Packaged Agile is **SBA HUBZone-certified**, so a Commerce contracting officer can make a **non-competitive (sole-source) award up to $4.5M for services** (FAR 19.1306). That's the fastest route to a scoped first pilot without a full competition.
- **Buy it as services** — the cleanest framing of all: you're buying our labor to stand it up, with the software provided at no license cost. (Maps directly to Scott's "the meat is the integration.")
- **Alternatives if those don't fit** — an innovation/pilot or SBIR path (NIST sits inside Commerce), or teaming as a sub to an incumbent. Secondary; lead with GSA MAS + HUBZone.

> **Accuracy guardrail:** PA's *other* vehicles (VA IHT 2.0, USACE BPA, DoD Tradewinds) are agency-specific and mostly **don't** reach civilian Commerce — don't pitch Tradewinds here. GSA MAS and HUBZone sole-source are the Commerce-relevant paths.

### Lines to use — and to avoid
- **Avoid:** "I could make it open source," "we'll hand over the code," "it becomes yours." (That's the trap Scott flagged — don't repeat it.)
- **Use:** "It's a commercial product. We can make the pilot or the first bureau free to get started, license bureaus as we expand, and you pay for our people, not for custom software."
- **Defer specifics gracefully:** *"Our counsel is finalizing the exact data-rights and license language with our principal, Dave Witkin — I don't want to freelance legal terms in the room. I can get you the structure in writing right after this."*
- **Honest on maturity:** it's a working prototype, **not yet ATO'd**. The pilot includes the ATO/security path in your boundary — say so rather than implying it's production-ready.

### The "we're working it behind the scenes" close
> *"Doug, you don't have to solve our IP problem — we're bringing you a structure that's already clean: a commercial license, your integration work in a separate layer that's safe to fund, and a HUBZone or Schedule path to get it on contract fast. Scott's instinct was right that this belongs at the Commerce level, across bureaus — and the same license scales that way. Let us get you the one-pager and let your contracting and counsel folks poke at it."*

> Caveat for your own prep: this is the structure PA intends, **not legal advice** — the commercial-item determination and data-rights marking are being confirmed with counsel / Dave Witkin before anything is committed.

---

## Trial run & reset to a clean state

You can do a full dry run and then snap everything back to the prepped starting state. Two layers get "dirtied" during a rehearsal, and each has its own reset:

- **Submissions** live in the shared Supabase table (everything in the pipeline / Decision Center, plus anything you submit live during the trial).
- **Your in-progress wizard state + the staged draft** live in your browser's localStorage (per browser, not shared).

> **Prerequisite — run the updated code.** The two CX use cases and the staged draft only exist in the latest code. If you're demoing on the deployed site, **commit + push so Vercel redeploys first**; otherwise the seed will restore the *old* sample set. Running locally with `pnpm dev` already has them.

### Trial run — what to verify
Walk the full script (steps 1–10) once and confirm:
- Scout asks a clarifying question on the vague problem, and returns real (not canned) text → confirms the Anthropic key is live in this environment.
- **Strategic Alignment auto-fills** on entry, and the Scout prompt is still there if you clear it and navigate back (the fix from earlier).
- The readiness review returns a verdict + executive summary, and **Submit** lands the record in the pipeline.
- Admin pipeline shows the two CX use cases as the two most recent, with readiness bars; filters work.
- **Request info → Draft with Scout → Send**, then resubmit as the submitter, closes the loop on the same record.
- **Decision Center** comparing the two CX candidates returns the actionable briefing (recommendation banner + per-candidate verdict cards), not a wall of text.

### Reset — back to the prepped state

**Submissions (the shared data):** Sign in as admin → **Admin → Demo Data → "Reload Demo Submissions."** This wipes the Supabase table and re-inserts the seed set (including the two CX use cases), clearing anything you created during the trial. *(This affects every visitor to the shared demo site.)*

**Your browser state + the staged draft:** paste this in the browser console (clears trial wizard state and re-stages the *Proactive Plain-Language Status Updates* draft):
```js
['aid-form-data','aid-current-step','aid-editing-id','launchpad-submissions'].forEach(k=>localStorage.removeItem(k));
sessionStorage.removeItem('aid-session-active');
localStorage.setItem('aid-form-data', JSON.stringify({
  useCaseDescription: "Proactively tell customers, in plain language, when their application status changes — so they stop having to call or email just to ask 'where is my application?'",
  coreProblem: "Customers are left in the dark between status changes, so they generate avoidable call and email volume asking for updates — and when they do see a status, it's in language they can't understand.",
  targetAudience: "applicant", impactedUsersCount: "gt_500", publicIndicator: "public"
}));
localStorage.setItem('aid-current-step','3');
location.reload();
```

**One-shot option (does both):** this resets the shared submissions *and* your local state in a single console run:
```js
(async () => {
  await fetch('/api/submissions', { method: 'DELETE' });   // wipe shared table
  await fetch('/api/seed', { method: 'POST' });             // re-insert the seed set
  ['aid-form-data','aid-current-step','aid-editing-id','launchpad-submissions'].forEach(k=>localStorage.removeItem(k));
  sessionStorage.removeItem('aid-session-active');
  localStorage.setItem('aid-form-data', JSON.stringify({
    useCaseDescription: "Proactively tell customers, in plain language, when their application status changes — so they stop having to call or email just to ask 'where is my application?'",
    coreProblem: "Customers are left in the dark between status changes, so they generate avoidable call and email volume asking for updates — and when they do see a status, it's in language they can't understand.",
    targetAudience: "applicant", impactedUsersCount: "gt_500", publicIndicator: "public"
  }));
  localStorage.setItem('aid-current-step','3');
  location.reload();
})();
```

> Do the reset once **after** your final rehearsal so you walk into the real demo with the staged submissions, clean statuses, and the in-progress draft ready to resume.

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
- **"How do we get this / who owns it / is it open source?"** → see the dedicated **"How do we get this?" — acquisition & IP** section above. Short version: commercial product; free to start (a pilot, a first bureau, or the DoC governance layer) and licensed as it expands across bureaus; you pay for our people; clean of the CC0 issue via the core-vs-adapter split; GSA MAS or HUBZone sole-source to contract it. Defer exact legal terms to counsel.
