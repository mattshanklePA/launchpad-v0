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
  timeToDecisionLabel: "Median time to decision",
  timeToDecisionAcross: "across {count} decisions",
  timeToDecisionAcrossOne: "across 1 decision",
  timeToDecisionEmpty: "No decisions yet",
  decidedInLabel: "Decided in {days}",
  rmfNotConfirmedApproved: "Not confirmed before approval",
  rmfNotConfirmedRejected: "Not confirmed before the decision",
  sampleDataTag: "", // empty: no tenant but ES2 renders the strip
  sampleDataNotice: "",
  homeLeadLabel: "Do this first", // NL-3: read only by the ES2 (cockpitLook) home
  homeColCount: "Count",
  homeColWhat: "What",
  homeColWhy: "Why it matters",
  homeExpandAll: "Expand all",
  homeCollapseAll: "Collapse all",
  listColNo: "No.", // NL-4: read only by the ES2 (cockpitLook) use-case lists
  listColIdea: "Use case",
  listColStatus: "Status",
  listColStage: "Stage",
  listColLink: "Open",
  decisionDetailRmf: "RMF", // NL-5: read only by the ES2 (cockpitLook) Decision Center
  decisionDetailRecord: "Record",
  // NL-7 (#288): decided record and overlap group.
  decisionBlockTitle: "The decision",
  decisionEyebrow: "Decided",
  decisionFactDecision: "Decision",
  decisionFactBy: "Decided by",
  decisionFactDate: "Date",
  decisionFactDays: "Decided in",
  decisionFactLock: "Lock",
  decisionLockedTag: "Locked",
  recordColStep: "Step",
  recordColAnswer: "Answer",
  recordColWho: "Who",
  recordColWhen: "When",
  overlapColLead: "Lead",
  // NL-8 (#289): submit an idea.
  submitEyebrow: "Submit an idea · Step {step} of {count}",
  submitSentEyebrow: "Submit an idea · Sent",
  // NL-13 (#314): plain words for ES2. These defaults are what every other tenant rendered before.
  duplicatesLabel: "", // empty: keep "Cross-{unit} duplicate clusters"
  duplicatesActionLabel: "Rationalize",
  consolidatedColumnLabel: "Consolidated ({inventoryShort})",
  inventoryEntriesPhrase: "{inventoryShort} reportable entries",
  inventoryEntryPhrase: "{inventoryShort} reportable entry",
  inventoryCheckEyebrow: "{inventoryShort} reportability",
  rmfAtRiskRationale: "At least one RMF function has a governance gap that needs attention.",
  rmfPartialRationale: "One or more RMF functions are only partially covered — review the flags for what's missing.",
  rmfOnTrackRationale: "Every applicable RMF function is fully covered.",
  similarWordingLabel: "{count} similar on record",
  similarWordingHint: "",
  noOtherMessages: "No messages yet.",
  // F5-1 (#318): portfolio report wording. Only ES2 renders the report.
  portfolioRiskHigh: "High",
  portfolioRiskMedium: "Medium",
  portfolioRiskLow: "Low",
  portfolioRiskUnassessed: "Not assessed",
  portfolioReasonHigh: "High risk. Read the record before a decision is made.",
  portfolioReasonMedium: "Medium risk. Check who makes the final call.",
  portfolioReasonLow: "Low risk. A person reviews the result.",
  portfolioReasonUnassessed: "Not assessed yet; a reviewer has not answered the risk questions.",
  portfolioWaitOverlap: "{offices} are each building the same thing. A leader decides whether to combine them or keep them separate.",
  portfolioWaitHighRisk: "High risk and still in review. {reason}",
  portfolioListAnd: "and",
  portfolioDaysOpen: "{days} open",
  portfolioDaysToDecide: "{days} to decide",
  portfolioNotYet: "Not yet",
  portfolioNotRecorded: "Not recorded",
  portfolioNoPriority: "No priority",
  portfolioNoOffice: "No office set",
  submitStepLabels: "Who you are|The problem|Your solution|Constraints|Name it|Review and send",
}

/** The tenant's copy: its overrides over the defaults, with `{assistant}` and `{inventory}` filled in. */
export function tenantCopy(tenant: TenantConfig = getTenant()): TenantCopy {
  const merged = { ...DEFAULT_COPY, ...tenant.copy }
  const out = {} as TenantCopy
  for (const key of Object.keys(merged) as (keyof TenantCopy)[]) {
    out[key] = merged[key]
      .replace(/\{assistant\}/g, tenant.assistantName)
      .replace(/\{inventory\}/g, tenant.inventoryLabel)
      .replace(/\{inventoryShort\}/g, tenant.inventoryShortLabel)
      .replace(/\{unit\}/g, tenant.tierLabels.unit.toLowerCase())
  }
  return out
}
