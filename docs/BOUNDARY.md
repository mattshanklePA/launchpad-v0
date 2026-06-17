# LaunchPad — Core / Adapter Boundary (Design)

**Status:** design · Sprint 1 · **Last updated:** 2026-06-11
**Roadmap:** subtask "Integration layer: ports-and-adapters boundary for the core" (868jzzyw5) on task 868f2t9vk.

## Why this exists

Two goals at once:

- **Architecture.** Keep agency-specific concerns out of the product core so onboarding a new agency is a config + adapter change, not a fork.
- **IP protection.** The proprietary core stays Packaged Agile's. Government-funded integration work happens only in the adapter layer, so it never co-mingles with or contaminates the core (the CC0 / open-source risk raised by Scott). See `LICENSE`.

## The line

**Core** (proprietary, PA-owned, never edited for one agency):

- Wizard / form engine and step flow (`app/submit`, `context/form-context.tsx`)
- Field + step definition logic (`lib/formConfig`, `lib/fieldRegistry`, `lib/steps`)
- AI vetting prompts + zod schemas (`app/actions.ts`, `app/admin/compare-actions.ts`)
- Readiness + risk scoring (`lib/submissionReadiness.ts`, `lib/riskProfile.ts`)
- Review-workflow pure helpers (`lib/reviewWorkflow.ts`)
- Pipeline + Decision Center logic and UI (`app/admin`, `app/decisions`, `components/admin`)

**Adapters** (swappable; an agency or government-funded effort may implement these):

- Identity / auth
- AI model endpoint
- Submission storage
- Notifications
- System-of-record / inventory connectors
- Tenant configuration

## The ports (interfaces)

Grounded in today's code. Each port lists its interface and the current default implementation.

### 1. ModelProvider — default: Anthropic
Today `anthropic("claude-sonnet-4-5-20250929")` is hardcoded at 6 call sites (`app/actions.ts` x5, `app/admin/compare-actions.ts` x1).

```ts
// lib/ports/model.ts
import type { LanguageModel } from "ai"
export interface ModelProvider {
  model: LanguageModel   // used by generateObject
  id: string             // identifier for logging / inventory
}
```
Migration: replace each `model: anthropic("...")` with `model: getModelProvider().model`. Model id + key come from config/env.

### 2. SubmissionStore — default: Supabase
From `lib/submissions.ts`.

```ts
// lib/ports/store.ts
export interface SubmissionStore {
  getSubmissions(): Submission[]                                   // sync cache read
  saveSubmission(formData: FormData): Promise<Submission>
  clearSubmissions(): Promise<void>
  patchSubmissionFormData(id: string, patch: Record<string, unknown>): Promise<boolean>
  setSubmissionStatus(id: string, status: SubmissionStatus): Promise<boolean>
  addSubmissionComment(id: string, comment: SubmissionComment, status?: SubmissionStatus): Promise<boolean>
}
```
**Done (delegation).** `lib/submissions.ts` keeps its public API and delegates to `getStore()` (`lib/submissionStore.ts`); default adapter `lib/adapters/default/supabaseStore.ts`. All call sites unchanged.

### 3. IdentityProvider — default: local/demo auth
From `lib/auth.ts`.

```ts
// lib/ports/identity.ts
export interface IdentityProvider {
  login(email: string, password: string): Promise<Session | null>
  getSession(): Session | null
  logout(): void
  getUserByEmail(email: string): Promise<User | null>
  listUsers(): Promise<User[]>
  addUser(input: NewUser): Promise<User>
  removeUser(id: string): Promise<{ ok: boolean; error?: string }>
  updateUserRole(id: string, role: Role): Promise<{ ok: boolean; error?: string }>
  // role mapping is the SSO/PIV seam: map IdP claims -> Role
}
```
The SSO/PIV adapter (subtask 868jzzywg) implements this with OIDC/SAML.

### 4. Notifier — default: Slack
From `lib/slackWebhook.ts`.

```ts
// lib/ports/notify.ts
export interface Notifier {
  send(message: string): Promise<void>
}
```
Teams / email adapters implement the same interface (subtask 868jzzyx8).

### 5. SystemConnector — default: Rally (example)
From `lib/rallyClient.ts`.

```ts
// lib/ports/connector.ts
export interface SystemConnector {
  pushSubmission(s: Submission): Promise<void>
  // optional: pull(), syncInventory()
}
```
Outbound sync to the agency system of record / AI use-case inventory (subtask 868jzzyx3).

### 6. TenantConfig — default: uspto
Consolidates branding, fields, focus areas, scoring weights, model id, and connector settings.

```ts
// lib/ports/config.ts
export interface TenantConfig {
  branding: Branding
  fields: FieldConfig
  focusAreas: FocusArea[]
  scoring: ScoringWeights
  model: { id: string }
  connectors: ConnectorSettings
}
```
Today partial across `formConfig` / `fieldRegistry` / `strategicFocusAreas` + `getTenant()` on multi-tenant builds (subtask 868jzzyxf).

## Target directory layout (introduce incrementally)

```
lib/
  ports/      interfaces (the contracts)   <- start here, additive
  adapters/
    default/  PA defaults: anthropic, supabase, local-auth, slack, rally
    <agency>/ agency-specific adapters (may be government-owned / CC0)
  config/     tenant config
```
Nothing moves on day one. Step one is to add `lib/ports/` plus a default adapter folder that wraps existing code, with zero behavior change.

## Who touches what

- Packaged Agile owns `lib/ports/` and everything in core. Only PA edits these.
- An agency or government-funded effort implements adapters behind the interfaces, plus config. They do not modify the core or the interfaces.
- Rule of thumb: if a change needs the core edited to fit one agency, the design is wrong. Push it behind config or a new adapter.

## Migration order (lowest risk, highest leverage first)

1. **ModelProvider** — mechanical, 6 call sites, no data risk (subtask 868jzzywq).
2. **Notifier + SystemConnector** — already isolated, easy (868jzzyx8, 868jzzyx3).
3. **SubmissionStore** — touches data access, do with care (868jzzyww).
4. **IdentityProvider** — security-sensitive; do alongside the SSO work (868jzzywg).
5. **TenantConfig** — consolidate last, once the seams exist (868jzzyxf).

## Source header convention

Core files carry:

```
/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */
```
Adapter-layer files written under a government contract may be agency-owned; mark those per the contract's data-rights terms rather than the proprietary header. Applied as files are touched, not in a bulk sweep.
