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

**F. Pre-stage for tomorrow** — because one browser shares a single login across tabs, set up **two windows: a normal window signed in as your demo submitter, and an incognito window signed in as admin**. Pre-generate one Decision Center briefing (in the admin window) so you're not waiting on it live. Screenshot that briefing as a fallback.

---

## 2. Additional features? — My recommendation: **freeze**

The product already tells the complete story end to end. The single biggest risk tomorrow is a broken build, not a missing feature. **Do not add scope today.** Everything below is explicitly **post-demo**:
- Comments-table cutover, real auth + RLS hardening, multi-draft, category-tile rewording (GitLab/ServiceNow), label wording ("expected benefits"/"value metrics" — Jonathan to send copy), and 508 remediation on the admin screens plus a formal accessibility scan / VPAT.

**One optional polish with real client signal:** Jonathan said the executive briefing is *wordy* ("shorten the paragraphs"). If you have time AND test it, tightening that prompt is the one change with direct feedback behind it. But it touches a live model prompt — only do it if you can regenerate and eyeball a few. Otherwise, in the demo just say "we're tuning length" — it's already a known note.

---

## 3. The 25-minute demo path

> Pacing note: role switches and the Decision Center briefing eat time. Pre-stage logins and a pre-generated briefing. Keep Scout moments short (one question, one scaffold). The technical and security points below are woven into the moment each naturally comes up, so you're explaining, not lecturing.

> **Login choreography:** open logged out on the public landing. **First login = submitter** (the intake journey); the reviewer/governance side = **admin**. The app session is shared across all tabs in one browser, so to flip roles fast keep **two windows: a normal window signed in as the submitter, an incognito window signed in as admin** (incognito has its own session). Use the *same* submitter for the opening intake and the closing feedback reply, and **request info on the idea you just submitted** so it comes full circle. After the admin requests info, **refresh the submitter window** to see "Action needed."

**0:00–2:00 — Frame the problem (talk, no screen yet).**
"Right now AI ideas at USPTO are decentralized — they come through SharePoint, email, hallway conversations. There's no single, governable front door, and no consistent way to see what's worth funding. Ramesh, you've said the question now is *what value are these initiatives actually bringing*. That's what LaunchPad answers."

**2:00–4:30 — Log in, and tell the security + identity story while you do.**
Deliver the ~20-second architecture line (top of runbook) as you type. Then, still on the login screen, cover roles/security today vs. their environment:
"Today, for the prototype, the app handles sign-in itself and manages three roles: submitter, reviewer, admin. In your environment we wouldn't do that. Authentication would come from your identity provider through your existing SSO — PIV/CAC, MFA, your ICAM policy — and we'd map your existing groups to these three roles. We're not creating another place to manage people. Same with the data behind it: who sits in which business unit, the people and product records — that stays in your systems of record, Dataverse or Oracle/APEX, and we read from those. LaunchPad is a thin governance layer on top of what you already own."
Land it: *"We don't ask you to trust our security model. We plug into yours."* (Point out the **Sign up button is locked** — accounts are provisioned, not self-service. That's the governed posture, not a missing feature.)

**4:30–6:30 — Lean, problem-first intake (submitter wizard).**
Start a new idea. Point out it jumps straight to **the problem**, not the idea: "the finding is people have 'ideas' that aren't even AI; we lead with the problem so we catch that early." Call out the **two-field, radio-driven** steps: "this is deliberately lean — Ramesh, you wanted three questions; I'll show you how you control exactly that in a minute."

**6:30–9:00 — Scout (the intelligence).**
Type something vague. Scout **asks a clarifying question** with clickable options instead of dumping feedback; it **never invents facts**; it drafts a **scaffold** into the locked summary field. "This is Claude in the back, running server-side — most of the IP is in the prompts. It coaches; the human stays in control." Governable angle: "Scout can also say *this doesn't look like AI* or *we already have a tool for this* before anyone spends a dollar."

**9:00–11:00 — Readiness gate + submit.**
Land on the review step → **readiness verdict** (ready / needs work / early stage) and exec summary. "Every submission comes out structured and comparable, with a quality gate before it ever reaches a reviewer." Submit.

**11:00–15:00 — Reviewer pipeline + risk panel (role switch → admin).**
*Log in as admin here, not a plain reviewer: admin sees the same pipeline and can take the same review actions, but ALSO has the Form Config tool you'll show at 21:00 — so no extra login mid-demo. (Form Config is admin-only by design; say so: "only an admin/governance owner controls what the form collects.")*
Show the **kanban by status**, then **filter by business unit and by assignee** (multi-select). "Every idea is auto-routed to the reviewer for its business unit." Open an idea → **Scout's reviewer read** (advisory verdict, strengths, gaps, suggested disposition — *human decides*), and the **risk panel** (PII / American-built model / human review / decisional). "These are the DoC- and EO-mandated questions, the *governable* part." Tie it home: "and because the model runs through Amazon Bedrock in your GovCloud — already FedRAMP High and IL4/5 — the whole thing, your data and the model, stays inside your accredited boundary. American-built, nothing leaves."

**15:00–18:00 — The feedback loop.**
**Request info → Draft with Scout** (it writes the specific gap message) **→ Send.** Switch to the submitter → **Action needed** → they see the note and **reply/resubmit**. "A review isn't a dead end — there's a real channel back to the submitter."

**18:00–21:00 — Decision Center (Ramesh's value question).**
Compare 2-3 side by side → show the **executive briefing**. "This is the leadership view: quantified value, strategic alignment, risk, and a recommendation, side by side. This is how you decide what to fund." (Use the pre-generated one to avoid the wait.)

**21:00–23:30 — Governance payoff + customization.**
Open a **Rejected** example (auto-drafting office actions, or resume auto-screening). "The tool flagged this: decisional AI making a determination about a person with no human review. *That's* what governable means; it doesn't just collect ideas, it catches the ones that shouldn't proceed." Then Admin → **Form Config**: toggle a couple fields off live. "Ramesh, you wanted it leaner? Ten seconds. Fully customizable, no COTS limits."

**23:30–25:00 — Close (+ logistics teaser).**
"It's bespoke to you, runs on your infrastructure inside your boundary, points at whatever model you approve, and it stays customizable as you learn. We'd love your read on it." If they're warm, open the door: *"Happy to come up and spend a few hours with your team walking through it and taking direction before anything's formal."* Keep the open-source answer ready (see Logistics): open to it, but the cleanest path is we run it for you so you don't inherit the maintenance. Then stop and let them react.


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


---

## Logistics — open source, staffing, engagement offer

### If Ramesh asks "will you open-source it?"
Don't say no. Posture: *"We're open to it, but we'd want to figure out how we stay involved and keep some control."* Then steer to the better path.

**Best case (preferred): keep it as our commercial IP, not open-source.**
- LaunchPad is pre-existing IP **developed at private expense** -> it's commercial computer software. USPTO gets a **license to use** the deployed instance; Packaged Agile keeps the code and the rights.
- USPTO procures a **license + services** engagement (deploy, integrate identity/data, ATO, maintain), ideally under an existing contract vehicle (bring it under the current BL solution / GSA MAS) to avoid a fresh competitive procurement.
- PA stays maintainer and roadmap owner -> recurring revenue, control, reusable for other agencies.

**Why it's good for USPTO (the pitch):** *"You get a supported, continuously-upgraded product in your boundary, and you don't take on a codebase to maintain yourselves. License cost stays minimal; the value is in the team and the hosting."*

**Reframe open source as a burden:** if they take the open-source code, *they* own maintaining it (or it rots). Proprietary + our team = we carry that.

**Fallback (don't hard-no):** *"We're open to discussing open-sourcing parts down the line."* Ramesh's open-source instinct is really a procurement/budget concern, answer that, not the licensing.

*Validate the IP / data-rights wording with Brad & Dave before committing language ("developed at private expense / restricted rights" is the lever).*

### Staffing (3 FTE, then a decision gate)
3 FTE for build-to-production + early adoption, then decide: scale up or drop to maintenance (1 FTE).
- **Matt — Program / Product Manager:** customer engagement, feedback, roadmap, governance liaison, prioritization.
- **Full-stack engineer (lead dev):** Next.js / TS / React + Node + Postgres + the Scout / AI prompt integration. Builds features.
- **DevSecOps / cloud-integration engineer:** AWS GovCloud + containerization, SSO / identity (OIDC / SAML / Cognito), security + ATO support, AI-gateway / Bedrock config, Dataverse / APEX + Rally integrations. Lands it in their environment.
- **Surge fractionally (not full FTE):** formal ATO / security accreditation and the 508 / VPAT.
- **Steady-state maintenance:** ~1 FTE (full-stack engineer) + Matt fractional.
- Consistent with deck slide 5's "dedicated 2-3 person team" assumption.

### Engagement offer (Matt)
If they're serious, offer up to ~4 hours on-site at USPTO before any official engagement: sit with their team, walk through the app, capture feedback / direction, and make updates live. Low-commitment way to build momentum and show responsiveness.
