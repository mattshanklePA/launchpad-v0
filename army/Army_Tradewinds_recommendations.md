# LaunchPad for Army — Tradewinds (CDAO) Recommendations

## Tradewinds submission essentials (what they require and score)

Tradewinds Solutions Marketplace (TSM) is run by **CDAO** (Chief Digital and AI Office). Note the site now brands it **"Department of War (DoW)"** — same program, current 2026 naming. It is **DoD/DoW-wide**, not Army-only: submit a capability that serves the whole Department, with **Army as the lead use case**.

**How it works:** vendors submit a **5-minute pitch video** + an online form → an expert panel assesses it against federal standards → "awardable" solutions enter the Marketplace → government buyers procure through a streamlined path (2025 median procurement lead time was ~45 days).

**Deadline / process:** monthly collection, **final day of each month by 12:00 noon ET**; results within ~30 days. Submit through a **Solution Provider account** on the Tradewinds portal (tradewindai.com → Appian). You'll want an active **SAM.gov** registration; the form matches SAM profile.

**The video must address all four required elements (this is the scoring rubric — build the script around these):**
1. **Define the problem** and explain the **broader applicability and potential impact** of your solution.
2. **Describe how your solution accelerates the mission**, with **technical/scientific reasoning from cited data**, and **link it to a TSM Strategic Focus Area**.
3. **Explain how your solution advances the state of the art**, using evidence from impact on current customers (if any), and **why alternatives are less desirable**.
4. **Describe your business model**, aligned to the **TRL** of your solution, including **publicly available commercial pricing**.

**Form fields to have ready:** title (<128 char), abstract (≤1,500 char), submission type, **TRL**, relevant **strategic focus area**, **5+ keywords**, entity info (name/UEI/website/country), **business size + small-business designation** (Packaged Agile is HUBZone — a real plus here), traditional/non-traditional, **security & authorization status**, POC + alternate.

**Video hygiene:** ≤5:00, viewable + audible, legible on-screen graphics, no prohibited/restrictive markings (a valid copyright notice is fine).

---

## Part 1 — How to manage USPTO vs. Army versions

**Recommendation: single codebase, multi-tenant by configuration. Do NOT fork.** Your instinct is right, and the app is already built in a way that makes it cheap, because the agency-specific bits are centralized (the Scout strategic-context constant, the field registry, the business-unit list, branding). The work is to lift those into a per-tenant config rather than hardcoded USPTO values.

**Target architecture (the product answer):**
- A **tenant concept** (`uspto`, `army`). Each user belongs to a tenant; on login the app loads that tenant's config.
- A **tenant config** (a `tenants` table or a config module) holding, per tenant: display name + **logo + theme colors**, the **Scout strategic-context prompt block**, **risk/governance question set**, default **field config**, **org/unit taxonomy**, **landing objectives**, terminology, and a **feature-flag map** (e.g., toggle Rally export, Decision Center, specific fields).
- **Data isolation:** add a `tenant_id` column to submissions / users / comments / form_config and scope every query by tenant. One DB, tenant-partitioned. (This is the row-level-security story you already pitch.)
- **Resolution:** branding/config by the logged-in user's tenant; for the pre-login landing, resolve by **subdomain** (`uspto.…`, `army.…`) or a default.

**Important reality check for production:** for a real deployment, USPTO (civilian FedRAMP) and Army (DoD **IL4/5**) will almost certainly be **separate accredited boundaries** — different clouds, different ATOs. So "one consolidated prod DB across both" won't pass an accreditation boundary. The right model is **one codebase, multi-tenant config, deployed per boundary** (same app, separate instance + DB per accreditation). Co-hosting is great for dev/demo and for a commercial multi-tenant offering; it's not how the two prod environments will actually sit.

**For the Tradewinds video right now (fastest path, zero risk to USPTO):**
1. **New git branch** off the current code (e.g., `army`). Leave `USPTO-launchpad` frozen and its Vercel/Supabase untouched.
2. On the branch, add a **light tenant/config layer** (or, quickest, just override branding + prompts + risk questions + seed for an "army" tenant).
3. Stand up a **separate Supabase project + separate Vercel deployment** for the Army instance. Nothing shared with USPTO.
4. Seed Army-relevant demo data, record the 5 minutes there.

You don't need full multi-tenant prod plumbing to make the video — you need an Army-branded, Army-context instance. Build the proper tenant layer after, on the same branch, as the product direction.

---

## Part 2 — What to change to broaden it for Army

Most of this is **config + prompt**, not new features. The wizard, Scout, pipeline, Decision Center, and feedback loop all stay; you swap the context they run on.

**Prompts / AI context (the biggest change):**
- Replace `USPTO_STRATEGIC_CONTEXT` with **Army/DoD strategic context**: the **DoD Data, Analytics & AI Adoption Strategy**, **Army digital/AI priorities**, and mission outcomes (readiness, sustainment, decision advantage, lethality, force protection). Scout's coaching, readiness scoring, reviewer-assist, and the exec briefing all key off this.
- Reframe the **exec-briefing priorities**: USPTO's "pendency / quality / cost" → Army's "readiness / decision speed / cost / risk reduction."

**Governance / risk questions (re-anchor to DoD):**
- Swap the DoC/OMB/EO framing for the **DoD AI Ethical Principles** (Responsible, Equitable, Traceable, Reliable, Governable) and **CDAO Responsible AI** guidance.
- Add **data classification / Impact Level** handling (Unclassified / CUI / IL4 / IL5) as a first-class question — this is central for DoD and not present in the USPTO set.
- Keep the **American-built model sourcing** and **mandatory human review** questions (even more relevant for DoD). The **Bedrock GovCloud FedRAMP High + IL4/5** fact is a stronger card here than at USPTO.

**Taxonomy / terminology:**
- "Business unit" → **Command / component / echelon** (e.g., FORSCOM, AMC, TRADOC, or generic "organization").
- Landing "USPTO Strategic Objectives" → **Army modernization / DoD AI adoption** objectives.
- Example domains in seed + prompts: predictive maintenance, logistics/sustainment, ISR triage, talent management, medical readiness, contracting — instead of patents/trademarks.

**Branding:**
- Name (e.g., "LaunchPad" with an Army/DoW lockup), logo, colors, landing copy; remove the USPTO logo and civilian-specific language (508 stays — it's federal-wide — but lead with DoD RAI).

**Seed / demo data:** a fresh set of Army-relevant example submissions across commands, with Army reviewers, so the pipeline and Decision Center look native.

**Map to a TSM Strategic Focus Area:** LaunchPad fits **responsible-AI governance / enterprise AI adoption / decision support**. Pick the closest focus area the form offers and tie the video's Element 2 to it explicitly.

---

## Part 3 — Draft 5-minute video script

> ~720 words ≈ 5:00 at a measured pace. Structure maps 1:1 to the four scored elements. Cut to live screen capture of the Army-branded app during the middle. Keep on-screen text legible. No CUI/real data on screen.

**[0:00–0:40] — Problem + broad applicability (Element 1).**
"Across the Department, good AI ideas are everywhere — and they're invisible. They live in email, in slide decks, in shadow pilots. There's no single front door to capture them, no consistent way to vet them for responsible-AI risk, and no portfolio view for leaders deciding where to invest. The result is duplicated effort, ideas that aren't really AI, and risk that surfaces too late. This isn't an Army problem or a single-command problem — it's a Department-wide problem. LaunchPad is the governable front door that fixes it."

**[0:40–2:30] — Solution + how it accelerates the mission (Element 2; cite + tie to focus area).**
"LaunchPad turns a rough idea into a vetted, decision-ready use case. A submitter starts with the problem, not a wish. Our AI assistant — running server-side on Claude, which is authorized at FedRAMP High and DoD Impact Level 4 and 5 through Amazon Bedrock in GovCloud — coaches them one question at a time. It never invents facts; it sharpens their own inputs into a structured, comparable submission, and it scores readiness before a reviewer ever sees it. [Screen: wizard + assistant.] Every submission runs through a governance gate built on the DoD AI Ethical Principles: Does it use CUI? Is the model American-built? Is there mandatory human review? Does the AI make decisions about people? [Screen: risk panel.] Reviewers see the whole pipeline by command and status; leaders use a decision center to compare candidates side by side and generate an executive briefing — quantified value, alignment, and risk — to decide what to fund. [Screen: pipeline + decision center.] This directly accelerates the mission: it compresses the path from idea to a defensible investment decision, and it builds responsible-AI review in from the first keystroke."

**[2:30–3:30] — Advance the state of the art + why alternatives fall short (Element 3).**
"Today the alternatives are a SharePoint form, a spreadsheet, or a generic intake tool. None of them coach the submitter, none score readiness, and none enforce a responsible-AI risk gate — so reviewers get inconsistent, unvetted ideas and leaders get no portfolio. LaunchPad is the only tool that combines AI-assisted authoring, a responsible-AI governance gate, and a leadership decision view in one governable front door. It's already been validated with a federal agency adopting it as their AI intake and vetting platform — proof the workflow holds up in a real government environment. The advance isn't a better form; it's making AI governance the on-ramp instead of an afterthought."

**[3:30–4:20] — Maturity (TRL) + business model + pricing (Element 4).**
"On maturity: LaunchPad is code-complete and demonstrated end-to-end in a relevant government context — TRL 6 to 7. It's model-agnostic and deploys inside your accredited boundary, including IL4/5 via Bedrock GovCloud, so your data never leaves. On the business model: we deliver it as commercial software, licensed and run by our team, so you get a supported, continuously-improved capability without inheriting a codebase. We're Packaged Agile — a HUBZone small business focused on agile and AI for government — available through the GSA Multiple Award Schedule, with commercial pricing published on our schedule."

**[4:20–5:00] — Impact + call to action.**
"The payoff is simple: more of the Department's best AI ideas captured, vetted for responsible-AI risk, and put in front of the people who fund them — faster, and with the governance built in. We'd welcome a conversation with any activity that needs a governable front door for AI. Thank you."

---

### Pre-record checklist
- [ ] Army-branded instance live (separate Supabase + Vercel, off the `army` branch).
- [ ] Army seed data loaded; no CUI / no real names on screen.
- [ ] Confirm TRL, strategic focus area, keywords, pricing line, and small-business designation for the form.
- [ ] Record ≤5:00; legible screen text; clean audio. Leave 2–3s of headroom.
- [ ] SAM.gov registration current; submit before the month-end noon-ET cutoff.
