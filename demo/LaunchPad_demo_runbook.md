# LaunchPad — Demo Runbook

**Audience:** Ramesh (acting CAIO, pragmatic, *obsessed with lean*, focused on the **value/outcomes** of AI initiatives, owned the original secret use-case list), Scott Barker (experience-design PO), Chris (facilitating, already sold), Jonathan (your champion).
**One-line positioning:** *LaunchPad is the governable front door for AI ideas at USPTO* — one intake where staff turn rough ideas into vetted, decision-ready use cases, so leadership can see the whole pipeline and decide what's worth funding instead of chasing shadow AI.

---

## 1. Do today, before the demo (in order)

**A. Database — run the remaining SQL in Supabase (you've run 0001 + 0002):**
- [ ] `0003_more_demo_examples.sql` — 7 more ideas (fills all 5 statuses + OCFO/OPIA)
- [ ] `0004_users_and_assignees.sql` — 7 reviewers, 12 submitters, per-BU assignment
- [ ] Verify: `select status, count(*) from submissions group by status;` → should show submitted/in_review/needs_info/approved/rejected. And `select count(*) from users;` → 19+.

**B. Deploy the code** — push the `USPTO-launchpad` branch (GitHub Desktop). Since the last push this includes: storage cutover, kanban + multi-select filters, assignees + auto-assign, and the Scout naming fix. Let Vercel finish before testing.

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
- Comments-table cutover, real auth + RLS hardening, multi-draft, category-tile rewording (GitLab/ServiceNow), label wording ("expected benefits"/"value metrics" — Jonathan to send copy).

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
