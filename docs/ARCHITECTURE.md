# LaunchPad — Architecture & Environment Guide

**Audience:** an engineer or collaborator joining the project.
**Goal:** understand the lay of the land fast — what the system is, how it is built, where things live, how to run it, and where customization is meant to happen.

**Last updated:** 2026-06-29 · **Branch:** `USPTO-launchpad`

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
- Migrations in `db/migrations/`: review workflow, demo status fixes, demo examples, users & assignees.

---

## 6. AI integration

- The AI assistant uses the Vercel AI SDK with the Anthropic provider. Calls use `generateObject` with zod schemas, so responses are schema-validated and consistent.
- Two main AI surfaces: the per-step submission assistant (vetting and pushback during the wizard) and the Decision Center comparative briefing (`app/admin/compare-actions.ts`).
- Prompts live alongside the server actions that call them. The model is resolved through a `ModelProvider` port: call sites use `getModel()` from `lib/modelProvider.ts` rather than referencing a provider directly. The default adapter (`lib/adapters/default/anthropicProvider.ts`) uses Anthropic, and the model id is overridable via `LAUNCHPAD_MODEL_ID`. To use an agency's approved endpoint, swap the provider in `lib/modelProvider.ts`.
- Requires `ANTHROPIC_API_KEY` in the environment (read by the AI SDK provider).
- Long AI calls (the comparison briefing) can exceed the default serverless timeout. Raise `maxDuration` on the relevant route segment or a server-component `layout.tsx` (Hobby plan max is 60s).

---

## 7. The submission wizard

- Multi-step guided flow under `app/submit`, orchestrated by a form container (`components/form-container.tsx`) that switches on the current step. Rough step map: 1 submitter info, 2 problem, 3 solution, 4 value, 5 alignment, 6 feasibility, 7 success metrics, 8 idea overview, 9 review/submit, 10 confirmation.
- The container renders one step at a time inside an `AnimatePresence` keyed on `currentStep`. **Each step mounts fresh and unmounts on navigation**, so a step component's local React state resets every time you leave and return. Anything that must survive navigation belongs in the form context (below) or must be derived from form data on each render.
- Wizard state lives in `context/form-context.tsx` and is persisted to the browser:
  - localStorage: `aid-form-data`, `aid-current-step`, `aid-editing-id`
  - sessionStorage: `aid-session-active`
- Resume logic restores in-progress drafts; resume is clamped to editable steps.

### Strategic Alignment step (Scout auto-suggest)

The alignment step (`components/steps/step-7-alignment.tsx`, rendered as wizard step 5) uses Scout to pre-fill strategic alignment from the submitter's earlier answers:

- On mount, if there is upstream context and the alignment fields are still empty, it calls the `suggestStrategicAlignment` server action (`app/actions.ts`) and writes the result (focus areas, OKR text, alignment summary) into the form, then shows a review banner.
- **Trigger gate:** both the component (`hasUpstreamContext`) and the server action (`haveBody`) fire on **problem _or_ solution** being present. The idea title is **not** required. (Earlier USPTO builds also required `useCaseTitle`, which silently suppressed the suggestion when the title was blank — the DoW branch fixed this and the same fix now lives here.)
- **Persistent entry point:** because step components remount on navigation, the Scout prompt is derived from form data plus upstream context rather than transient state. It always reappears when you return to the step — a "Fill with Scout" prompt when the fields are empty, or a "Re-suggest with Scout" prompt (force-regenerates) when they already hold content. It is hidden only while the freshly-filled review banner is on screen, to avoid stacking two prompts.
- The canonical focus-area list lives in `lib/strategicFocusAreas.ts` so it can be imported by both the server action and the client component (a `"use server"` file cannot export non-async values).

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
- Wizard steps remount on navigation (`AnimatePresence` keyed on `currentStep`); don't rely on a step's local state surviving a step change — derive UI from form context/data instead. See §7 (Strategic Alignment) for a worked example.

---

## Changelog (USPTO branch)

- **2026-06-29 — Strategic Alignment auto-suggest fix.** Removed the `useCaseTitle` requirement from the Scout trigger in both `step-7-alignment.tsx` (`hasUpstreamContext`) and `app/actions.ts` (`haveBody`), so the suggestion fires on problem-or-solution like the DoW branch. Made the Scout prompt a persistent, form-data-derived entry point so it reappears after navigating away and back (cold-start "Fill with Scout" / "Re-suggest with Scout"). See §7.
- **2026-06-29 — Decision Center briefing reliability.** The executive comparative briefing (`app/admin/compare-actions.ts`) was failing with `NoObjectGenerated: response did not match schema` and falling into a useless fallback (all "Hold" / "AI synthesis unavailable" / no recommendation). Root cause: the strict `verdict` Zod enum rejected loosely-phrased model output. Fix: (1) loosened `verdict` to `z.string()` and added `normalizeVerdict()` to coerce it back to the enum; (2) normalize the whole AI result — align one entry per submission by id, fall back per-field, and drop a `fundId` that doesn't match a real candidate; (3) replaced the error fallback with `heuristicBriefing()`, which synthesizes a populated, sensible briefing from each submission's own `readinessScore` (→ verdict) and `executiveSummary`/`readinessSummary`, so the Decision Center always shows a recommendation even if the AI call fails. Submitted records always have `readinessScore` + `executiveSummary` (submit is gated on the readiness assessment), so the heuristic always has data.
- **2026-06-29 — Submitted idea no longer lingers as a draft.** `handleSubmitForVetting` (`components/steps/step-10-review-submit.tsx`) now clears `aid-form-data` / `aid-editing-id` from localStorage on a successful submit. Previously the in-progress draft was only cleared by the confirmation page's own buttons (`resetForm`), so navigating away via the top nav left the just-submitted idea showing in BOTH the Submitted and Drafts sections of `submitter-home.tsx` (whose `detectDraft()` reads `aid-form-data` and, unlike the landing page's `RecentDrafts`, has no `step===10` guard). The confirmation page reads `formData` from context memory, so clearing storage is safe; `aid-current-step` is left to become `"10"`, the marker `FormProvider` uses to start fresh.
- **2026-06-29 — Feasibility step: hide Scout when its fields are off.** On the Feasibility & Security step (`components/steps/step-8-feasibility-security.tsx`), the Scout panel coaches the free-text `dependencies` draft into `feasibilitySummary`. When a lean Form Config disables `dependencies`, Scout's input field disappears and the panel was left permanently grayed out ("Add a rough draft in the field above to enable Scout") with an empty summary box. Now the Scout column renders only when `isVisible("dependencies") && isVisible("feasibilitySummary")`; otherwise the form uses full width. No submit/readiness impact: `feasibilitySummary` is never a required field, and `dependencies` is required only when enabled (`getSubmissionReadiness` / `need()` is config-aware via `isFieldEnabled`). To hide the summary box, disable `feasibilitySummary` in Form Config.
- **2026-06-29 — Commerce / Doug Freeman demo assets.** Added two customer-experience seed submissions to `lib/seedSubmissions.ts` — *Plain-Language Customer Assistant for Public Services* (public-facing centerpiece) and *Contact-Center Response Assistant (Agent Copilot)* (lower-risk Decision Center comparison) — bumped `CURRENT_SEED_VERSION` to `v2-2026-06-29`, and added a staged in-progress draft (*Proactive Plain-Language Status Updates*) written to localStorage (`aid-form-data`/`aid-current-step`) via a new `installDemoDraft()` helper called from both seed functions. Tailored runbook: `demo/LaunchPad_demo_runbook_Commerce.md` (original USPTO runbook left intact). Note: the Decision Center "actionable insights" view (recommendation banner + per-candidate verdict cards + collapsed detail table) is present and intact on this branch (commit `aa2eaef`); the wall-of-text version only survives on `dow`.
