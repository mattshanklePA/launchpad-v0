// Tenant configuration. One LaunchPad codebase serves multiple organizations
// (USPTO, Department of War, ...). Everything org-specific lives here and is
// read via getTenant(); nothing org-specific should be hardcoded in components.

export type FocusArea = { id: string; label: string; category: string; description?: string }
export type Objective = { title: string; description: string }
export type ObjectiveGroup = { title: string; subtitle: string; items: Objective[] }
export type OfficeOption = { value: string; label: string }
// Generic value/label pair for the submit wizard's tenant-driven dropdowns
// (submitterRoles, affectedSystems, targetAudiences, dataClassifications
// below) — same shape as OfficeOption, named separately since these options
// aren't offices.
export type SelectOption = { value: string; label: string }
// `offices` is the optional third tier (Department -> Bureau -> Office). Only
// populated for tenants/bureaus that have one (DoC); absent elsewhere so
// USPTO/DoW render exactly as before.
// `focusAreas` is the bureau's own strategic priorities (DoC only). When
// present, bureau-scoped views and the Strategic Alignment Scout use these
// instead of the tenant-level `TenantConfig.focusAreas`; absent elsewhere so
// USPTO/DoW are unaffected.
export type UnitOption = { value: string; label: string; offices?: OfficeOption[]; focusAreas?: FocusArea[] }

// One illustrative row in the public landing page's Command Center preview.
// `status` is a display state, not a `reviewStatus` — see PREVIEW_STATUS in
// components/landing/public-landing.tsx for the label/tone it renders as.
export type HeroPreviewItem = { label: string; status: "needs_work" | "ready" | "early" }

export type TenantConfig = {
  id: string
  shortName: string          // "USPTO" | "DoW"
  // Full organization name used in wizard prose (e.g. "Align with {orgName}
  // Goals"). Bare — no leading article. Callers add "the" inline where the
  // sentence needs one (e.g. "the business case for the {orgName}").
  orgName: string
  productName: string        // wordmark, e.g. "LaunchPad"
  assistantName: string      // in-app AI assistant's name, e.g. "Scout"
  logoSubtitle: string       // under the wordmark
  // Mono micro-label under the product name in the Keystone shell sidebar
  // (RD-0, issue #201) — e.g. "AI use case governance". Optional: a tenant
  // that omits it keeps the pre-redesign LaunchPadLogo header instead.
  sidebarTagline?: string
  heroHeadline: string
  heroSubtitle: string
  // Optional hero background image (a path under public/, e.g. "/hero-dow.jpg").
  // If unset, the hero uses the tenant's theme color as a clean solid background
  // so a tenant never inherits another org's imagery.
  heroImage?: string

  // Example address shown as the login email input's placeholder (e.g.
  // "you@uspto.gov"), so no tenant ever shows another tenant's domain.
  loginEmailPlaceholder: string

  // Public-inquiry address substituted for individual submitters' emails in
  // the public OMB AI use case inventory CSV (docs/omb-2025-inventory-fields.md's
  // contact_email redaction rule; see lib/ombExport.ts). Never a real person's
  // address — a monitored inbox for public inquiries about the inventory.
  publicInquiryEmail: string

  // AI / prompts
  strategicContext: string   // injected into every Scout prompt
  leadershipPriorities: string // exec-briefing framing (e.g. pendency/quality/cost)

  // Strategic alignment options
  focusAreas: FocusArea[]

  // Public landing objective columns
  landingObjectives: ObjectiveGroup[]

  // What this tenant calls its AI use case inventory. Some organizations report
  // to a published federal inventory; others maintain an internal one to the
  // same schema. The field set is identical either way — only the name differs.
  // (The OMB export's own column names are OMB's published schema and never
  // follow this — see lib/ombExport.ts.)
  inventoryLabel: string

  // Short form of `inventoryLabel`, used adjectivally where the long form
  // doesn't fit inline — "OMB reportable", "Required (OMB)", "Consolidated
  // (OMB)". Kept separate rather than derived, since the useful abbreviation
  // isn't recoverable from the long form.
  inventoryShortLabel: string

  // Heading for the reviewer governance panel's second section — the
  // high-impact minimum practices. Named for the authority that mandates them,
  // which is an OMB memo number for tenants that report to OMB's inventory and
  // a plain description for those that don't.
  minimumPracticesLabel: string

  // Filename the inventory CSV downloads as (app/api/export/omb/route.ts).
  // Explicit per tenant rather than hardcoded in the route, so an org that
  // maintains an internal inventory does not hand its people a file named for
  // another department's reporting mandate.
  inventoryFileName: string

  // Header labels for the export's two LaunchPad-added context columns.
  // Optional: omit and the export emits OMB's published names ("Agency",
  // "Bureau/Component"), which every tenant filing into OMB's public inventory
  // must keep. Deliberately NOT routed through `tierLabels` — #3 is OMB's
  // `agency_bureau` field and its name is OMB's, not the tenant's.
  inventoryColumnLabels?: { agency: string; agencyBureau: string }

  // The authority the consolidated department-level export row cites, and the
  // opt-in signal that this tenant's inventory prose is its own. Omit and that
  // row keeps OMB's wording word-for-word (bureau / bureaus / department, and
  // OMB's widely-used commercial AI category guidance). Set it and the row's
  // unit and department nouns resolve from `tierLabels` instead. See
  // lib/ombExport.ts's ombExportContext().
  inventoryAuthority?: string

  // Three illustrative rows in the landing page's Command Center preview.
  // Optional: when unset, the existing default list renders unchanged.
  heroPreviewItems?: HeroPreviewItem[]

  // Which KPI cards the dashboard strip renders, by `KpiCardData.id`. When set,
  // `buildKpiCards` returns only the cards whose id is in this list, in the
  // list's order; when unset, every card the tenant qualifies for renders, as
  // today. A card left out is not computed differently and is not removed from
  // the Action Center or the roll-up — it is only not drawn in the strip.
  dashboardKpiCardIds?: string[]

  // Org taxonomy (USPTO "business unit" -> DoW "command")
  unit: { label: string; options: UnitOption[] }

  // On-screen names for the org hierarchy tiers. The tiers themselves are
  // structural (see tenantHasBureauTier, submissions.business_unit,
  // submissions.office); these are only what a user reads. Every tenant
  // supplies its own, so no org's vocabulary leaks into another's UI.
  tierLabels: {
    department: string    // top tier, e.g. "Department"
    unit: string          // middle tier, singular, e.g. "Bureau"
    unitPlural: string    // e.g. "Bureaus"
    subUnit: string       // optional third tier, singular, e.g. "Office"
    subUnitPlural: string // e.g. "Offices"
  }

  // Submit-wizard dropdown options (issue #147). Each tenant supplies its own
  // value/label list rather than the wizard hardcoding USPTO's patent/
  // trademark taxonomy or DoW's DoD Impact Levels for every deployment — the
  // same "options live in TenantConfig, components just map over them"
  // pattern `unit.options` already established. Values are free strings
  // (not a shared union) so a tenant's list can differ from another's
  // entirely, same as `unit.options` today; existing stored submissions
  // whose value isn't in the active tenant's list still render (the raw
  // value is shown as a fallback — see step-10-review-submit.tsx's `prettify`).
  submitterRoles: SelectOption[]      // Step 1 "Role"
  affectedSystems: SelectOption[]     // Step 3 "Which process, system, or group does this affect?"
  targetAudiences: SelectOption[]     // Step 3 "Primary audience"
  dataClassifications: SelectOption[] // Step 8 "Data classification / required Impact Level"

  // Label for the admin dashboard's "OKRs / strategic priorities" tab, heading,
  // and subtitle copy (e.g. "Department of War OKRs", "OMB / Strategic Priorities").
  // Self-contained — already includes any org qualifier the tenant needs.
  okrsLabel: string

  // Governance framing shown around the AI-risk questions
  riskFramework: { label: string; description: string }

  // Feasibility & Security step copy — kept as discrete fields (rather than
  // baked into the component) so each tenant's real framework shows instead
  // of one tenant's leaking into another's.
  // Subtitle under "Data readiness & maturity".
  dataMaturityFraming: string
  // Paragraph under "Underlying AI model sourcing" explaining sourcing preference.
  modelSourcingGuidance: string
  // Name of the tenant's downstream program-tracking system that requires a
  // TRL value, if any (e.g. DoW's "Tradewinds"). Omit when no such system exists.
  trlSystemName?: string
  // Extra accreditation caveat appended after the Impact Level explanation
  // (e.g. DoW's FedRAMP-vs-SRG note). Omit when not applicable.
  srgCaveat?: string
  // Citation shown alongside the human-review question (e.g. DoW's "DoDD
  // 3000.09"). Omit when the tenant has no such citation.
  humanReviewCitation?: string

  // Theme accents (wired into UI in a later step)
  theme: { primary: string; primaryForeground: string }

  // Per-tenant feature toggles
  features: Record<string, boolean>
}
