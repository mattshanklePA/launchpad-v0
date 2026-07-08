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

- **Department** — the whole tenant (Commerce). A department/admin viewer or reviewer with no `businessUnit` sees every submission (the roll-up).
- **Bureau** — `submissions.business_unit` / `users.business_unit`, driven by `getTenant().unit.options` (e.g. `census`, `noaa`). This tier existed before the office work; roll-up is `components/admin/bureau-rollup.tsx`.
- **Office** — `submissions.office` / `users.office` (added in `db/migrations/doc/0001_office_hierarchy.sql`), an optional sub-level under a bureau. Only bureaus that declare `offices` on their `UnitOption` in `lib/tenant/doc.ts` (currently Census, ITA, NOAA) show an office dropdown in the wizard (`components/steps/step-1-submitter-info.tsx`) or an office drill-down under their roll-up row (`components/admin/office-rollup.tsx`, aggregation in `lib/officeRollup.ts`). Bureaus without offices behave exactly as before — `offices` is optional so USPTO and DoW are unaffected.
- **Admin assignment** — an admin sets a reviewer's bureau and office from `components/admin/user-management.tsx`. The bureau dropdown reads options from `getTenant().unit.options` (tenant-aware, no hardcoded USPTO list); a dependent office dropdown appears only when the selected bureau declares `offices`, and resets whenever the bureau changes. Both fields persist via the existing `PATCH /api/users/:id` (no schema/API changes — office was already plumbed end-to-end). **A reviewer must log out and back in for a new bureau/office assignment to take effect** — `office`/`business_unit` are read onto the session at login (`lib/auth.ts`), not re-read live, so `visibleSubmissions` roll-down scoping reflects the change only after re-authentication.

Roll-down visibility (`visibleSubmissions` in `lib/reviewWorkflow.ts`) mirrors this: a submitter sees only their own submissions; a reviewer with a `businessUnit` (and optionally an `office`) sees that bureau, narrowed to that office if set; a reviewer/admin with neither sees everything.

**RLS posture:** `0001_office_hierarchy.sql` enables row level security on `submissions` with a policy for the `authenticated` Postgres role that mirrors `visibleSubmissions` (admin claim sees all; bureau claim scopes to `business_unit`; office claim further scopes to `office`), keyed on `auth.jwt() -> 'app_metadata'`. The app currently talks to Supabase only via the service_role client (`getSupabaseAdmin()`), which has `BYPASSRLS`, so these policies do not change any current app behavior — they exist so DB-level scoping is already in place. **Follow-up (not done in this PR):** the app's own auth (`lib/auth.ts`) is a custom users table, not Supabase Auth, so no request today authenticates to Supabase as `authenticated` with `role`/`business_unit`/`office` claims populated — that requires either migrating to Supabase Auth or minting a JWT with those claims per request.

#### Per-bureau strategic priorities (DoC)

A `UnitOption` (`lib/tenant/types.ts`) can optionally declare its own `focusAreas?: FocusArea[]` — a bureau's own strategic priorities, in the same `{ id, label, category, description? }` shape as the tenant-level `TenantConfig.focusAreas`. `lib/tenant/doc.ts` populates this for every DoC bureau (source data + citations in `docs/research/doc-bureau-strategic-priorities.md`); the tenant-level `doc.focusAreas` (the OMB/federal-AI-framework list) remains the department-level fallback. USPTO and DoW `UnitOption`s never declare `focusAreas`, so they are unaffected — additive and optional, same pattern as `offices`.

`lib/strategicFocusAreas.ts` exports `getFocusAreasForUnit(businessUnit?: string | null): FocusArea[]`, the single place that resolves "which priority list applies here": it looks up `businessUnit` in `getTenant().unit.options` and returns that bureau's `focusAreas` when declared and non-empty, otherwise `tenant.focusAreas`. Two call sites use it to score/display against the *submission's own bureau* rather than the department-wide list:

- **Strategic Alignment Scout** (`suggestStrategicAlignment` in `app/actions.ts`, UI in `components/steps/step-7-alignment.tsx`) — scopes both the AI prompt's candidate focus-area list and the hallucination-guard validation (`validIds`) to `getFocusAreasForUnit(formData.submitterOffice)`, so a submitter under a bureau is scored against that bureau's mission, not Commerce's.
- **Admin OKR cards** (`app/admin/page.tsx`, the `{tenant.okrsLabel}` tab) — a bureau selector (rendered only when at least one bureau declares `focusAreas`, i.e. DoC) lets a viewer scope the OKR card list to a single bureau; the default/unscoped selection shows the department-level list, matching prior behavior for USPTO/DoW where no selector renders at all.

#### Wizard step copy (tenant-aware)

The admin dashboard fix above (`okrsLabel`) covered the admin surface only; the submission wizard itself had its own hardcoded DoW/DoD copy (org name, strategic-priorities framing, and Feasibility & Security's DoD-specific citations) that leaked onto every tenant, including DoC. That copy now comes from `TenantConfig` (`lib/tenant/types.ts`) instead:

- `orgName` — the org's full name/acronym used in wizard prose (e.g. `Align with ${orgName} Goals`). Bare, no leading article; callers add "the" inline where the sentence needs one.
- `dataMaturityFraming` / `modelSourcingGuidance` — the Feasibility & Security step's "Data readiness & maturity" subtitle and model-sourcing paragraph, since each tenant has its own real framework here (DoD AI Hierarchy of Needs vs. OMB's use-case-inventory framing) rather than one bleeding into another's.
- `trlSystemName` / `srgCaveat` / `humanReviewCitation` — optional, DoW-only citations (its "Tradewinds" system, the DoD SRG caveat, DoDD 3000.09) that simply don't render when a tenant doesn't set them, instead of a component-level `if (tenant.id === "dow")` branch.
- `lib/steps.ts` exports `getFormSteps()` (not a static array) so the two steps whose title/prompt name the organization — Value and Strategic Alignment — resolve `orgName` per tenant at call time; every consumer (`step-wrapper.tsx`, the Step 10 recap cards, `wizard-nav.tsx`, `progress-bar.tsx`, the Scout server actions in `app/actions.ts`) calls the function rather than importing a shared constant.
- `SUBMITTER_ROLE_LABELS` (also `lib/steps.ts`) is the single source of truth for the `submitterRole` enum's display labels, reused by the "Submitting as…" pill (`form-container.tsx`), the Step 10 recap, and the PDF export (`lib/pdfGenerator.ts`) — previously the pill kept its own stale copy of this map and could show a USPTO-flavored role name regardless of the role actually selected.

#### Product & assistant naming (tenant-aware)

`TenantConfig` (`lib/tenant/types.ts`) carries both the product wordmark (`productName`) and the in-app AI assistant's name (`assistantName`). DoC (`lib/tenant/doc.ts`) sets `productName: "Warder"` and `assistantName: "Kestrel"`; USPTO and DoW keep `productName: "LaunchPad"` and `assistantName: "Scout"` unchanged. Every component that shows the wordmark or the assistant's name reads it from `getTenant()` — `components/branding/launchpad-logo.tsx` (header/login/signup/form wordmark), `components/launchpad/chat-panel.tsx` (the coaching panel's title, tooltip, and error/empty-state copy), the wizard steps that reference the assistant (`step-2-use-case-overview.tsx`, `step-3-problem-and-users.tsx`, `step-4-proposed-solution.tsx`, `step-7-alignment.tsx`), `components/submissions/submission-detail.tsx` ("`{assistantName}`'s read" / "Draft with `{assistantName}`"), the admin Settings tab, `app/layout.tsx`'s page title, and `lib/pdfGenerator.ts`'s PDF header/footer. `app/actions.ts`'s AI system prompts and fallback copy also use `getTenant().assistantName` so the assistant introduces itself consistently with the branding shown in the UI. No logo/icon changed — the rocket mark and layout are shared across tenants; only the wordmark and assistant-name text differ.

#### OMB federal AI use case inventory: fields, export, and reportability

The wizard captures OMB M-25-21 companion-guidance fields on Step 7 (Feasibility & Security) — `stageOfDevelopment`, `highImpactFactors`, `highImpact`, `hasATO`, `systemSource`, `nationalSecuritySystem`, `researchOnly` (`lib/steps.ts`), each registered in `lib/fieldRegistry.ts` with `omb: true` (renders an `OmbBadge`, `components/launchpad/omb-badge.tsx`, next to the field). All are optional, so USPTO/DoW tenants that don't fill them in are unaffected.

Four pieces of pure, unit-tested logic build on those fields:

- **Export** — `lib/ombExport.ts` maps a submission to one CSV row in the OMB inventory's column order (`app/api/export/omb/route.ts` streams it), including "Reporting Mode" and "Consolidated Category" columns sourced from `determineConsolidation()` (see below). `buildOmbCsv()` emits one row per **individually**-reported submission (every high-impact use case is always in this group), then — instead of one row per bureau — a single department-level row per **consolidated** category (`consolidated:<categoryId>`, e.g. `"Email prioritization & categorization (consolidated)"`), listing which bureaus and how many submissions it stands in for. Rows are ordered by `CONSOLIDATION_CATEGORIES` (not submission order), so the export is deterministic regardless of input sort order.
- **Consolidated vs. individually-reported classification** — `lib/ombConsolidation.ts` (`determineConsolidation`) is the cross-bureau rationalization piece: it classifies a use case as **Consolidated** (matches one of OMB's ~19 "widely used commercial AI" categories from the 2025 reporting guidance/cheat sheet — e.g. email triage, meeting transcription, code generation, enterprise search — which a department reports **once** across every bureau) or **Individual**. Matching is deterministic regex over the submission's free text (`useCaseTitle`, `useCaseDescription`, `coreProblem`, `problemDefinition`, `proposedSolution`, `solutionSummary`, `businessValue`) against `CONSOLIDATION_CATEGORIES`, so a match is always explainable by the pattern that fired — no ML. This is category matching, a different question from `lib/similarity.ts`'s text-overlap dedup (which flags two submissions that look like the *same idea*, regardless of category). **High-impact use cases are always `Individual`, never `Consolidated`** (coordinates with the high-impact determination below); the category match is still surfaced in that case (`category`/`categoryLabel`) so a reviewer can see *why* an otherwise-consolidatable use case is being reported on its own. The result is shown on the submission detail view (an "OMB reporting mode" card next to "OMB reportability") and as a "Consolidated (OMB)" count column plus a department-wide "consolidates to M OMB reportable entries" summary in the bureau roll-up (`components/admin/bureau-rollup.tsx`). The DoC seed (below) includes a cross-bureau consolidated trio so this summary line visibly collapses (12 use cases → 10 OMB reportable entries) instead of reading 1:1 with the submission count — see [issue #33](https://github.com/mattshanklePA/launchpad-v0/issues/33).
- **Reportability determination** — `lib/ombReportability.ts` (`determineReportability`) decides *whether* a use case must be reported at all, per the OMB "Guidance on 2025 Agency AI Reporting" (June 27, 2025) and the OMB AI Inventory Reporting Cheat Sheet: include at any stage of development if it supports mission/service delivery, enhances internal decisions, or benefits the public; exclude National Security System/Intelligence Community use or research-only use; a research-only use that controls or significantly influences a decision about individuals is reportable despite being research. When a required input (stage, NSS, or research-only) hasn't been answered yet, the result is `"review"`, erring on the side of inclusion. The result (`status` + one-line `reason`) is surfaced on the submission detail view (`components/submissions/submission-detail.tsx`) and as an "OMB review needed" count column in the bureau roll-up (`components/admin/bureau-rollup.tsx`).
- **High-impact determination** — `lib/highImpactDetermination.ts` (`determineHighImpact`) *recommends* whether a use case meets OMB's high-impact AI definition (M-25-21 Section 5) instead of trusting a bare self-reported flag. Two layers feed the recommendation: (1) the manual path — the submitter marks which of the five Section 5 categories the AI output could meaningfully affect — rights, safety, access to benefits, resource allocation, or enforcement actions (`highImpactFactors`); (2) an inference layer on top, added for [issue #27](https://github.com/mattshanklePA/launchpad-v0/issues/27) so the recommendation isn't blind to risk signals LaunchPad already captures elsewhere — decisional AI (`aiDecisionalImpact === "yes"`, the same field `lib/riskProfile.ts` reads) infers **rights**; a high-`severity` problem whose problem/solution text names a life-safety scenario infers **safety**; decisional AI whose problem/solution text names benefits/eligibility, resource-allocation, or enforcement/adjudication language infers **access to benefits**, **resource allocation**, or **enforcement actions** respectively. Free text is always a secondary signal that narrows or corroborates a structured field (`aiDecisionalImpact`/`severity`) — it never triggers a category by itself. The function recommends `"yes"` (with one reason per flagged-or-inferred factor) if any category applies from either layer, else `"no"`. The submission detail view shows this recommendation alongside the reasons and lets the reviewer set the final `highImpact` call (`patchSubmissionFormData`) — advisory, the same pattern as Scout's read on a submission; the rule-based check, not Scout, is the source of truth. Setting `highImpact` to `"yes"` reveals a compact set of M-25-21 minimum-practice risk-management fields in the wizard (`aiImpactAssessment`, `preDeploymentTesting`, `ongoingMonitoringPlan`, `humanOversightAppeal`, each with an optional note) — hidden when `highImpact` is `"no"` or unset. This is a trimmed, demo-usable subset; the full M-25-21 practice list can be expanded here later.

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
