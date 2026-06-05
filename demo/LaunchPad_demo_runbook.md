# LaunchPad — Demo Runbook

**Audience:** Ramesh (acting CAIO, pragmatic, *obsessed with lean*, focused on the **value/outcomes** of AI initiatives, owned the original secret use-case list), Scott Barker (experience-design PO), Chris (facilitating, already sold), Jonathan (your champion).
**One-line positioning:** *LaunchPad is the governable front door for AI ideas at USPTO* — one intake where staff turn rough ideas into vetted, decision-ready use cases, so leadership can see the whole pipeline and decide what's worth funding instead of chasing shadow AI.

---

## Technical framing — deliver this casually while you log in (~20 seconds)

"Quick note on what this is under the hood while I log in: it's a standard web app, a Next.js front end with a Postgres database and server-side APIs. The AI is Claude, running server-side, not in the browser. None of it is tied to our demo stack. In your environment it drops onto AWS: Postgres becomes RDS or Aurora, hosting becomes ECS or Fargate, all inside your FedRAMP boundary. And Claude is already authorized at FedRAMP High and DoD IL4/5 through Amazon Bedrock in AWS GovCloud, so the model runs inside your accredited boundary, it's American-built, and no data leaves USPTO control."

That one paragraph preempts three of the most likely questions: "is this just a form," "where would it run," and "is the model compliant."

---

## Deep-dive answers (the two you flagged)

### "Can it pull users / people / products from our systems of record (Dataverse, Oracle APEX) instead of managing them in the tool?"

Yes, and that's how it should run. The tool should not be another place you maintain people and roles. There are two separate connection points:

- **Identity (who you are + your role):** authentication and group/role membership come from your identity provider through SSO (OIDC or SAML), not from accounts stored in the app.
- **Reference data (people, products, org / business units):** pulled from the authoritative source. Microsoft Dataverse exposes an OAuth2-secured Web API (OData v4) we read from; Oracle / APEX exposes data through ORDS REST endpoints or a direct read connection. The tool reads from those; it doesn't own that data.

Why it isn't a rebuild: the data layer already sits behind a clean server-side API, and "role" and "business unit" are already first-class concepts in the app (we route reviewers by business unit today). Swapping the seeded users for a Dataverse or APEX feed is a contained integration. The tool becomes a thin governance-and-workflow layer on top of your existing sources of truth.

*Honest caveat if pressed:* these are standard integration patterns, but they're real work, and we'd scope them with your data owners. We built it clean specifically so this part is straightforward.

### "Security and authorization: what do you use today, and what would you use in our environment?"

**Today (prototype):** the app manages sessions and three roles (submitter, reviewer, admin), with all data access strictly server-side (the database service credential never reaches the browser). It's demo-grade, and we'd replace it. We wouldn't bring our own security model into your environment.

**In your environment, we adopt your standards:**

- **Authentication:** federate to your IdP via OAuth2 / OIDC or SAML, through Amazon Cognito or an ALB OIDC integration, including PIV/CAC and MFA per your ICAM policy. No passwords stored in the app.
- **Authorization:** map your existing IdP groups to the three roles, and enforce row-level data isolation in Postgres so a submitter only ever sees their own records at the database layer, not just in the UI.
- **Boundary + model:** everything runs inside your AWS FedRAMP environment, and the model runs via Amazon Bedrock in AWS GovCloud, which carries FedRAMP High and DoD IL4/5 authorization for Claude. No data egress, American-built model, inside your accreditation boundary.

The one-liner: *"We don't ask you to trust our security model. We plug into yours."*

> Confidence note: the Bedrock FedRAMP High / IL4/5 authorization for Claude in AWS GovCloud is real and current (AWS and Anthropic, May 2025). Safe to state as fact.

### "Is it Section 508 / accessibility compliant?"

Posture (honest and strong): *"508 is a first-class requirement here, not a bolt-on. It's built on standard accessible web components, proper form labels, keyboard operability, semantic headings, and ARIA on the interactive pieces, and we test against WCAG 2.0 AA, which is the Section 508 technical standard. Full conformance with a VPAT, and a pass through your accessibility / Trusted Tester process, are part of standing it up in your environment. It's accessible by construction, so those are fixes, not redesigns."*

- **Do NOT claim "fully 508 compliant."** It's a prototype; a live scan will surface items, and overclaiming to a federal audience is the wrong move.
- **If someone runs a scanner live (axe, Lighthouse, ANDI):** *"Exactly the right check. It's a prototype, so a scan may flag items; remediation and the VPAT are part of the build-out. Nothing structural is in the way."*
- **What's already done (say only if useful):** a bounded accessibility pass was completed before the demo — all images carry alt text, the Scout send controls and the sign-up business-unit dropdown have accessible names, the kanban filter pills announce their pressed state, and the custom radio and kanban controls expose proper roles and state. **We deliberately stopped there.** Extending labels to the deeper admin screens (the OKR edit/delete icon buttons) and a formal scan + VPAT are intentionally deferred to post-demo, to avoid destabilizing the build the night before. You can run axe DevTools or Lighthouse on the deployed site yourself for a current snapshot.

---

## 1. Do today, before the demo (in order)

**A. Database — run the remaining SQL in Supabase (you've run 0001 + 0002):**
- [ ] `0003_more_demo_examples.sql` — 7 more ideas (fills all 5 statuses + OCFO/OPIA)
- [ ] `0004_users_and_assignees.sql` — 7 reviewers, 12 submitters, per-BU assignment
- [ ] Verify: `select status, count(*) from submissions group by status;` → should show submitted/in_review/needs_info/approved/rejected. And `select count(*) from users;` → 19+.

**B. Deploy the code** — push the `USPTO-launchpad` branch (GitHub Desktop). Since the last push this includes: storage cutover, kanban + multi-select filters, assignees + auto-assign, and the Scout naming fix. Let Vercel finish before testing. The new public landing page is included; the **Sign up** button is intentionally locked (no self-registration — accounts are provisioned), so nothing can pollute the pipeline during the demo. Log in and the seeded accounts work normally.

**C. Set the lean form config** — Admin → Form Config → toggle to the keep-on set (impacted users, implementation complexity, business value, cost/time savings, strategic focus areas, success metrics, timeline; everything else off). This is Ramesh's #1 reaction point.

**D. Smoke-test the happy path (15 min):**
- [ ] Log in as **admin** → `/home` kanban renders; BU + Assignee filters toggle; counts re-tally.
- [ ] Log in as a **reviewer** (e.g. `jonathan.moody@uspto.gov` / `launchpad`) → open the **trademark Needs-Info** idea → confirm **Scout's read generates** (live model call, ~3-6s), risk panel shows, comment thread shows the seeded reviewer note.
- [ ] Run the loop: **Request info → Draft with Scout → Send**; then log in as that **submitter** → **Action needed** → reply.
- [ ] Log in as a **submitter** (`anita.krishnan@uspto.gov` / `launchpad`) → My Ideas shows only hers.
- [ ] **Wizard:** start a new idea → confirm problem-first, two-field steps, radio buttons, Scout, locked summary field.
- [ ] **Decision Center:** compare 2 → generate briefing (⚠ this is the slow one, 20s+).

**E. Confirm Scout works in PROD** — if the Anthropic API key isn't set in Vercel, Scout silently falls back to canned scaffolds. Make sure a real, specific Scout answer comes back in the deployed app, not the generic fallback.

**F. Pre-stage for tomorrow** — open the tabs/logins you'll use ahead of time (admin, one reviewer, one submitter), and pre-generate one Decision Center briefing so you're not waiting on it live.

---

## 2. Additional features? — My recommendation: **freeze**

The product already tells the complete story end to end. The single biggest risk tomorrow is a broken build, not a missing feature. **Do not add scope today.** Everything below is explicitly **post-demo**:
- Comments-table cutover, real auth + RLS hardening, multi-draft, category-tile rewording (GitLab/ServiceNow), label wording ("expected benefits"/"value metrics" — Jonathan to send copy), and 508 remediation on the admin screens plus a formal accessibility scan / VPAT.

**One optional polish with real client signal:** Jonathan said the executive briefing is *wordy* ("shorten the paragraphs"). If you have time AND test it, tightening that prompt is the one change with direct feedback behind it. But it touches a live model prompt — only do it if you can regenerate and eyeball a few. Otherwise, in the demo just say "we're tuning length" — it's already a known note.

---

## 3. The 22-minute demo path

> Pacing note: switching roles + the Decision Center briefing eat time. Pre-stage logins and a pre-generated briefing. Keep Scout moments short — one question, one scaffold.

**0:00–2:00 — Frame the problem (talk, no screen yet).**
"Right now AI ideas at USPTO are decentralized — they come through SharePoint, email, hallway conversations. There's no single, governable front door, and no consistent way to see what's worth funding. Ramesh, you've said the question now is *what value are these initiatives actually bringing*. That's what LaunchPad answers."

**2:00–4:00 — Lean, problem-first intake (submitter wizard).**
Start a new idea. Point out it jumps straight to **the problem**, not the idea — "the finding is people have 'ideas' that aren't even AI; we lead with the problem so we catch that early." Call out the **two-field, radio-driven** steps: "this is deliberately lean — Ramesh, you wanted three questions, we'll come back to how you control that."

**4:00–7:00 — Scout (the intelligence).**
Type something vague. Scout **asks a clarifying question** with clickable options instead of dumping feedback; it **never invents facts**; it drafts a **scaffold** into the locked summary field. "This is Claude in the back — most of the IP is in the prompts. It coaches, the human stays in control." Mention the governable angle: "Scout can also say *this doesn't look like AI* or *we already have a tool for this* before anyone spends a dollar."

**7:00–9:00 — Readiness gate + submit.**
Land on the review step → **readiness verdict** (ready / needs work / early stage) and exec summary. "Every submission comes out structured and comparable, with a quality gate before it ever reaches a reviewer." Submit.

**9:00–13:00 — Reviewer pipeline (role switch → reviewer).**
Show the **kanban by status**, then **filter by business unit and by assignee** (multi-select). "Every idea is auto-routed to the reviewer for its business unit." Open an idea → **Scout's reviewer read** (advisory verdict, strengths, gaps, suggested disposition — *human decides*), and the **risk panel** (PII / American-built model / human review / decisional). "These are the DoC- and EO-mandated questions — this is the *governable* part."

**13:00–16:00 — The feedback loop.**
**Request info → Draft with Scout** (it writes the specific gap message) **→ Send.** Switch to the submitter → **Action needed** → they see the note and **reply/resubmit**. "A review isn't a dead end — there's a real channel back to the submitter."

**16:00–19:00 — Decision Center (Ramesh's value question).**
Compare 2-3 side by side → show the **executive briefing**. "This is the leadership view — quantified value, strategic alignment, risk, and a recommendation, side by side. This is how you decide what to fund." (Use the pre-generated one to avoid the wait.)

**19:00–21:00 — Governance payoff + customization.**
Open a **Rejected** example (auto-drafting office actions, or resume auto-screening). "The tool flagged this — decisional AI making a determination about a person with no human review. *That's* what governable means; it doesn't just collect ideas, it catches the ones that shouldn't proceed." Then Admin → **Form Config**: toggle a couple fields off live. "Ramesh — you wanted it leaner? Ten seconds. It's fully customizable; no COTS limits."

**21:00–22:00 — Close.**
"It's bespoke to you, runs on your infrastructure, points at whatever model you approve, and it's customizable as you learn. We'd love your read on it." Then stop and let them react.

---

## 4. Likely light technical questions (+ short answers)

- **"Is this just a Microsoft Form?"** No — there's real intelligence (Claude) in the back, server-side. It produces structured, comparable data and a readiness score; a form can't coach or assess.
- **"What model is it / is it American-built?"** Claude (Anthropic) today; it's configurable to whatever model you approve — American-built or open-source U.S.-hosted. In a real deployment no submission data leaves USPTO control.
- **"Where's it hosted? FedRAMP?"** It's a prototype on Vercel + Supabase right now; built to deploy on USPTO infrastructure / GovCloud. Not ATO'd yet — that's part of standing it up for real.
- **"Is it GitLab? Can we have the code?"** Yes — it's in a repo and can be shared or open-sourced. *(Defer terms: "great question, let me sync with my team and come back to you.")*
- **"Does the AI make the decisions?"** No. Advisory only, human-in-the-loop by design — and the tool actively flags decisional AI without human review as a risk.
- **"How hard is it to change?"** Very easy — the Form Config you just saw toggles fields live, and the whole thing is customizable. That flexibility vs. a rigid COTS tool is the pitch.
- **"PII / data security?"** Demo uses no real data. The mandated risk questions (PII, sourcing, human review, decisional impact) are built in. Real deployment scopes data access and adds row-level security.
- **"Multi-draft / scale?"** Honest answer: single in-progress draft per user today; scales fine and multi-draft is on the roadmap.

---

## 5. If something breaks
- **Scout returns generic text** → API key not live in prod; talk through it ("Scout's drafting here") and move on; don't dwell.
- **Briefing spins** → use the pre-generated one; "this is a heavier call, we're tuning performance."
- **A status/assignee looks wrong** → you likely haven't run 0003/0004; fall back to a different example.
- Worst case, the **lean-form build** (pre-redesign) is still on the prior commit as a fallback.
