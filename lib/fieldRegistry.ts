// Field registry — the single source of truth for which form fields can be
// turned on or off via the admin Form Configuration tab. Each entry carries
// the metadata the admin UI needs to render a sensible toggle row, plus a
// `locked` flag for fields that the system requires (would break the AI
// assessment) or compliance requires (DoC-mandated AI risk questions).
//
// If you add a new field to FormData in lib/steps.ts, add it here too.
// Otherwise it'll be invisible to the toggle UI and stuck always-on.

import type { FormData } from "@/lib/steps"

export type FieldDefinition = {
  // Key into FormData. Must exactly match a property name.
  fieldKey: keyof FormData
  // Label shown in the admin UI (close to the wizard's actual field label).
  label: string
  // One-line technical description of what data this field captures.
  description: string
  // Why a customer would want this field on. Written so a CAIO or product
  // owner can read it and decide whether their org needs it.
  reasonToInclude: string
  // Which of the 4 wizard phases this field belongs to.
  phase: 1 | 2 | 3 | 4 | 5
  // Which step within the wizard renders this field.
  step: number
  // True if the field cannot be turned off. Either core to the AI assessment
  // or required for compliance (DoC AI risk mandate).
  locked: boolean
  // Human-readable reason for the lock — shown in the UI next to the lock icon.
  lockedReason?: string
  // True if this field feeds the OMB federal AI use case inventory (M-25-21
  // companion guidance). Surfaces an "OMB" badge next to the field in the wizard.
  omb?: boolean
}

// Single flat list. Grouping is computed at render time so admin UI changes
// don't require reshuffling the registry.
export const FIELD_REGISTRY: FieldDefinition[] = [
  // ────── Federal AI use case inventory (OMB) — Phase 4 / Feasibility ──────
  {
    fieldKey: "stageOfDevelopment",
    label: "Stage of Development",
    description: "Pre-deployment, pilot, deployed, or retired — the OMB inventory maturity stage.",
    reasonToInclude: "Required field in the OMB AI use case inventory; determines which reporting fields apply.",
    phase: 4,
    step: 6,
    locked: false,
    omb: true,
  },
  {
    fieldKey: "highImpact",
    label: "High-impact AI?",
    description: "Whether the use case meets OMB's high-impact AI definition (M-25-21).",
    reasonToInclude: "Required in the OMB inventory; high-impact use cases trigger additional risk-management reporting.",
    phase: 4,
    step: 6,
    locked: false,
    omb: true,
  },
  {
    fieldKey: "hasATO",
    label: "Associated ATO?",
    description: "Whether the AI system has an Authorization to Operate.",
    reasonToInclude: "OMB inventory field; signals the security authorization status of the AI system.",
    phase: 4,
    step: 6,
    locked: false,
    omb: true,
  },
  {
    fieldKey: "systemSource",
    label: "Built in-house, under contract, or purchased?",
    description: "Whether the system was developed in-house, under contract, or purchased from a vendor.",
    reasonToInclude: "OMB inventory field; also informs acquisition and the custom-code / IP posture.",
    phase: 4,
    step: 6,
    locked: false,
    omb: true,
  },
  // ────── Phase 1: Setup ──────
  {
    fieldKey: "submitterName",
    label: "Submitter Name",
    description: "The person filling out the form.",
    reasonToInclude:
      "Identifies who's accountable for the idea and gives reviewers a contact for follow-up questions.",
    phase: 1,
    step: 1,
    locked: false,
  },
  {
    fieldKey: "submitterEmail",
    label: "Submitter Email",
    description: "Email address for the submitter.",
    reasonToInclude: "Required to route review feedback and questions back to the right person.",
    phase: 1,
    step: 1,
    locked: false,
  },
  {
    fieldKey: "submitterRole",
    label: "Job Role",
    description: "Submitter's role (examiner, manager, IT staff, product owner, etc.).",
    reasonToInclude:
      "Helps reviewers understand the submitter's perspective and what access/context they bring to the idea.",
    phase: 1,
    step: 1,
    locked: false,
  },
  {
    fieldKey: "submitterOffice",
    label: "Business Unit",
    description: "Which business unit the submitter belongs to (Patents, Trademarks, OCIO, etc.).",
    reasonToInclude:
      "Routes the idea to the correct business unit reviewer and surfaces it on per-unit dashboards.",
    phase: 1,
    step: 1,
    locked: false,
  },
  {
    fieldKey: "useCaseTitle",
    label: "Idea Title",
    description: "Short name for the AI use case.",
    reasonToInclude:
      "The primary identifier across submissions, comparisons, and the AI readiness assessment.",
    phase: 5,
    step: 8,
    locked: true,
    lockedReason: "Required — the AI assessment and Decision Center both key off this field.",
  },
  {
    fieldKey: "useCaseDescription",
    label: "Idea Description",
    description: "1-3 sentence narrative explanation of the idea.",
    reasonToInclude:
      "Gives Scout enough context to coach the submitter through subsequent steps without inventing details.",
    phase: 5,
    step: 8,
    locked: true,
    lockedReason: "Required — Scout uses this as the seed context for every step's coaching.",
  },
  {
    fieldKey: "publicIndicator",
    label: "Public / Excluded Classification",
    description: "Whether the idea is publicly discussable or contains excluded information.",
    reasonToInclude:
      "Flags submissions that need restricted handling and prevents them from appearing in public-facing exports.",
    phase: 5,
    step: 8,
    locked: false,
  },

  // ────── Phase 2: Problem & Target Users (Step 2, merged) ──────
  {
    fieldKey: "coreProblem",
    label: "Core Problem",
    description: "Free-text description of the problem this idea solves.",
    reasonToInclude:
      "The anchor field for the entire submission — every reviewer and the AI assessment start here.",
    phase: 2,
    step: 2,
    locked: true,
    lockedReason: "Required — the AI assessment leads with this and the entire exec summary depends on it.",
  },
  {
    fieldKey: "problemImpact",
    label: "Problem Impact",
    description: "Free-text description of who's hurt by the problem and how badly.",
    reasonToInclude:
      "Surfaces severity and consequences of inaction. Without it, reviewers can't size the opportunity.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "affectedSystem",
    label: "Affected System",
    description: "Which process, system, or group the problem affects.",
    reasonToInclude: "Identifies the operational surface area for impact analysis and reviewer routing.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "problemType",
    label: "Problem Type Tags",
    description: "Multi-select tags: process inefficiency, technical debt, policy gap, etc.",
    reasonToInclude: "Lets analytics roll up themes across submissions — useful for portfolio-level reporting.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "severity",
    label: "Problem Severity",
    description: "Low / Medium / High rating.",
    reasonToInclude:
      "Quick triage signal in the Decision Center. Pair with impact text to prioritize review queue.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "targetAudience",
    label: "Target Audience",
    description: "Primary user role this serves (patent examiner, applicant, IT staff, etc.).",
    reasonToInclude: "Lets reviewers verify scope and identify the right SMEs to consult.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "impactedUsersCount",
    label: "Impacted Users Count",
    description: "Order-of-magnitude estimate: <10, 10-50, 50-500, 500+.",
    reasonToInclude:
      "Scale signal. The Decision Center surfaces this prominently to help triage by potential reach.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "painPoints",
    label: "Key Pain Points",
    description: "Free-text observed friction users currently experience.",
    reasonToInclude:
      "Grounds the problem in concrete observations rather than abstraction. Strengthens the AI assessment.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "targetUserContext",
    label: "User Profile / Context",
    description: "Free-text additional context about the users — workflow, environment, edge cases.",
    reasonToInclude:
      "Captures the workflow detail reviewers need to assess fit and the AI uses to refine its summary.",
    phase: 2,
    step: 2,
    locked: false,
  },
  {
    fieldKey: "problemDefinition",
    label: "Refined Problem & Users Summary",
    description: "AI-generated 2-3 sentence summary tying the problem to its affected users.",
    reasonToInclude:
      "Executive-ready summary that reviewers and the Decision Center quote. Editable after generation.",
    phase: 2,
    step: 2,
    locked: true,
    lockedReason:
      "Holds Scout's drafted summary — locked on so the AI output always has a field to land in.",
  },

  // ────── Phase 3: Solution & Value ──────
  // Step 4: Proposed Solution
  {
    fieldKey: "proposedSolution",
    label: "Proposed Solution",
    description: "Free-text description of the AI/ML approach.",
    reasonToInclude:
      "Required for any meaningful review — without a described solution, the submission is just a problem statement.",
    phase: 3,
    step: 3,
    locked: true,
    lockedReason: "Required — Scout's assessment and the Decision Center both depend on this field.",
  },
  {
    fieldKey: "keyFunctionality",
    label: "Key Functionality (Top 3 Features)",
    description: "Up to 3 feature tags describing what the solution does.",
    reasonToInclude:
      "Forces the submitter to scope down to the 3 most important features rather than gold-plating.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "solutionSummary",
    label: "Refined Solution Summary",
    description: "AI-generated summary of the proposed solution.",
    reasonToInclude:
      "Cleaner version of the freeform proposed-solution text, used in exec summaries and comparisons.",
    phase: 3,
    step: 3,
    locked: true,
    lockedReason:
      "Holds Scout's drafted summary — locked on so the AI output always has a field to land in.",
  },

  // Step 5: Value (merged user + business)
  {
    fieldKey: "userValue",
    label: "Value to Users",
    description: "Free-text description of how this benefits the end user.",
    reasonToInclude: "Articulates the user-facing benefit separate from the business case.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "userTimeSavings",
    label: "Expected User Time Savings",
    description: "Range: <1, 1-5, 5-10, 10+ hours per week.",
    reasonToInclude:
      "Quantifies the user benefit. Pairs with impacted-users-count to project agency-level hour savings.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "otherUserImprovements",
    label: "Other Measurable Improvements",
    description: "Multi-select tags: faster processing, better accuracy, reduced frustration, etc.",
    reasonToInclude: "Captures non-time-savings benefits that still matter to user experience.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "userValueSummary",
    label: "Refined User Value Summary",
    description: "AI-generated summary of user-facing value.",
    reasonToInclude:
      "Executive-ready quote for the value section. Editable after generation.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "businessValue",
    label: "Value to the Business",
    description: "Free-text business case — agency-level impact.",
    reasonToInclude:
      "The business-case framing that leadership reads first. Anchor for ROI estimates and strategic alignment.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "costSavings",
    label: "Estimated Cost / Time Savings",
    description: "Range: <$50K, $50K-$250K, $250K-$1M, $1M+.",
    reasonToInclude:
      "Order-of-magnitude $ figure that lets reviewers triage by ROI. Surfaces in the Decision Center prominently.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "strategicBenefit",
    label: "Strategic Benefit Tags",
    description: "Multi-select tags for what high-level outcomes this drives.",
    reasonToInclude: "Lets analytics roll up portfolio-level themes across the submission pool.",
    phase: 3,
    step: 4,
    locked: false,
  },
  {
    fieldKey: "businessValueSummary",
    label: "Refined Business Value Summary",
    description: "AI-generated 2-3 sentence executive summary of business value.",
    reasonToInclude:
      "The most-quoted field from a submission. Goes directly into the exec summary briefing.",
    phase: 3,
    step: 4,
    locked: true,
    lockedReason:
      "Holds Scout's drafted summary — locked on so the AI output always has a field to land in.",
  },

  // ────── Phase 4: Alignment & Feasibility ──────
  // Step 6: Strategic Alignment
  {
    fieldKey: "usptoFocusArea",
    label: "Strategic Focus Areas",
    description:
      "Multi-select of Department of War strategy goals and responsible-AI priorities this idea advances.",
    reasonToInclude:
      "Forces explicit linkage to published agency priorities — prevents vague 'modernization' claims.",
    phase: 4,
    step: 5,
    locked: false,
  },
  {
    fieldKey: "relevantOkrs",
    label: "Relevant OKRs / Alignment Text",
    description: "Free-text naming specific OKRs or strategic objectives this advances.",
    reasonToInclude:
      "Detailed alignment language reviewers can quote when justifying funding decisions.",
    phase: 4,
    step: 5,
    locked: false,
  },
  {
    fieldKey: "alignmentSummary",
    label: "Refined Alignment Summary",
    description: "AI-generated executive summary of strategic alignment.",
    reasonToInclude: "Clean exec-ready quote for the strategic section of the readiness brief.",
    phase: 4,
    step: 5,
    locked: true,
    lockedReason:
      "Holds Scout's drafted summary — locked on so the AI output always has a field to land in.",
  },

  // Step 7: Feasibility & Security
  {
    fieldKey: "implementationComplexity",
    label: "Implementation Complexity",
    description: "Low / Medium / High rating.",
    reasonToInclude:
      "Quick triage for how much effort this will take. Pairs with timeline-to-results to estimate viability.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "resourcesNeeded",
    label: "Resources Needed",
    description: "Multi-select tags: dev staff, data access, vendor support, etc.",
    reasonToInclude:
      "Surfaces dependencies on people/data/vendors so reviewers can confirm availability.",
    phase: 4,
    step: 6,
    locked: false,
  },
  {
    fieldKey: "dependencies",
    label: "Dependencies / Constraints",
    description: "Free-text dependencies, blockers, integration requirements.",
    reasonToInclude:
      "The honest-risks field. Without it, reviewers can't assess realistic feasibility.",
    phase: 4,
    step: 6,
    locked: false,
  },
  {
    fieldKey: "involvesSensitiveData",
    label: "Uses PII / Sensitive Data",
    description: "Yes / No — does this idea use or expose PII or other sensitive data?",
    reasonToInclude:
      "Required for federal AI risk management per Department of Commerce mandate.",
    phase: 4,
    step: 6,
    locked: true,
    lockedReason: "DoC-mandated AI risk question — required for federal compliance.",
  },
  {
    fieldKey: "securityClassification",
    label: "Security Classification",
    description: "Internal / External / Controlled — only shown if sensitive data answer is Yes.",
    reasonToInclude:
      "Determines handling controls when PII or sensitive data is involved.",
    phase: 4,
    step: 6,
    locked: false,
  },
  {
    fieldKey: "accessControlRequirements",
    label: "Access Control Requirements",
    description: "Tags: role-based, MFA, FedRAMP — only shown if sensitive data answer is Yes.",
    reasonToInclude: "Catalogs the security controls required to safely operate this AI use case.",
    phase: 4,
    step: 6,
    locked: false,
  },
  {
    fieldKey: "aiDecisionalImpact",
    label: "AI Drives Decisions About People",
    description: "Yes / No — does the AI output drive a decision affecting an applicant or employee?",
    reasonToInclude:
      "Required for federal AI risk management. Decisional AI requires enhanced human-review controls per DoC mandate.",
    phase: 4,
    step: 6,
    locked: true,
    lockedReason: "DoC-mandated AI risk question — required for federal compliance.",
  },
  {
    fieldKey: "aiModelSourcing",
    label: "AI Model Sourcing",
    description: "American-built / Open-source U.S.-hosted / Foreign / Unknown.",
    reasonToInclude:
      "Required by the current Executive Order on federal AI — foreign sourcing requires additional review.",
    phase: 4,
    step: 6,
    locked: true,
    lockedReason: "Required per Executive Order on federal AI sourcing.",
  },
  {
    fieldKey: "aiHumanReview",
    label: "Mandatory Human Review",
    description: "Yes / No — is human review mandatory before the AI output drives action?",
    reasonToInclude:
      "Required for federal AI risk management. Human-in-the-loop status determines downstream control requirements.",
    phase: 4,
    step: 6,
    locked: true,
    lockedReason: "DoC-mandated AI risk question — required for federal compliance.",
  },
  {
    fieldKey: "feasibilitySummary",
    label: "Refined Feasibility Summary",
    description: "AI-generated summary of feasibility and security considerations.",
    reasonToInclude:
      "Compact exec-ready summary covering implementation feasibility, security posture, and risk profile.",
    phase: 4,
    step: 6,
    locked: true,
    lockedReason:
      "Holds Scout's drafted summary — locked on so the AI output always has a field to land in.",
  },

  // Step 8: Success Metrics
  {
    fieldKey: "successMetrics",
    label: "Success Metrics Description",
    description: "Free-text description of how success will be measured.",
    reasonToInclude:
      "Forces explicit measurement thinking — without this, ROI claims are unverifiable.",
    phase: 4,
    step: 7,
    locked: false,
  },
  {
    fieldKey: "keyMetrics",
    label: "Key Metrics Tags",
    description: "Multi-select tags for measurable outcome categories.",
    reasonToInclude: "Lets the metrics roll up to portfolio-level views (how many projects target which outcomes).",
    phase: 4,
    step: 7,
    locked: false,
  },
  {
    fieldKey: "timelineForResults",
    label: "Timeline for Results",
    description: "Range: <3, 3-6, 6-12, 12+ months.",
    reasonToInclude: "Sets reviewer expectations and helps prioritize quick wins vs. long bets.",
    phase: 4,
    step: 7,
    locked: false,
  },
  {
    fieldKey: "metricsSummary",
    label: "Refined Metrics Summary",
    description: "AI-generated executive summary of success metrics and timeline.",
    reasonToInclude:
      "Exec-ready summary used in the readiness briefing and Decision Center comparison.",
    phase: 4,
    step: 7,
    locked: true,
    lockedReason:
      "Holds Scout's drafted summary — locked on so the AI output always has a field to land in.",
  },
]

// Convenience lookup by field key — O(1) access during isFieldEnabled checks.
export const FIELD_REGISTRY_BY_KEY: Record<string, FieldDefinition> = FIELD_REGISTRY.reduce(
  (acc, def) => {
    acc[def.fieldKey] = def
    return acc
  },
  {} as Record<string, FieldDefinition>,
)

// Convenience: which fields belong to a given step.
export function fieldsForStep(step: number): FieldDefinition[] {
  return FIELD_REGISTRY.filter((f) => f.step === step)
}

// Convenience: which fields belong to a given phase.
export function fieldsForPhase(phase: 1 | 2 | 3 | 4 | 5): FieldDefinition[] {
  return FIELD_REGISTRY.filter((f) => f.phase === phase)
}
