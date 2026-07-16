// Tenant configuration. One LaunchPad codebase serves multiple organizations
// (USPTO, Department of War, ...). Everything org-specific lives here and is
// read via getTenant(); nothing org-specific should be hardcoded in components.

export type FocusArea = { id: string; label: string; category: string; description?: string }
export type Objective = { title: string; description: string }
export type ObjectiveGroup = { title: string; subtitle: string; items: Objective[] }
export type OfficeOption = { value: string; label: string }
// `offices` is the optional third tier (Department -> Bureau -> Office). Only
// populated for tenants/bureaus that have one (DoC); absent elsewhere so
// USPTO/DoW render exactly as before.
// `focusAreas` is the bureau's own strategic priorities (DoC only). When
// present, bureau-scoped views and the Strategic Alignment Scout use these
// instead of the tenant-level `TenantConfig.focusAreas`; absent elsewhere so
// USPTO/DoW are unaffected.
export type UnitOption = { value: string; label: string; offices?: OfficeOption[]; focusAreas?: FocusArea[] }

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

  // Org taxonomy (USPTO "business unit" -> DoW "command")
  unit: { label: string; options: UnitOption[] }

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
