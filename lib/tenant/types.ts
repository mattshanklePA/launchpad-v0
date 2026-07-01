// Tenant configuration. One LaunchPad codebase serves multiple organizations
// (USPTO, Department of War, ...). Everything org-specific lives here and is
// read via getTenant(); nothing org-specific should be hardcoded in components.

export type FocusArea = { id: string; label: string; category: string }
export type Objective = { title: string; description: string }
export type ObjectiveGroup = { title: string; subtitle: string; items: Objective[] }
export type OfficeOption = { value: string; label: string }
// `offices` is the optional third tier (Department -> Bureau -> Office). Only
// populated for tenants/bureaus that have one (DoC); absent elsewhere so
// USPTO/DoW render exactly as before.
export type UnitOption = { value: string; label: string; offices?: OfficeOption[] }

export type TenantConfig = {
  id: string
  shortName: string          // "USPTO" | "DoW"
  productName: string        // wordmark, e.g. "LaunchPad"
  logoSubtitle: string       // under the wordmark
  heroHeadline: string
  heroSubtitle: string
  // Optional hero background image (a path under public/, e.g. "/hero-dow.jpg").
  // If unset, the hero uses the tenant's theme color as a clean solid background
  // so a tenant never inherits another org's imagery.
  heroImage?: string

  // AI / prompts
  strategicContext: string   // injected into every Scout prompt
  leadershipPriorities: string // exec-briefing framing (e.g. pendency/quality/cost)

  // Strategic alignment options
  focusAreas: FocusArea[]

  // Public landing objective columns
  landingObjectives: ObjectiveGroup[]

  // Org taxonomy (USPTO "business unit" -> DoW "command")
  unit: { label: string; options: UnitOption[] }

  // Governance framing shown around the AI-risk questions
  riskFramework: { label: string; description: string }

  // Theme accents (wired into UI in a later step)
  theme: { primary: string; primaryForeground: string }

  // Per-tenant feature toggles
  features: Record<string, boolean>
}
