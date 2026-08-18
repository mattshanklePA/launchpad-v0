# Keystone redesign — divergences from the brief

Mocks: `00`–`10 *.dc.html` in this project (plus PNG exports in `handoff/png/`).
Every divergence below was a deliberate call, most of them decisions the product owner made during review. Everything else follows the brief as written.

## 1. Theme: Keystone visual system, not "no reskin"
The brief says to keep the shadcn/ui + Tailwind look and treat this as a layout pass. Per the owner's decision, the mocks apply the approved Keystone identity instead: basalt/chalk/limestone palette, amber reserved for attention, Chivo (display) / Hanken Grotesk (body) / JetBrains Mono (labels), hairline borders over shadows. **Implementation note:** keep building on shadcn/ui — map the Keystone tokens onto its theme (CSS variables), don't replace the component library.

## 2. Typography rule beyond the brief
Mono appears **only** in uppercase micro-labels and badges. Every number and every readable sentence is Chivo or Hanken (survives compressed video). Nothing readable under 13px. See the type scale on the components sheet (00).

## 3. Dashboard: "do this first" hero instead of equal-weight rows
Screen 1's must-shows are all present, but re-weighted: the most critical Action Center item (the duplicate cluster) is promoted to a basalt hero card with one chalk button; the remaining three items are quiet rows; the four KPI cards are demoted to a right rail (status edge + Chivo number, "every number opens the list behind it"); Decision Center is a demoted row. Zeros render as "–".

## 4. The cluster lives in two places
The brief says "there is no separate cluster page." Owner's decision: both. The dashboard path ("Open the cluster") gets a dedicated cluster screen; the reviewer path reaches the same decision as **step 1 of the review process** (screen 08). Same data, same two actions (Keep separate and link / Consolidate into lead) in both.

## 5. Review is a process, not one surface (screens 7–9)
The brief describes reviewer detail as one long page. Owner's direction: chunk everything.
- **07 decided record** uses tab views: "The decision" (who/what/when/why + Plumb's advisory read + conversation) and "Governance record" (checklist, per-field "Plumb proposes" rationale, compliance). The decision is above the fold in the header card on every tab.
- **08 in review** is a 5-step guided process (cluster → high-impact → RMF → inventory fields → disposition), one question per screen, progress + submission summary in a right rail. Approve isn't disabled — it doesn't appear until step 5.
- **09 loading** is the same shell with Plumb's staged-progress card (never a spinner) and a fixed-size slot the result lands into, so nothing shifts.

## 6. Wizard: merged Plumb loop, six steps not five
- The brief's step-2 spec (answer options with a Recommended tag, rationale line, "Other," "I have enough") is merged with the shipped thread pattern: Plumb asks follow-ups inline under the form; when satisfied, the submitter clicks **Have Plumb write the summary**; the drafted summary gets an **Apply** button (05b).
- Step count and names come from the repo (`lib/steps.ts`): 6 steps in 3 phases — Submitter Info; Business Problem & Opportunity; Proposed Solution & Benefits; Technical Constraints; Idea Overview; Review & Submit. The brief's "five-step" refers to the idea-flow subset (steps 2–6).
- Field labels are the registry's (`lib/fieldRegistry.ts`): Core Problem, Affected Business Units, Target Audience, Impacted Users Count, User Profile / Context, Refined Problem & Users Summary, Problem Impact.

## 7. Admin moved out of the sidebar
Not in the brief: the sidebar's Admin group (Form configuration, User management, Demo data, both exports) moves into a dropdown under the user's name, top right. Open state is mocked on the Intake Variant 3 board. Sidebar is Workspace / Organization / My view only.

## 8. One badge system
The mono uppercase chip zoo is replaced by one StatusPill set (approved/on-track green, in-review & needs-info amber, rejected red, draft/signed-off neutral) plus quiet mono "kind" tags (Idea, High-impact, Advisory) that are not statuses. Roll-up legend on 00 and 03.

## 9. Smaller additions
- **02 scoped:** added the program's use-case list (not a must-show) so drilling into ACWS lands somewhere; every KPI says "of N enterprise-wide."
- **03 roll-up:** roll-up table primary; approval-transparency table and the rationalization panel stepped back below it.
- **04 drilldown:** rendered over the real dashboard under a basalt scrim; includes the empty state ("Nothing off-plumb").
- **Disposition trio states:** the made decision becomes a filled color chip; alternatives step back to outline/ghost; everything reversible until sign-off.
- **06 Review & Submit:** submit stays enabled in the Needs Work state ("expect a request for the missing answers") rather than hard-blocking — flag if vetting policy requires a block.
- **Data is demo data:** counts, names, dates, and the 40%/74% match scores are plausible placeholders, not real figures.
