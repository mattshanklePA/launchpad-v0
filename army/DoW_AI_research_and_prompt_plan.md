# Department of War / Army AI — Research Synthesis & LaunchPad Prompt Action Plan

*Compiled June 2026 from official/primary sources (defense.gov/war.gov, ai.mil/CDAO, GAO.gov, DoDIG.mil, army.mil, NIST, DAU) with defense-press corroboration. "Department of War" (DoW) is the 2025 rebrand of DoD under EO 14347 — report numbers (DODIG-/GAO-) and pre-2025 doc titles still read "DoD."*

This document has two parts:
- **Part 1 — Research synthesis** (what defines a good, fundable, defensible DoD AI use case).
- **Part 2 — Action plan** for rewriting LaunchPad's Scout prompts, responsible-AI risk gate, strategic-alignment options, readiness scoring, and wizard fields.

---

## Part 1 — Research synthesis

### A. The governance frameworks that define a "good" DoD AI use case

These are the stable, defensible anchors Scout should reason from.

- **DoD Data, Analytics, and AI Adoption Strategy (Nov 2, 2023)** supersedes the 2018 AI Strategy and 2020 Data Strategy. Its mental model is the **"AI Hierarchy of Needs"**: *quality data → insightful analytics → Responsible AI at the top*, with digital talent as an enabler. Six goals: interoperable federated infrastructure; advance the data/analytics/AI ecosystem; expand digital talent; improve foundational data management; deliver capabilities for enterprise + joint warfighting impact; strengthen governance. Central aim: **"enduring decision advantage."** Data is managed to the **VAULTIS** standard (Visible, Accessible, Understandable, Linked, Trustworthy, Interoperable, Secure). — [Adoption Strategy fact sheet](https://media.defense.gov/2023/Nov/02/2003333301/-1/-1/1/DAAIS_FACTSHEET.PDF) (Nov 2023); [full strategy](https://media.defense.gov/2023/nov/02/2003333300/-1/-1/1/dod_data_analytics_ai_adoption_strategy.pdf)

- **DoD AI Ethical Principles (adopted Feb 24, 2020)** — the five every use case must satisfy:
  - **Responsible** — personnel exercise appropriate judgment and care and remain accountable.
  - **Equitable** — deliberate steps to minimize unintended bias.
  - **Traceable** — transparent, auditable methodologies, data sources, design and documentation.
  - **Reliable** — explicit, well-defined uses; safety/security/effectiveness tested across the lifecycle.
  - **Governable** — detect and avoid unintended consequences; ability to disengage/deactivate. — [DoD adopts 5 AI ethics principles](https://www.war.gov/News/News-Stories/Article/Article/2094085/) (Feb 2020)

- **DoD Responsible AI (RAI) Strategy & Implementation Pathway (Jun 2022)** — six tenets: RAI Governance, Warfighter Trust, AI Product & Acquisition Lifecycle, Requirements Validation, Responsible AI Ecosystem, AI Workforce. Requires RAI considered **"from the outset"** and folded into acquisition and T&E. — [RAI Strategy & Implementation Pathway](https://media.defense.gov/2022/Jun/22/2003022604/-1/-1/0/Department-of-Defense-Responsible-Artificial-Intelligence-Strategy-and-Implementation-Pathway.PDF) (Jun 2022)

- **DoD Directive 3000.09, "Autonomy in Weapon Systems" (effective Jan 25, 2023)** — autonomous/semi-autonomous weapons "designed to allow commanders and operators to exercise **appropriate levels of human judgment over the use of force**." Note: the standard is "appropriate human judgment," *not* a literal human-in-the-loop mandate for every system. Explicitly ties AI-enabled systems to the AI Ethical Principles + RAI Pathway. — [DoDD 3000.09 update release](https://www.war.gov/News/Releases/Release/Article/3278076/) (Jan 2023)

- **NIST AI Risk Management Framework 1.0 (Jan 26, 2023)** — voluntary; four functions **Govern / Map / Measure / Manage**. DoD's RAI tooling and T&E align to it directionally, but DoD's binding governance remains its own principles + RAI Pathway + 3000.09. — [NIST AI 100-1](https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf)

- **Data classification gates where AI can run (DISA Cloud Computing SRG Impact Levels):** IL2 (public, ≈FedRAMP Moderate) → IL4 (CUI) → IL5 (higher-sensitivity CUI / unclassified NSS; dedicated infra, U.S.-person staffing) → IL6 (SECRET, SIPRNet enclave). **FedRAMP authorization alone does not satisfy the DoD SRG** — providers must also meet the matching IL plus DoD overlays. This is why Army GenAI pilots run at **IL5** to touch CUI. — [DISA CC SRG](https://disa.mil/-/media/Files/DISA/News/Events/Symposium/Cloud-Computing-Security-Requirements-Guide.ashx)

- **CDAO** (Chief Digital and AI Office) became fully operational Jun 1, 2022 (merging JAIC, DDS, Chief Data Officer, Advana). It runs Tradewinds and issued **"Guidelines and Guardrails for Generative AI"** plus a **GenAI Responsible AI Toolkit**. Generative-AI efforts moved from **Task Force Lima (Aug 2023)** to a permanent **AI Rapid Capabilities Cell (Dec 2024, ~$100M)**. — [CDAO Tradewinds](https://www.ai.mil/Industry/Tradewinds/); [AI RCC fact sheet](https://www.ai.mil/Portals/137/Documents/Resources%20Page/2024-12-CDAO-Artificial-Intelligence-Rapid-Capabilities-Cell.pdf)

- **Army specifics:** Army AI Integration Center (**AI2C**) at Carnegie Mellon; a **100-day AI risk effort → 500-day implementation plan** (2024); **#CalibrateAI** generative-AI acquisition pilot (Oct 2024) deployed at **IL5** with built-in citation + hallucination detection and **human-in-the-loop** required by ASA(ALT) policy. Newer: the Army stood up a **49B AI/ML officer area of concentration (Oct 2025)**. — [#CalibrateAI](https://www.army.mil/article/280500/); [AI2C](https://ai2c.army.mil/)

> *Newer context surfaced in research (post-2025, verify before quoting in formal docs): a top-level "AI Strategy for the Department of War" (Jan 12, 2026); the enterprise **GenAI.mil** platform (Dec 2025, 3M+ users); CDAO's **Wingman** agent-builder.*

### B. How DoD/Tradewinds selects and funds AI (the bar to clear)

- **Tradewinds Solutions Marketplace** = repository of post-competition, **"awardable"** 5-minute pitch videos under CDAO; monthly assessment; the **last-day-of-month noon-ET** cutoff; binary Awardable / Non-awardable outcome; reviewers score on **clarity, technical merit, and mission relevance**. Marketplace "as of Mar 2026": ~1,135 awardable solutions, $3.3B awarded; 2025 median PALT ~45 days. — [Tradewinds FAQ](https://www.tradewindai.com/faqs); [TW Marketplace](https://www.tradewindai.com/tw-marketplace)
- **The four required video elements:** (a) the **problem** + confirm it falls within a **Strategic Focus Area**; (b) the **solution + current TRL** (+ maturation plan if low, demo/testimonial if high); (c) **potential impact** — value proposition, the science behind it, current customers, and quantified time/money/risk savings; (d) **uniqueness** vs named alternatives. *(Exact point-weighted rubric is Appendix B of the live SAM.gov Announcement — not fully verifiable from the public FAQ; the current Strategic Focus Area list also lives only in the live Announcement.)*
- **TRL (1–9)** is a required field and the maturity signal DoD weights; it also routes funding type (research → sustainment). Authoritative definitions: [DoD TRA Guidebook (Feb 2025)](https://www.cto.mil/wp-content/uploads/2025/03/TRA-Guide-Feb2025.v2-Cleared.pdf).
- **What DoD says it funds:** mission/decision advantage, speed of delivery, responsible development, T&E/assurance, and **AI-ready data** as the foundation. The AI RCC scales GenAI across 15 named use cases (C2/decision support, planning, logistics, intel, cyber, plus enterprise: finance, HR, supply chain, healthcare, legal, procurement, software). — AI RCC fact sheet.

### C. What "good" looks like — documented successes (with honest caveats)

Use these as **archetypes** of fundable use cases, not as quotable performance guarantees.

- **Project Maven / Maven Smart System (CDAO+NGA)** — CV + decision support compressing the targeting chain; scaled from hundreds to thousands of users via >$500M in contracts; NGA Maven ~20,000 users. *Throughput figures ("~1,000 recommendations/hour") are test rates, not sustained operational performance; a 2026 strike episode showed throughput ≠ accuracy.* — [Maven coverage](https://defensescoop.com/2026/04/15/palantir-maven-smart-system-pentagon-program-transition-feinberg/)
- **Predictive / Condition-Based Maintenance Plus (CBM+)** — fielded on Army aviation/ground platforms. **Important counter-finding: GAO-23-105556 found DoD had NOT fully implemented predictive maintenance on any reviewed weapon system and that the services "generally lack metrics."** Treat anecdotes (e.g., "$24M / 6,200 hours saved" on Chinook) as self-reported. — [GAO-23-105556](https://www.gao.gov/products/gao-23-105556)
- **Logistics / sustainment** — DLA ML demand forecasting (reported moving ~60% → 85% target; 55 models in production). Self-reported. — [DLA AI summary](https://www.traxtech.com/ai-in-supply-chain/55-ai-models-to-transform-military-supply-chain-operations)
- **Medical readiness** — MERIT (DHA/MITRE) ensemble ML over 3M+ Army EHRs; **projected** to cut the pre-DES period ~180 days and save "billions" (DoD pays ~$3B/yr for non-deployable soldiers). Projected, not yet measured. — [MERIT](https://www.mitre.org/news-insights/impact-story/merit-delivers-on-its-name-ai-improves-military-medical-readiness)
- **Talent management** — Army retention-prediction models and the AI-matched Talent Marketplace (fielded; qualitative outcomes).
- **Contracting/finance** — clause-review and determination automation (e.g., review time 6 hrs → 6 min in an IRS analogue); Army financial-management AI targeting unmatched transactions. Verifiable concrete wins are narrow; **GAO/commentary caution AI won't fix the audit problem by itself.**
- **Cyber** — Army AI red-teaming; "Defense Llama" (classified). Qualitative.
- **Generative AI** — NIPRGPT pilot (700k+ DoD users) validated demand → enterprise GenAI.mil. Adoption is real; effectiveness/ROI mostly self-reported.

### D. What goes wrong — the failure modes a good intake tool should screen for

- **Data readiness is the #1 killer.** GAO repeatedly: DoD lacks complete/accurate/standardized data; components work in isolation, inhibiting data/infra sharing. Army field data "in tough shape, not labeled" — a CENTCOM pilot had to relabel data before any model could train. — [GAO-22-105834](https://www.gao.gov/assets/gao-22-105834.pdf); [Project Linchpin](https://defensescoop.com/2024/04/22/army-rethinks-approach-ai-enabled-risks-project-linchpin/)
- **T&E / assurance is unsolved for learning & generative systems.** No DoD-wide formal AI T&E standard yet; CDAO's own assurance framework lists generative AI, adversarial ML, autonomy, system-of-systems, and continuous oversight as **open** assurance problems. AI "brittleness"/out-of-distribution behavior makes T&E fundamentally harder than hardware. — [CDAO assurance framework](https://cdao.pages.jatic.net/public/program/A_Framework_for_the_Assurance_of_AI-enabled_systems.pdf); [National Academies AF study](https://nap.nationalacademies.org/read/27092/chapter/5)
- **Automation bias / over-trust** in AI decision support raises error/miscalculation risk in national-security settings. — [arXiv 2306.16507](https://arxiv.org/pdf/2306.16507)
- **The "valley of death."** Pilots stall on fragmented data, ATO/FedRAMP cliffs, CUI scope, color-of-money, and unfunded production paths — *not* model performance. — Military.com (summarizing GAO/OIG), Jan 2026.
- **Workforce.** DoD cannot fully identify its AI workforce or which roles need AI skills; talent deficit called "one of the greatest impediments." — [GAO-24-105645](https://www.gao.gov/products/gao-24-105645)
- **Acquisition.** No department-wide AI acquisition guidance; agencies don't capture lessons learned; buyers under-count **total cost of ownership** (sustainment), risking systems "too expensive to sustain." — [GAO-23-105850](https://www.gao.gov/products/gao-23-105850); [GAO-26-107859](https://www.gao.gov/products/gao-26-107859)
- **Shadow AI / model supply chain.** Ungoverned tool use and foreign-model/data-leakage concerns; generative AI adds hallucination + CUI leakage risk (e.g., pushing ChatGPT to IL5 without publicly addressing leakage/hallucination). — [GAO-25-107653](https://www.gao.gov/products/gao-25-107653)

### E. Oversight findings — the standard reviewers actually apply

- **DODIG-2025-039 (Nov 2024):** CDAO was **overdue** on the Adoption Strategy implementation plan and AI policy; roles undefined; CDAO/DoD-CIO confusion. Recommends a published implementation plan with **performance measures tied to outcomes/goals**. — [DODIG-2025-039](https://www.dodig.mil/Reports/Audits-and-Evaluations/Article/3967388/)
- **DODIG-2020-098:** JAIC lacked a standard AI definition, security classification guide, project repository, and data-sharing/legal/privacy standards; components had inconsistent security controls. — [DODIG-2020-098](https://www.dodig.mil/reports.html/Article/2243508/)
- **GAO themes:** comprehensive-strategy gaps + AI KPIs (GAO-22-105834); no AI acquisition guidance (GAO-23-105850); workforce can't be identified (GAO-24-105645); no lessons-learned capture + TCO blind spots (GAO-26-107859); generative-AI sprawl outpacing governance (GAO-25-107653). The **GAO AI Accountability Framework (GAO-21-519SP)** organizes responsible AI around **governance, data, performance, monitoring**.
- **NDAA direction (FY25/FY26, section numbers per secondary analysis — verify against enrolled text):** department-wide AI cybersecurity & governance policy (data poisoning, jailbreaks, SBOM-for-AI); a CDAO-led model-assessment cross-functional team and a department-wide AI assessment framework (model performance, testing, security, ethical-use).

### Confidence & caveats (carry into any external use)
- **High confidence (cite freely):** the governance frameworks (A), Tradewinds mechanics + four elements (B), the GAO/OIG findings (E). These are primary-source and stable.
- **Medium:** documented successes (C) — real programs, but most performance numbers are self-reported/projected. Pair any number with its caveat; the GAO predictive-maintenance counter-finding is the safest "balanced" note.
- **Verify before formal/external use:** the exact Tradewinds Appendix B scored rubric and current Strategic Focus Area list (live SAM.gov Announcement); NDAA section numbers; and the very recent (2026) operational claims (e.g., specific strike statistics) — keep these out of Scout's mouth.

---

## Part 2 — Action plan: updating LaunchPad's prompts, wizard, outcomes & scoring

Goal: make Scout coach toward what DoD *actually funds and audits*, and make the governance gate screen for the documented failure modes. Mapped to the code in `lib/tenant/dow.ts`, the wizard steps, `app/actions.ts` (Scout), `lib/submissionReadiness.ts`, and `app/admin/compare-actions.ts`.

### 1. Scout's strategic context (`dow.ts → strategicContext`)
Rewrite so Scout reasons from the **AI Hierarchy of Needs** and pushes for specifics:
- Frame: a serious DoW AI idea (a) names the **Adoption-Strategy goal** and **mission outcome** (readiness, decision advantage, sustainment, force protection, responsible speed) it advances and the mechanism; (b) states **data readiness** (does AI-ready, labeled, accessible data exist, or is relabeling needed?); (c) states **classification / Impact Level** (Unclass/CUI/Secret → IL2/IL4/IL5/IL6); (d) states **human-judgment posture** (who decides, where the human is in the loop); (e) states **TRL** and a maturation or sustainment plan; (f) acknowledges what it does **not** address.
- Add the explicit anti-patterns to push back on: "modernization/efficiency" with no named priority; no data plan; no human oversight; decisional AI about people without review; no T&E/assurance story; no sustainment cost.

### 2. Responsible-AI risk gate (governance questions — locked-on)
Replace the USPTO/EO framing with a **DoD RAI gate** built on the five Ethical Principles + the documented risks. Proposed locked questions:
- **Data classification / Impact Level:** Unclassified / CUI / Secret → required IL (IL2/4/5/6). *(new, DoD-critical)*
- **Human judgment (Governable/Responsible):** Does the AI inform or make a decision? Is there mandatory human review? Can it be disengaged/deactivated?
- **Decisional about people:** Does it make or materially influence decisions about individuals (personnel, targeting, benefits)? → elevated review.
- **Model sourcing & supply chain:** American-built? Hosted inside the accredited boundary (Bedrock GovCloud IL4/5)? Any foreign model/data exposure?
- **Bias (Equitable):** What populations/data could carry unintended bias; mitigation?
- **Traceable:** Are data sources, methods, and outputs auditable/cited? (esp. for generative AI — citation + hallucination controls.)
- **Reliable / T&E:** How will it be tested for safety/security across its lifecycle; brittleness/out-of-distribution plan?
- **Data readiness:** Does AI-ready labeled data exist today? *(screens the #1 failure mode.)*

### 3. Strategic-alignment options (`dow.ts → focusAreas`)
Keep the two current groups but tighten to the authoritative sets and add a Tradewinds mapping:
- **Group 1 — Adoption Strategy goals** (already close; keep).
- **Group 2 — DoD AI Ethical Principles** (already present; keep).
- **Add Group 3 — Mission outcome** (readiness, decision advantage, sustainment/logistics, force protection, responsible speed, enterprise efficiency) so each idea ties to an outcome leaders fund.
- **Add a "Tradewinds Strategic Focus Area" field** (free pick) — pulled from the live Announcement at submission time, so the video's Element-2 mapping is captured. *(verify list from SAM.gov.)*

### 4. Readiness scoring rubric (`lib/submissionReadiness.ts` / `assessReadiness`)
Move from generic completeness to a **DoD-weighted** rubric. Score/flag on:
- **Priority alignment** named (not vague) — required.
- **Data readiness** — AI-ready data exists vs. needs build/relabel (heavy weight; it's the top killer).
- **Human-oversight posture** present and appropriate.
- **Classification/IL** declared and consistent with the data.
- **TRL** declared; maturation or sustainment plan if low.
- **T&E / assurance** story present (bonus for generative-AI citation/hallucination controls).
- **Quantified, caveated value** (time/cost/risk/readiness) rather than adjectives.
- **Sustainment / total cost of ownership** acknowledged.
Output verdict tiers: *Ready / Needs work / Early stage* with the specific missing element called out.

### 5. Wizard field changes (steps)
- **Add a Classification / Impact Level field** (Unclass / CUI / IL4 / IL5 / IL6) on the feasibility/security step — first-class for DoD. *(riskFramework already references it; surface it as a real field.)*
- **Add a TRL field** (1–9) on the Solution step.
- **Add a Data-readiness field** (AI-ready / partial / needs build) on the Solution or Feasibility step.
- Re-anchor the Value step to **readiness / decision advantage / cost / risk reduction** (done in copy; reflect in options).

### 6. Decision Center / exec briefing (`compare-actions.ts`)
- Brief leaders on **readiness, decision advantage, cost, and risk reduction** (already re-anchored to tenant context).
- Add an **"oversight lens"**: for each candidate, surface data-readiness, human-oversight, classification, and TRL so funders see the GAO/OIG-style risks up front — and an explicit **"what's NOT addressed"** gap list (mirrors GAO's portfolio-gap critique).

### Sequencing recommendation
1. **strategicContext + RAI risk gate** (highest leverage; pure prompt/config in `dow.ts` + actions) →
2. **focusAreas + Value options** (config) →
3. **readiness rubric** (`submissionReadiness`/`assessReadiness`) →
4. **new wizard fields** (TRL, Impact Level, data readiness) →
5. **Decision Center oversight lens**.

Steps 1–2 are low-risk config edits with the biggest demo payoff; 4 touches the form schema and needs the most care.
