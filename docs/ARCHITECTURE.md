# LaunchPad — Architecture & Environment Guide

**Audience:** an engineer or collaborator joining the project.
**Goal:** understand the lay of the land fast — what the system is, how it is built, where things live, how to run it, and where customization is meant to happen.

**Last updated:** 2026-06-11 · **Branch:** `USPTO-launchpad`

---

## 1. What LaunchPad is

LaunchPad is a web application for intake and governance of AI use cases in a government setting. People submit AI ideas through a guided, plain-language wizard. An AI assistant vets and structures each idea. Reviewers and leaders track everything through a pipeline and compare candidates in a Decision Center to decide what to fund.

It is currently a working **prototype**, not an authorized production system.

---

## 2. Tech stack

- **Framework:** Next.js 14 (App Router) on React 19, TypeScript.
- **UI:** Tailwind CSS, Radix UI primitives via shadcn/ui, lucide-react icons, framer-motion, sonner (toasts), recharts (charts).
- **AI:** Vercel AI SDK (`ai` v5) with the Anthropic provider (`@ai-sdk/anthropic`). Structured outputs via `generateObject` + zod schemas.
- **Data:** Supabase (hosted Postgres) via `@supabase/supabase-js`.
- **Forms:** react-hook-form + zod.
- **PDF export:** jspdf / jspdf-autotable.
- **Hosting:** Vercel (app) + Supabase (database).
- **Package manager:** pnpm.

---

## 3. High-level architecture (request flow)

```
Browser (React client components)
  -> Next.js App Router (server actions + API route handlers in app/api)
    -> lib/* domain logic
      -> Supabase Postgres (server-side, service-role)  and  Anthropic (server-side)
```

**Key rule:** the browser never talks to Supabase directly. All data access goes through server-side API routes / server actions using the service-role client. This keeps DB credentials and access policy on the server (see `lib/supabaseClient.ts`).

---

## 4. Repository layout

```
app/                     App Router routes + server code
  page.tsx, layout.tsx   root
  login/ signup/ home/   auth + landing
  submit/                the guided submission wizard (multi-step)
  submissions/ [id]/     list + detail views
  admin/                 reviewer/leader pipeline
  decisions/             Decision Center
  api/                   route handlers (form-config, seed, submissions, users, users/login, users/[id])
  actions.ts             server actions
lib/                     domain logic (the brains)
  supabaseClient.ts      two Supabase clients (admin/server, anon/unused)
  modelProvider.ts       resolves the active ModelProvider (swap point)
  notifier.ts            resolves the active Notifier (swap point)
  systemConnector.ts     resolves the active SystemConnector (swap point)
  submissionStore.ts     resolves the active SubmissionStore (swap point)
  ports/                 adapter interfaces (contracts) - see docs/BOUNDARY.md
  adapters/default/      default adapters (Anthropic, Supabase store, Slack, Rally)
  submissions.ts         submission CRUD helpers
  reviewWorkflow.ts      status + comments helpers
  submissionReadiness.ts, riskProfile.ts   scoring / readiness
  formConfig.ts, fieldRegistry.ts, steps.ts, strategicFocusAreas.ts   wizard/field config
  auth.ts                authentication helpers (demo-grade)
  rallyClient.ts         Rally integration client
  slackWebhook.ts        Slack notifications
  pdfGenerator.ts        PDF export
  seedSubmissions.ts, dataCache.ts, utils.ts
components/              UI components (steps/, admin/, home/, ui/ shadcn)
context/                 React context (form-context.tsx = wizard state)
db/migrations/           SQL migrations (0001-0004)
public/                  static assets
styles/                  Tailwind globals
```

---

## 5. Data model & persistence

- Submissions are stored in Supabase Postgres. A row carries structured columns plus a `form_data` JSON blob holding the full wizard payload, review status, and comments.
- Access pattern: API routes call `lib/submissions.ts` helpers — `saveSubmission` (new), `patchSubmissionFormData` (update in place), `setSubmissionStatus`.
- `lib/submissions.ts` keeps its public API but now delegates to the **SubmissionStore** port via `getStore()` (`lib/submissionStore.ts`). The default adapter is `lib/adapters/default/supabaseStore.ts`. Callers and signatures are unchanged; to run against an agency database, swap the store in `lib/submissionStore.ts`.
- Status lives in both a `status` column and `form_data.reviewStatus`; comments live in `form_data.comments` (no separate comments table). Keep column and JSON in sync via the helpers.
- Two Supabase clients (`lib/supabaseClient.ts`):
  - `getSupabaseAdmin()` — service_role key, bypasses RLS, **server-only**. Never import into client code.
  - `getSupabaseAnon()` — publishable key, browser-safe, **currently unused** (kept for future realtime).
- Migrations in `db/migrations/`: review workflow, demo status fixes, demo examples, users & assignees. Tenant-specific migrations live under `db/migrations/<tenant>/` (e.g. `db/migrations/doc/`).

### Org hierarchy: Department -> Bureau -> Office (DoC)

The DoC tenant models a three-tier org taxonomy:

- **Department** — the whole tenant (Commerce). The Office of the Secretary (`businessUnit === "os"`) and a department-level viewer with no `businessUnit` (e.g. the seeded department admin) see every submission — the only two cross-bureau (roll-up) views.
- **Bureau** — `submissions.business_unit` / `users.business_unit`, driven by `getTenant().unit.options` (e.g. `census`, `noaa`). This tier existed before the office work; roll-up is `components/admin/bureau-rollup.tsx`.
- **Office** — `submissions.office` / `users.office` (added in `db/migrations/doc/0001_office_hierarchy.sql`), an optional sub-level under a bureau. Only bureaus that declare `offices` on their `UnitOption` in `lib/tenant/doc.ts` (currently Census, ITA, NOAA) show an office dropdown in the wizard (`components/steps/step-1-submitter-info.tsx`) or an office drill-down under their roll-up row (`components/admin/office-rollup.tsx`, aggregation in `lib/officeRollup.ts`). Bureaus without offices behave exactly as before — `offices` is optional so USPTO and DoW are unaffected.
- **Admin assignment** — an admin sets a reviewer's bureau and office from `components/admin/user-management.tsx`. The bureau dropdown reads options from `getTenant().unit.options` (tenant-aware, no hardcoded USPTO list); a dependent office dropdown appears only when the selected bureau declares `offices`, and resets whenever the bureau changes. Both fields persist via the existing `PATCH /api/users/:id` (no schema/API changes — office was already plumbed end-to-end). **A reviewer must log out and back in for a new bureau/office assignment to take effect** — `office`/`business_unit` are read onto the session at login (`lib/auth.ts`), not re-read live, so `visibleSubmissions` roll-down scoping reflects the change only after re-authentication.

**Roll-down visibility (`visibleSubmissions` in `lib/reviewWorkflow.ts`)** mirrors this, and hard-limits every bureau-assigned viewer to their own bureau: a submitter sees only their own submissions; a reviewer *or admin* with a non-`os` `businessUnit` sees only that bureau (narrowed further to `office` when set) — an admin's bureau assignment rolls down exactly like a reviewer's, so e.g. a NOAA admin never sees BEA's or Census's submissions. The Office of the Secretary (`businessUnit === "os"`) and a viewer with no `businessUnit` at all (department admin, or a reviewer with no unit) keep the roll-up and see everything. Every admin/reviewer surface routes through this one function so nothing bypasses the scope: the pipeline (`components/home/reviewer-home.tsx`), the bureau roll-up (`components/admin/bureau-rollup.tsx`, scoped via the `submissions` prop its caller passes in), Decision Center (`components/admin/decision-center.tsx`, which now takes a pre-scoped `submissions` prop rather than fetching unfiltered data itself), the admin dashboard's Overview/Idea Pipeline tabs (`app/admin/page.tsx`, scoped at the point it hydrates its `submissions` state from the cache), and the submission detail page (`components/submissions/submission-detail.tsx`, which re-checks `visibleSubmissions([sub], viewer)` so a direct link to another bureau's submission ID can't bypass the list-level scope; its "similar use cases" cross-bureau duplicate surface is likewise computed only over the viewer's visible set).

**RLS posture:** `0001_office_hierarchy.sql` enables row level security on `submissions` with a policy for the `authenticated` Postgres role that mirrors the *previous* `visibleSubmissions` behavior (admin claim sees all; bureau claim scopes to `business_unit`; office claim further scopes to `office`), keyed on `auth.jwt() -> 'app_metadata'`. The app currently talks to Supabase only via the service_role client (`getSupabaseAdmin()`), which has `BYPASSRLS`, so this policy does not enforce anything today and does not yet reflect the admin bureau roll-down added here — it exists so DB-level scoping is already in place, not as the active security boundary. **`visibleSubmissions` is a client-side filter only, not a security boundary** — the app-level hard limit this section describes is what the DoC demo depends on today. **Follow-up (not done in this PR, tracked separately):** true server-side enforcement requires migrating the app's own auth (`lib/auth.ts`, a custom users table) onto Supabase Auth or another scheme that mints a per-request JWT carrying `role`/`business_unit`/`office` claims — that work depends on the pluggable-auth / SSO effort, at which point the RLS policy above should also be updated to match the admin roll-down (currently it still grants every `admin` claim full access, matching pre-roll-down behavior).

#### Per-bureau strategic priorities (DoC)

A `UnitOption` (`lib/tenant/types.ts`) can optionally declare its own `focusAreas?: FocusArea[]` — a bureau's own strategic priorities, in the same `{ id, label, category, description? }` shape as the tenant-level `TenantConfig.focusAreas`. `lib/tenant/doc.ts` populates this for every DoC bureau (source data + citations in `docs/research/doc-bureau-strategic-priorities.md`); the tenant-level `doc.focusAreas` (the OMB/federal-AI-framework list) remains the department-level fallback. USPTO and DoW `UnitOption`s never declare `focusAreas`, so they are unaffected — additive and optional, same pattern as `offices`.

`lib/strategicFocusAreas.ts` exports `getFocusAreasForUnit(businessUnit?: string | null): FocusArea[]`, the single place that resolves "which priority list applies here": it looks up `businessUnit` in `getTenant().unit.options` and returns that bureau's `focusAreas` when declared and non-empty, otherwise `tenant.focusAreas`. Two call sites use it to score/display against the *submission's own bureau* rather than the department-wide list:

- **Strategic Alignment Scout** (`suggestStrategicAlignment` in `app/actions.ts`, UI in `components/steps/step-7-alignment.tsx`) — scopes both the AI prompt's candidate focus-area list and the hallucination-guard validation (`validIds`) to `getFocusAreasForUnit(formData.submitterOffice)`, so a submitter under a bureau is scored against that bureau's mission, not Commerce's.
- **Admin OKR cards** (`app/admin/page.tsx`, the `{tenant.okrsLabel}` tab) — a bureau selector (rendered only when at least one bureau declares `focusAreas`, i.e. DoC) lets a viewer scope the OKR card list to a single bureau; the default/unscoped selection shows the department-level list, matching prior behavior for USPTO/DoW where no selector renders at all.

`lib/tenant/index.ts` exports the companion `getOrgNameForUnit(businessUnit?: string | null): string`, resolving "whose name goes in this sentence" the same way: it returns the matched `UnitOption.label` (e.g. "U.S. Census Bureau") only when that option declares `focusAreas` — the same bureau-tier gate as `getFocusAreasForUnit` — and falls back to `tenant.orgName` otherwise. This is what lets the Strategic Alignment step's header/prompt/label name the submitter's bureau instead of "Department of Commerce" once their bureau has its own priorities, while leaving USPTO/DoW untouched even though their `unit.options` (business units/commands) are populated — those options never declare `focusAreas`, so the gate always falls through to `orgName` for them. Consumers: the Strategic Alignment step title/prompt (`getFormSteps`, below), the focus-area label and Scout-analyzing copy in `components/steps/step-7-alignment.tsx`, and the alignment section heading in the PDF export (`lib/pdfGenerator.ts`).

#### Wizard step copy (tenant-aware)

The admin dashboard fix above (`okrsLabel`) covered the admin surface only; the submission wizard itself had its own hardcoded DoW/DoD copy (org name, strategic-priorities framing, and Feasibility & Security's DoD-specific citations) that leaked onto every tenant, including DoC. That copy now comes from `TenantConfig` (`lib/tenant/types.ts`) instead:

- `orgName` — the org's full name/acronym used in wizard prose (e.g. `Align with ${orgName} Goals`). Bare, no leading article; callers add "the" inline where the sentence needs one.
- `dataMaturityFraming` / `modelSourcingGuidance` — the Feasibility & Security step's "Data readiness & maturity" subtitle and model-sourcing paragraph, since each tenant has its own real framework here (DoD AI Hierarchy of Needs vs. OMB's use-case-inventory framing) rather than one bleeding into another's.
- `trlSystemName` / `srgCaveat` / `humanReviewCitation` — optional, DoW-only citations (its "Tradewinds" system, the DoD SRG caveat, DoDD 3000.09) that simply don't render when a tenant doesn't set them, instead of a component-level `if (tenant.id === "dow")` branch.
- `lib/steps.ts` exports `getFormSteps(submitterOffice?: string | null)` (not a static array) so the two steps whose title/prompt name the organization — Value and Strategic Alignment — resolve `orgName` per tenant at call time; every consumer (`step-wrapper.tsx`, the Step 10 recap cards, `wizard-nav.tsx`, `progress-bar.tsx`, the Scout server actions in `app/actions.ts`) calls the function rather than importing a shared constant. Strategic Alignment's title/prompt further resolve through `getOrgNameForUnit(submitterOffice)` (see "Per-bureau strategic priorities (DoC)" above), so callers that have the submitter's `formData` in scope (`step-wrapper.tsx`, the Step 10 recap, the Scout actions) pass `formData.submitterOffice` and get the bureau's own name once one is set; callers with no submitter in scope (`wizard-nav.tsx`, `progress-bar.tsx`, which only read `step`/`name`, never `title`/`prompt`) omit it and get the department-level name, matching prior behavior.
- `SUBMITTER_ROLE_LABELS` (also `lib/steps.ts`) is the single source of truth for the `submitterRole` enum's display labels, reused by the "Submitting as…" pill (`form-container.tsx`), the Step 10 recap, and the PDF export (`lib/pdfGenerator.ts`) — previously the pill kept its own stale copy of this map and could show a USPTO-flavored role name regardless of the role actually selected.

#### Product & assistant naming (tenant-aware)

`TenantConfig` (`lib/tenant/types.ts`) carries both the product wordmark (`productName`) and the in-app AI assistant's name (`assistantName`). DoC (`lib/tenant/doc.ts`) sets `productName: "Warder"` and `assistantName: "Kestrel"`; USPTO and DoW keep `productName: "LaunchPad"` and `assistantName: "Scout"` unchanged. Every component that shows the wordmark or the assistant's name reads it from `getTenant()` — `components/branding/launchpad-logo.tsx` (header/login/signup/form wordmark), `components/launchpad/chat-panel.tsx` (the coaching panel's title, tooltip, and error/empty-state copy), the wizard steps that reference the assistant (`step-2-use-case-overview.tsx`, `step-3-problem-and-users.tsx`, `step-4-proposed-solution.tsx`, `step-7-alignment.tsx`), `components/submissions/submission-detail.tsx` ("`{assistantName}`'s read" / "Draft with `{assistantName}`"), the admin Settings tab, `app/layout.tsx`'s page title, and `lib/pdfGenerator.ts`'s PDF header/footer. `app/actions.ts`'s AI system prompts and fallback copy also use `getTenant().assistantName` so the assistant introduces itself consistently with the branding shown in the UI. No logo/icon changed — the rocket mark and layout are shared across tenants; only the wordmark and assistant-name text differ.

#### OMB federal AI use case inventory: fields, export, and reportability

The wizard captures OMB M-25-21 companion-guidance fields on Step 7 (Feasibility & Security) — `stageOfDevelopment`, `highImpact` (three-way: high-impact / presumed-but-not / not high-impact), `highImpactJustification`, `topicArea`, `aiClassification`, `highImpactFactors`, `hasATO`, `systemSource`, `hasPii`, `demographicFeatures`, `nationalSecuritySystem`, `researchOnly`, and the 9 high-impact-only risk-management fields (`lib/steps.ts`), each registered in `lib/fieldRegistry.ts` with `omb: true`. Every OMB- or department-level field (`FieldDefinition.level`) renders a `FieldRequirementBadge` (`components/launchpad/field-requirement-badge.tsx`, issue #60) next to it in the wizard — "Required (OMB)" or "Required (Department)", with a hover tooltip carrying the field's `reasonToInclude` — looked up live from the registry so it can never drift from the admin Form Configuration panel's own OMB/Department badges (`components/admin/form-config-panel.tsx`). All are optional, so USPTO/DoW tenants that don't fill them in are unaffected.

Four pieces of pure, unit-tested logic build on those fields:

- **Export** — `lib/ombExport.ts` maps a submission to one CSV row in the OMB inventory's column order (`app/api/export/omb/route.ts` streams it), including "Reporting Mode" and "Consolidated Category" columns sourced from `determineConsolidation()` (see below). `buildOmbCsv()` emits one row per **individually**-reported submission (every high-impact use case is always in this group), then — instead of one row per bureau — a single department-level row per **consolidated** category (`consolidated:<categoryId>`, e.g. `"Email prioritization & categorization (consolidated)"`), listing which bureaus and how many submissions it stands in for. Rows are ordered by `CONSOLIDATION_CATEGORIES` (not submission order), so the export is deterministic regardless of input sort order.
- **Consolidated vs. individually-reported classification** — `lib/ombConsolidation.ts` (`determineConsolidation`) is the cross-bureau rationalization piece: it classifies a use case as **Consolidated** (matches one of OMB's ~19 "widely used commercial AI" categories from the 2025 reporting guidance/cheat sheet — e.g. email triage, meeting transcription, code generation, enterprise search — which a department reports **once** across every bureau) or **Individual**. Matching is deterministic regex over the submission's free text (`useCaseTitle`, `useCaseDescription`, `coreProblem`, `problemDefinition`, `proposedSolution`, `solutionSummary`, `businessValue`) against `CONSOLIDATION_CATEGORIES`, so a match is always explainable by the pattern that fired — no ML. This is category matching, a different question from `lib/similarity.ts`'s text-overlap dedup (which flags two submissions that look like the *same idea*, regardless of category). **High-impact use cases are always `Individual`, never `Consolidated`** (coordinates with the high-impact determination below); the category match is still surfaced in that case (`category`/`categoryLabel`) so a reviewer can see *why* an otherwise-consolidatable use case is being reported on its own. The result is shown on the submission detail view (an "OMB reporting mode" card next to "OMB reportability") and as a "Consolidated (OMB)" count column plus a department-wide "consolidates to M OMB reportable entries" summary in the bureau roll-up (`components/admin/bureau-rollup.tsx`). The DoC seed (below) includes a cross-bureau consolidated trio so this summary line visibly collapses (12 use cases → 10 OMB reportable entries) instead of reading 1:1 with the submission count — see [issue #33](https://github.com/mattshanklePA/launchpad-v0/issues/33).
- **Reportability determination** — `lib/ombReportability.ts` (`determineReportability`) decides *whether* a use case must be reported at all, per the OMB "Guidance on 2025 Agency AI Reporting" (June 27, 2025) and the OMB AI Inventory Reporting Cheat Sheet: include at any stage of development if it supports mission/service delivery, enhances internal decisions, or benefits the public; exclude National Security System/Intelligence Community use or research-only use; a research-only use that controls or significantly influences a decision about individuals is reportable despite being research. When a required input (stage, NSS, or research-only) hasn't been answered yet, the result is `"review"`, erring on the side of inclusion. The result (`status` + one-line `reason`) is surfaced on the submission detail view (`components/submissions/submission-detail.tsx`) and as an "OMB review needed" count column in the bureau roll-up (`components/admin/bureau-rollup.tsx`).
- **High-impact determination** — `lib/highImpactDetermination.ts` (`determineHighImpact`) *recommends* whether a use case meets OMB's high-impact AI definition (M-25-21 Section 5) instead of trusting a bare self-reported flag. Two layers feed the recommendation: (1) the manual path — the submitter marks which of the five Section 5 categories the AI output could meaningfully affect — rights, safety, access to benefits, resource allocation, or enforcement actions (`highImpactFactors`); (2) an inference layer on top, added for [issue #27](https://github.com/mattshanklePA/launchpad-v0/issues/27) so the recommendation isn't blind to risk signals LaunchPad already captures elsewhere — decisional AI (`aiDecisionalImpact === "yes"`, the same field `lib/riskProfile.ts` reads) infers **rights**; a high-`severity` problem whose problem/solution text names a life-safety scenario infers **safety**; decisional AI whose problem/solution text names benefits/eligibility, resource-allocation, or enforcement/adjudication language infers **access to benefits**, **resource allocation**, or **enforcement actions** respectively. Free text is always a secondary signal that narrows or corroborates a structured field (`aiDecisionalImpact`/`severity`) — it never triggers a category by itself. The function recommends `"yes"` (with one reason per flagged-or-inferred factor) if any category applies from either layer, else `"no"`. The submission detail view shows this recommendation alongside the reasons and lets the reviewer set the final `highImpact` call (`patchSubmissionFormData`) — advisory, the same pattern as Scout's read on a submission; the rule-based check, not Scout, is the source of truth.

  `highImpact` is OMB's exact three-way field (`"high_impact"` / `"presumed_not_high_impact"` / `"not_high_impact"`, docs/omb-2025-inventory-fields.md field #7) — not a Yes/No. Selecting `"presumed_not_high_impact"` reveals `highImpactJustification` (field #8), a required free-text explanation. Setting `highImpact` to `"high_impact"` **and** `stageOfDevelopment` to `"deployed"` reveals all 9 M-25-21 minimum-practice risk-management fields (#26-34) in the wizard: `preDeploymentTesting`, `aiImpactAssessmentCompleted`, `aiImpactAssessment`, `independentReviewConducted`, `ongoingMonitoringPlan`, `operatorTrainingEstablished`, `failSafeMechanism`, `humanOversightAppeal`, and `publicConsultationSteps` (select-multiple) — a pre-deployment or pilot high-impact idea has nothing to assess/monitor/appeal yet, so the group stays hidden until fully deployed (issue #60's `showWhen` conditional-disclosure predicate, see below). Every multiple-choice field in this group permits an "In-progress" and a CAIO-waiver answer, not just Yes/No — reconciled exactly against the doc's data dictionary (issue #65).

**Conditional disclosure (`showWhen`, issue #60)** — on top of the cascade (`fieldsForBureau`) and the admin on/off toggle (`isFieldEnabled`), a `FieldDefinition` can carry `showWhen?: (formData: FormData) => boolean`: a field renders only once its prerequisite is met, so a pre-deployment, non-high-impact submission isn't asked all ~34 OMB questions up front. Wired onto every conditional field in the registry: the 9 M-25-21 high-impact risk fields (`highImpact === "high_impact" && stageOfDevelopment === "deployed"`); `highImpactJustification` (`highImpact === "presumed_not_high_impact"`); `topicArea`/`aiClassification` (any non-empty, non-`"retired"` `stageOfDevelopment`); `hasATO`, `systemSource`, `operationalDate`, `trainingDataDescription`, `hasPii`, `demographicFeatures`, and `customCode` (`stageOfDevelopment` is `"pilot"` or `"deployed"`); `atoSystemName` (`hasATO === "yes"` **and** pilot/deployed) and `systemSourceVendorName` (`systemSource` is `"contract"`/`"vendor"` **and** pilot/deployed) — both doc-required sub-fields compound their parent-answer gate with the stage gate, not just the parent answer; `openSourceCodeLink` (`customCode === "yes"`); and `accessControlRequirements` (`involvesSensitiveData === "yes"`). The three optional-and-never-required fields (`link_to_data`/`federalDataCatalogLink`, `pia_url`/`piaLink`, `code_url`/`openSourceCodeLink`) are never in `lib/submissionReadiness.ts`'s required-field list, so they can't block submit even though `openSourceCodeLink` still uses `showWhen` for its own conditional visibility. `isFieldVisible(fieldKey, formData)` (`lib/formConfig.ts`) is the single resolver combining all three checks (cascade + enabled + `showWhen`); the wizard's `useFieldVisibility(formData)` hook and `lib/submissionReadiness.ts`'s required-at-submit check both call through it, so "still needed to submit" can never demand a field the submitter can't currently see.

#### Cross-bureau rationalization gate ("one Commerce")

Cross-bureau duplicate *detection* (`lib/similarity.ts` + `lib/crossBureauDuplicates.ts`, the "Possible duplicates" roll-up column and the submission detail "Similar use cases" panel) was purely informational — nothing made anyone act on "~20 of the same thing across the bureaus," the top concern from the DoC demo. `lib/rationalization.ts` adds the gate on top ([issue #52](https://github.com/mattshanklePA/launchpad-v0/issues/52)):

- **Clustering** — `clusterDuplicates()` groups submissions into connected components of the cross-bureau duplicate-match graph, where an edge is `lib/crossBureauDuplicates.ts`'s `isCrossBureauDuplicatePair` (same `ROLLUP_DUPLICATE_THRESHOLD` = 0.25 rule as the roll-up column: different bureau, not the same `lib/ombConsolidation.ts` category, `lib/similarity.ts` score at or above threshold). A cluster is only returned once it has 2+ members spanning 2+ bureaus. Cluster ids are deterministic — the lexicographically smallest member submission id — so they're stable across a demo reset against the golden seed. No-op (`[]`) for tenants without a bureau tier: `tenantHasBureauTier()` checks whether any `unit.options` entry declares `offices` (DoC-only, same signal `lib/tenant/index.ts`'s `getOrgNameForUnit` uses), so USPTO/DoW never see a cluster or a gate.
- **Decision** — a department/OS reviewer marks a cluster **consolidated** (picks a lead submission; the rest point at it) or **keep-separate** (not real duplicates / intentionally parallel) in the rationalization panel. The decision is persisted as `form_data.rationalization = { clusterId, decision, leadSubmissionId?, decidedBy, decidedAt }` on **every** cluster member (`lib/reviewWorkflow.ts`'s form-data-as-storage pattern — no schema change), written via `patchSubmissionFormData`. `lib/rationalization.ts` itself stays pure/I/O-free; `buildRationalizationPatch()` builds the patch object and callers apply it.
- **The gate** — `isRationalizationPending()`/`canApprove()`/`rationalizationBlockReason()` are the predicate: a submission that's a cluster member with no decision (or a decision recorded against a stale cluster id) is pending and blocks approval; a non-member is always approvable. Wired into the only reviewer approve path, `setSubmissionStatus(id, "approved")` in `components/submissions/submission-detail.tsx` — the Approve button is disabled with the reason shown inline, and `setStatus()` re-checks the gate before calling `setSubmissionStatus` so nothing else can bypass it. Deliberately computed against the **full, unscoped** submission set (not the viewer's `visibleSubmissions` roll-down that the "Similar use cases" panel uses) — a bureau-scoped reviewer approving their half of a cross-bureau duplicate must still be blocked even though they can't see the other bureau's half from their own view.
- **Surfacing** — `components/admin/rationalization-panel.tsx`, rendered on the Pipeline page (`components/home/reviewer-home.tsx`) below the bureau roll-up, lists each cluster's members (title, bureau, link) and similarity, a decision control (pick-a-lead + Consolidate/Keep-separate buttons), and a roll-up summary ("N duplicate clusters · M rationalized"). Receives the same viewer-scoped `submissions` prop as `BureauRollup`, so it's meaningful for department/OS-level viewers and naturally empty for a bureau-scoped reviewer (consistent with the roll-up's existing scoping). The submission detail page also shows a compact per-submission cluster card (pending vs. decided, with the other members) next to the Approve button.

**Duplicate-rationalization vs. OMB-consolidation — two different axes, kept separate:** this gate (the *duplicate* axis) asks "is this the same effort as something in another bureau, and should we stop funding it twice?" `lib/ombConsolidation.ts`'s `determineConsolidation()` (the *OMB category* axis, previous section) asks a different question of a single submission — "does this match an OMB widely-used-commercial-AI category that can be reported once instead of per-bureau?" A submission can be in a rationalization cluster and independently be OMB-`Consolidated` or -`Individual`; the two never merge into one control, and `crossBureauDuplicates.ts`'s same-category exclusion keeps them from double-flagging the same pair in practice.

#### Bureau sign-off & department approval transparency

Approving or rejecting a use case (`setStatus` in `components/submissions/submission-detail.tsx`) used to be a bare status flip — no record of who signed off for the bureau or when, and no single view of sign-off progress across the dispersed bureaus for the Office of the Secretary. `lib/bureauSignoff.ts` adds that record and the transparency built on it ([issue #54](https://github.com/mattshanklePA/launchpad-v0/issues/54)), following `lib/rationalization.ts`'s pattern: a pure, I/O-free module with `getX`/`buildXPatch` helpers, persisted in `form_data` (no schema change) and applied via `patchSubmissionFormData`.

- **Bureau sign-off** — approving or rejecting now also records `form_data.bureauSignoff = { bureau, decision, signedOffByName, signedOffByEmail, signedOffAt }` in the same patch as the status change, gated on `tenantHasBureauTier()` (the same DoC-only signal `lib/rationalization.ts` uses, so USPTO/DoW's approve/reject flow is byte-for-byte unchanged). The submission detail view surfaces it as "Signed off by `<name>`, `<bureau>`, `<date>`" (or "Rejected by…").
- **Department approval transparency** — `approvalTransparency(submissions, viewer)` is the cross-bureau selector: per bureau, a count of signed-off/pending/rejected items plus a flat who/when item list. The hard limit lives in the selector, not the UI: it returns every bureau's data only when `hasDepartmentTransparency(viewer)` (an OS admin, `businessUnit === "os"`, or a department-level admin with no bureau assignment — the exact same gate `visibleSubmissions`'s roll-up uses, scoped to admins), and otherwise falls back to the viewer's own bureau via that same `visibleSubmissions` roll-down. `components/admin/approval-transparency.tsx` renders it below the bureau roll-up on the Pipeline page (`components/home/reviewer-home.tsx`) — passed the **full**, unscoped submission list (not the pre-scoped `submissions` prop `BureauRollup`/`RationalizationPanel` get) so the selector's own scoping is what a bureau-scoped reviewer's view depends on, not a second filter the UI has to get right.
- **Optional department-final-approval tier** — a second, independent confirmation on top of bureau sign-off (`form_data.departmentApproval = { decision, byName, byEmail, at }`), toggled per tenant via `TenantConfig.features.departmentFinalApproval` (`departmentFinalApprovalEnabled()`; on for DoC, unset elsewhere). Only rendered/actionable for `hasDepartmentTransparency(viewer)` once a bureau sign-off already exists — bureaus never see or perform it, and bureau sign-off is fully functional with the tier off.
- **Roll-up reporting** — `components/admin/bureau-rollup.tsx` adds a "Signed off" column (`X/Y` per bureau, plus a department total), gated on `tenantHasBureauTier()` like every other DoC-only column. `lib/approvalReport.ts` (reusing `lib/ombExport.ts`'s pattern, including the shared `lib/csv.ts` escaping helpers now used by both) builds a CSV — bureau, use case, status, signed-off-by, signed-off-at, department-approval — one row per submission; `app/api/export/approval/route.ts` streams it, linked from the Pipeline page's admin tools for `hasDepartmentTransparency` viewers only.
- The DoC seed (`lib/seedSubmissionsDoc.ts`) deliberately includes a signed-off-and-department-approved item (NIST), a rejected item with a recorded sign-off (MBDA), and an **already-approved item with no sign-off record** (ITA) — a stand-in for data from before this feature existed, showing up as "pending" in the transparency view/roll-up despite its status already being "approved." That gap is exactly the transparency problem this feature closes.

#### Field-config cascade (OMB → Department → Bureau)

Before this ([issue #57](https://github.com/mattshanklePA/launchpad-v0/issues/57)), `lib/fieldRegistry.ts`'s per-field on/off toggle was flat: a field was either `locked` (nobody can turn it off) or a plain optional toggle any admin could flip for every visitor. That's a compliance gap for DoC — OMB mandates a prescriptive field set every bureau must collect, the Department (Office of the Secretary) adds its own mandatory fields on top, and a bureau may add its own optional fields, but a bureau must never be able to remove what OMB or the Department mandated. The cascade adds that authority ordering on top of the existing toggle mechanism, additively:

- **`level` metadata** — `FieldDefinition.level` (`lib/fieldRegistry.ts`) is `"omb" | "department" | "bureau"`, defaulting to `"bureau"` when unset (`fieldLevel()`) so every pre-existing registry entry is unchanged unless explicitly marked. The OMB use-case-inventory fields are `level: "omb"` — reconciled against `docs/omb-2025-inventory-fields.md`, OMB's own published data dictionary for the 2025 consolidated inventory (34 fields: 25 base + 9 high-impact-only). Every field whose OMB-defined answer options are captured directly by the wizard is represented in `lib/fieldRegistry.ts` (annotated `#N` per that doc's row numbers) — including the four fields deferred by an earlier pass for lacking real option lists ([issue #63](https://github.com/mattshanklePA/launchpad-v0/issues/63)): `topicArea` (15 options), `aiClassification` (6 options), `demographicFeatures` (12 options, select-multiple), and `publicConsultationSteps` (6 options, select-multiple) — plus `hasPii` and `aiImpactAssessmentCompleted`, found missing during the same reconciliation ([issue #65](https://github.com/mattshanklePA/launchpad-v0/issues/65)). `id`, `use_case_name`, `agency_bureau`, `contact_email`, and `is_withheld` (doc rows #1-5) already have stand-ins collected elsewhere in the wizard (`useCaseTitle`, `submitterOffice`, `submitterEmail`, `publicIndicator`) rather than a duplicate `level: "omb"` entry. The four DoC-mandated AI risk questions (`involvesSensitiveData`, `aiDecisionalImpact`, `aiModelSourcing`, `aiHumanReview` — already `locked: true` before this change) are `level: "department"`, not `"omb"` — a distinct DoC/executive-order mandate, not one of the OMB inventory fields itself. Note `hasPii` (OMB, field #21) and `involvesSensitiveData` (DoC) overlap in subject but are separate mandates — both are kept. A `businessUnit` field optionally scopes a `level: "bureau"` field to one bureau (e.g. a future Census-only optional field) — no such field exists yet, but the mechanism supports it: adding one is a registry entry, not a code change.
- **Tenant gating — the reason USPTO/DoW are unaffected** — the OMB inventory fields stay `locked: false` in the registry itself (flipping that globally would have newly locked them for every tenant, since the registry is shared). Instead, every cascade function — `fieldsForBureau`, `canToggleField`, `isFieldEnabled`/`isFieldMandatory` (`lib/formConfig.ts`) — checks `tenantHasBureauTier()` (`lib/rationalization.ts`, the same DoC-only signal the rationalization gate and bureau sign-off already use) before applying `level` at all. On a flat tenant, `level` is ignored entirely and behavior is byte-for-byte what it was before this issue; on DoC, `level: "omb"`/`"department"` fields become non-togglable and appear for every bureau regardless of the stored `enabled` map.
- **`fieldsForBureau(businessUnit)`** (`lib/fieldRegistry.ts`) is the single place that resolves "which fields apply to this bureau": every OMB/department field, plus the general unscoped optional pool (today's shared toggle set), plus any field scoped to `businessUnit` — never another bureau's scoped field. Both the wizard (`isFieldEnabled`/`useFieldVisibility` in `lib/formConfig.ts`, now taking an optional `businessUnit` — every wizard step component passes `formData.submitterOffice`) and the admin toggle UI (`components/admin/form-config-panel.tsx`, scoped to `getSession()?.businessUnit`) filter through it, so they can't drift apart.
- **`canToggleField(field, viewer, opts)`** is the permission predicate: locked fields are never togglable; on a bureau-tier tenant, `omb`/`department` fields are never togglable by anyone; a `businessUnit`-scoped field is togglable only by that bureau's viewer or a department-level viewer (`isDepartmentLevelViewer` — an `os`-bureau or no-bureau-assignment viewer, the same shape `hasDepartmentTransparency` in `lib/bureauSignoff.ts` uses); the general optional pool stays togglable by any admin, matching pre-cascade behavior.
- **Admin-promoted "mandatory for all bureaus"** — an OS/department admin can also promote an ordinary optional `level: "bureau"` field to mandatory for every bureau without a registry change, via `setFieldMandatory()`/`FormConfig.mandatory` (`lib/formConfig.ts`), gated by `canMarkFieldMandatory()`. This is a second jsonb column on `form_config` (`db/migrations/doc/0002_field_cascade_mandatory.sql`, additive — USPTO/DoW never run it and never send a `mandatory` value on `PUT /api/form-config`, so their deployments work unmigrated). Once set, `isFieldMandatory()` treats the field exactly like an OMB/department field — it appears for every bureau and only a department-level viewer can un-mandate it.
- **Admin UI** (`components/admin/form-config-panel.tsx`) — an OMB/department/mandatory field renders on and disabled with a badge (OMB / Department / "Mandatory (all bureaus)") and a one-line hint ("Required by OMB — mandatory for every bureau, cannot be turned off."); a bureau-scoped field carries a "`<Bureau>` only" badge and is disabled outside that bureau; a department-level viewer sees a "Mark mandatory for all bureaus" control on ordinary optional fields. Header counts (`X enabled`, `Y hidden`, `Z locked / mandatory`) are scoped to `fieldsForBureau(viewer's bureau)`, not the full registry, so a bureau admin's summary reflects only what they can see.
- **Full reconciliation (issue #65)** — all 34 fields in `docs/omb-2025-inventory-fields.md`'s data dictionary are now represented (directly, or via a stand-in noted above), each with OMB's exact answer-option list rather than a placeholder Yes/No. `is_high_impact` is the doc's real three-way choice (not binary), with its conditional `HI_justification` sub-field; all 9 high-impact-only fields (#26-34) carry their real multi-value option sets — Yes/In-progress/CAIO-waived, not just Yes/No — and every `showWhen` predicate matches the doc's "Required when" column, including compounding a parent-answer gate with a stage gate where the doc requires both (`atoSystemName`, `systemSourceVendorName`).

---

## 6. AI integration

- The AI assistant uses the Vercel AI SDK with the Anthropic provider. Calls use `generateObject` with zod schemas, so responses are schema-validated and consistent.
- Two main AI surfaces: the per-step submission assistant (vetting and pushback during the wizard) and the Decision Center comparative briefing (`app/admin/compare-actions.ts`).
- Prompts live alongside the server actions that call them. The model is resolved through a `ModelProvider` port: call sites use `getModel()` from `lib/modelProvider.ts` rather than referencing a provider directly. The default adapter (`lib/adapters/default/anthropicProvider.ts`) uses Anthropic, and the model id is overridable via `LAUNCHPAD_MODEL_ID`. To use an agency's approved endpoint, swap the provider in `lib/modelProvider.ts`.
- Requires `ANTHROPIC_API_KEY` in the environment (read by the AI SDK provider).
- Long AI calls (the comparison briefing) can exceed the default serverless timeout. Raise `maxDuration` on the relevant route segment or a server-component `layout.tsx` (Hobby plan max is 60s).

---

## 7. The submission wizard

- Multi-step guided flow under `app/submit`, orchestrated by a form container that switches on the current step. Rough step map: 1 submitter info, 2 problem, 3 solution, 4 value, 5 alignment, 6 feasibility, 7 success metrics, 8 idea overview, 9 review/submit, 10 confirmation.
- Wizard state lives in `context/form-context.tsx` and is persisted to the browser:
  - localStorage: `aid-form-data`, `aid-current-step`, `aid-editing-id`
  - sessionStorage: `aid-session-active`
- Resume logic restores in-progress drafts; resume is clamped to editable steps.

---

## 8. Review & decision workflow

- Reviewers/leaders work in `app/admin` (pipeline/kanban) and the Decision Center (`app/decisions`).
- Statuses: submitted, in review, needs info, approved, rejected, plus draft.
- The Decision Center compares 2-4 candidates and generates an AI executive briefing (recommendation + per-candidate verdict). Helpers in `lib/reviewWorkflow.ts` (getStatus, getComments) and `lib/submissions.ts`.

---

## 9. Auth & roles

- Current auth is **custom and demo-grade** (`lib/auth.ts` + `app/api/users*`). Users and assignees were added in migration 0004.
- This is explicitly a candidate for replacement by an agency SSO/ICAM adapter (see the integration-layer roadmap).

---

## 10. Environments & configuration

Required env vars:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. **No trailing slash** (a trailing slash causes PGRST125). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable/anon key. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret (server-only). |
| `ANTHROPIC_API_KEY` | Anthropic API key for the AI SDK. |
| `LAUNCHPAD_MODEL_ID` | Optional. Overrides the model id; defaults to `claude-sonnet-4-5-20250929`. |
| `SLACK_WEBHOOK_URL` | Optional. Slack notifications. |
| `RALLY_API_KEY` | Optional. Rally integration. |
| `NEXT_PUBLIC_TENANT` | Multi-tenant builds only. Selects tenant config; defaults to `uspto`. DoW build uses `dow`. |

**Multi-tenant:** a `getTenant()` resolver keyed off `NEXT_PUBLIC_TENANT` selects branding/config per deployment. Each tenant = separate Vercel project + Supabase instance + git branch (e.g., `USPTO-launchpad`, `dow`). The admin dashboard (`app/admin/page.tsx`) reads its header, subtitle, tab label, and seed OKR/priorities list from `getTenant().okrsLabel` and `getTenant().focusAreas` — no org-specific copy is hardcoded there, so a wrong tenant's strategic-priority term or content never leaks into another org's dashboard.

---

## 11. External integrations (existing adapter examples)

- **Notifications** go through the `Notifier` port. Core calls `getNotifier().send(...)` from `lib/notifier.ts`; the default adapter (`lib/adapters/default/slackNotifier.ts`) wraps `lib/slackWebhook.ts`. Swap for Teams/email in `lib/notifier.ts`.
- **System-of-record sync** goes through the `SystemConnector` port. Core calls `getSystemConnector().pushSubmission(...)` from `lib/systemConnector.ts`; the default adapter (`lib/adapters/default/rallyConnector.ts`) wraps `lib/rallyClient.ts`. Swap for ServiceNow / the AI Hub inventory in `lib/systemConnector.ts`.
- `slackWebhook.ts` and `rallyClient.ts` are placeholders today. The ports mean that when they are wired into the submit/decision flow, core code depends on the interface, not the concrete service.

---

## 12. Local development

```
pnpm install
# create .env.local with the vars in section 10
pnpm dev      # Next dev server
pnpm build    # production build
pnpm lint
```

Seed demo data via the `app/api/seed` route (see `lib/seedSubmissions.ts` for USPTO, `lib/seedSubmissionsDoc.ts` for DoC).

**DoC demo reset:** the admin Demo Data card's "Reset Demo Data" button (`app/admin/page.tsx`) wipes the tenant's `submissions` table (`clearSubmissions()`) and re-triggers `/api/seed`, which re-inserts `docSeedSubmissions` — a deterministic golden state of 12 submissions covering every review status (submitted, in review, needs info, approved, rejected, plus a submitter-owned draft), a near-duplicate comparison pair for the Decision Center, cross-bureau/office coverage, all three OMB reportability outcomes (reportable/excluded/review), a high-impact example with its risk fields populated, and a cross-bureau **consolidated trio** — three independently-worded submissions from NIST, NOAA, and ITA that all match `lib/ombConsolidation.ts`'s `meeting_transcription` category — so the bureau roll-up's "consolidates to N OMB reportable entries" summary actually collapses (12 → 10) instead of reading 1:1 with the submission count. `lib/seedSubmissionsDoc.test.ts` asserts this shape holds against the real `determineReportability`/`findSimilar`/`determineConsolidation` logic, not hand-picked expectations.

`/api/seed` builds each row's `status`/`owner_email`/`business_unit`/`office` workflow columns up front from `form_data` and inserts everything in a single batch, retrying once as a whole batch without `office` if that column doesn't exist yet (pre office-hierarchy migration). This replaced an earlier insert-then-N-per-row-update version: that pattern was slow enough to make "Reset Demo Data" look hung, and a page reload mid-flight could interrupt the update loop and leave some rows stuck on their DB-default `submitted` status — the cause of a live check turning up zero rejected/high-impact/reportable-variety rows despite the seed data having them. The button itself now runs the clear+reseed asynchronously with a spinner and is disabled while in flight, refreshes the shared submissions cache on success instead of reloading the page, and surfaces failures (including a partial clear) via a toast rather than leaving the page looking frozen.

---

## 13. Deploy

- Vercel for the app, Supabase for the database.
- Each tenant has its own Vercel project, Supabase instance, and git branch. Set env vars per Vercel project.
- Confirm `NEXT_PUBLIC_SUPABASE_URL` has no trailing slash.
- Raise `maxDuration` on AI-heavy routes (admin/decisions).

---

## 14. Where customization is meant to happen (the boundary)

LaunchPad's value is the **core**: the wizard engine, AI vetting logic, readiness/risk scoring, pipeline, and Decision Center.

Everything **agency-specific** — authentication, the AI model endpoint, the database/hosting, outbound connectors to agency systems, branding, and field config — should live in a thin, **swappable integration layer** around that core.

Keeping that boundary clean is both an architecture goal and an **IP-protection goal**: government-funded integration work can happen in the adapter layer without touching the proprietary core. The integration-layer roadmap subtasks track building this out.

The detailed design — the six port interfaces (ModelProvider, SubmissionStore, IdentityProvider, Notifier, SystemConnector, TenantConfig), their default implementations, who-touches-what rules, and migration order — lives in `docs/BOUNDARY.md`.

The repo is licensed **proprietary** (see `LICENSE`): all rights reserved, offered as a commercial item, delivered to government with restricted rights. The core stays Packaged Agile's; only the adapter layer is open to agency or government-funded contribution.

---

## 15. Gotchas

- Supabase URL trailing slash -> PGRST125 "Invalid path".
- AI calls can exceed the default serverless timeout; set `maxDuration` on the route segment (or a server-component layout) for admin/decisions.
- Browser never calls Supabase directly; add new data access as API routes.
- `form_data` JSON is the source of truth for much of a submission; keep the `status` column and JSON in sync via the `lib/submissions` helpers.
