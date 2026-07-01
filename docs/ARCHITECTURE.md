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

**Multi-tenant:** a `getTenant()` resolver keyed off `NEXT_PUBLIC_TENANT` selects branding/config per deployment. Each tenant = separate Vercel project + Supabase instance + git branch (e.g., `USPTO-launchpad`, `dow`).

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

Seed demo data via the `app/api/seed` route (see `lib/seedSubmissions.ts`).

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
