import { getTenant } from "./index"
import type { TenantConfig, TenantCopy } from "./types"

// Default wording for every key a tenant may override (see TenantCopy). These
// are the strings the product shipped with, byte for byte, so a tenant that
// sets no `copy` renders exactly what it did before F3-2 (#269).
export const DEFAULT_COPY: TenantCopy = {
  heroCta: "See it in 2 minutes",
  intakeStepDescription: "{assistant} walks a submitter through a short intake in about two minutes, asking the follow-up questions a reviewer would.",
  featuresSubtitle: "Purpose-built for the AI use case pipeline federal governance actually requires.",
  featureInventoryDescription:
    "Every field the {inventory} requires has a home in the data model, so the record is filled in as a use case is vetted rather than backfilled at year end.",
  featureExportDescription: "Generates the {inventory} export in the exact format reviewers require, no manual reformatting.",
  proofFieldSetDescription:
    "Every field the {inventory} requires is mapped field-for-field, and completed by reviewers during vetting rather than demanded of submitters up front.",
  isWithheldDefaultRationale:
    "No FOIA-protected interest, legal restriction, or security classification identified yet — defaults to OMB's \"No.\"",
  rmfAtRiskLabel: "RMF at risk",
  pendingDecisionLabel: "Rationalization pending",
  pendingClusterField: "Pending rationalization",
  pendingDecisionPhrase: "pending rationalization",
  keepSeparate: "keep-separate",
  nothingNeedsAttention: "Nothing off-plumb",
  inventoryCheckLabel: "", // empty: keep the original "N submissions need an X reportability review" title
  crossRationalizationTerm: "Cross-{unit} rationalization",
  haveEnoughOption: "I have enough, give me the scaffold",
  reviseDraftPlaceholder: "Ask a follow-up or request a revised scaffold...",
  affectedUnitsPrompt: "Which business units, systems, or groups does this affect? Tap all that apply, then Continue.",
}

/** The tenant's copy: its overrides over the defaults, with `{assistant}` and `{inventory}` filled in. */
export function tenantCopy(tenant: TenantConfig = getTenant()): TenantCopy {
  const merged = { ...DEFAULT_COPY, ...tenant.copy }
  const out = {} as TenantCopy
  for (const key of Object.keys(merged) as (keyof TenantCopy)[]) {
    out[key] = merged[key]
      .replace(/\{assistant\}/g, tenant.assistantName)
      .replace(/\{inventory\}/g, tenant.inventoryLabel)
      .replace(/\{unit\}/g, tenant.tierLabels.unit.toLowerCase())
  }
  return out
}
