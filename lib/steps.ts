import { getTenant } from "@/lib/tenant"

export type FormStep = {
  step: number
  name: string
  title: string
  prompt: string
  phase?: number
  phaseName?: string
}

// Labels for the submitterRole enum (Step 1's "Role" dropdown), resolved
// from the active tenant's `submitterRoles` (lib/tenant/types.ts) rather than
// a static USPTO-shaped map. Kept in one place and reused everywhere this
// value is displayed (the wizard's "Submitting as…" pill, the Review & Submit
// recap, the PDF export) so they can't drift out of sync with each other — that
// drift is what once showed a stale "Trademark Examiner" in the pill after
// the dropdown itself had moved to neutral job titles.
export function getSubmitterRoleLabels(): Record<string, string> {
  return Object.fromEntries(getTenant().submitterRoles.map((r) => [r.value, r.label]))
}

// Phase grouping for the progress reframe.
// Ramesh-bias: show "Phase N of 3" instead of intimidating step counts.
//
// Issue #162 slimmed the submit wizard down to a 5-step idea flow (steps
// 2-6 below) — Strategic Alignment, the heavy OMB/M-25-21 Feasibility &
// Security block, and Success Metrics are no longer collected at idea
// intake. Those fields stay in `FormData` and get filled in during vetting
// (lib/governanceCapture.ts's reviewer-side capture, or direct edits on the
// submission) rather than by the submitter up front.
export type FormPhase = {
  phase: number
  name: string
  description: string
  stepStart: number
  stepEnd: number
}

export const formPhases: FormPhase[] = [
  { phase: 1, name: "Setup", description: "Who you are.", stepStart: 1, stepEnd: 1 },
  { phase: 2, name: "Your Idea", description: "The problem, your solution, and any constraints.", stepStart: 2, stepEnd: 4 },
  { phase: 3, name: "Summary & Submit", description: "Name it, review it, send it for vetting.", stepStart: 5, stepEnd: 6 },
]

export function getPhaseForStep(step: number): FormPhase | null {
  return formPhases.find((p) => step >= p.stepStart && step <= p.stepEnd) || null
}

// Admin-only field-grouping phases (Form Configuration tab, issue #57) —
// separate from `formPhases` above because it still needs a home for every
// FIELD_REGISTRY field, including the Strategic Alignment / Feasibility &
// Security / Success Metrics fields that no longer render in the idea
// intake wizard (issue #162) but reviewers still fill in during vetting and
// admins still need to be able to toggle. Reusing `formPhases` for this
// would either drop those fields from the admin panel entirely, or add
// always-empty phantom segments to the wizard's own progress bar — this
// keeps the two concerns (what the wizard shows vs. what admins can
// configure) independent.
export type AdminFieldGroup = { phase: number; name: string; description: string }

export const adminFieldGroups: AdminFieldGroup[] = [
  { phase: 1, name: "Setup", description: "Who you are." },
  { phase: 2, name: "Problem & Users", description: "Who's affected and what's broken." },
  { phase: 3, name: "Solution & Value", description: "What you'd build and why it matters." },
  {
    phase: 4,
    name: "Alignment, Feasibility & Governance (vetting-only)",
    description: "Strategic fit, security, and OMB/M-25-21 governance — filled in by reviewers during vetting, not shown at idea intake.",
  },
  { phase: 5, name: "Summary", description: "Name and summarize the finished idea." },
]

export type FormData = {
  // Step 1
  submitterName: string
  submitterEmail: string
  // Tenant-defined role (`TenantConfig.submitterRoles`). Options come from the
  // active tenant, so this is a free string rather than a per-tenant union —
  // same pattern as `submitterOffice` below.
  submitterRole: string
  // Tenant-defined org unit (USPTO business unit, DoC bureau, ...). Options come
  // from the active tenant's `unit.options`, so this is a free string rather than
  // a per-tenant union.
  submitterOffice: string
  // Office sub-level under submitterOffice, only meaningful when the chosen
  // bureau declares `offices` (see lib/tenant/types.ts). Empty when the
  // bureau has no offices or the tenant doesn't use the concept.
  submitterSubOffice: string
  // Client sponsor (issue #163) — who's sponsoring this idea, when that's
  // someone other than the submitter. Optional free text; left blank when
  // the submitter is their own sponsor.
  sponsorName: string
  sponsorRole: string
  sponsorEmail: string

  // Step 2 - Use Case Overview
  useCaseTitle: string
  useCaseDescription: string
  // OMB's four-way `is_withheld` field (docs/omb-2025-inventory-fields.md #5:
  // "Should this AI use case be withheld from public reporting?"). Replaces
  // the earlier two-way public/excluded flag (issue #116) — the export
  // needs the *reason* an entry is withheld, not just a bare yes/no.
  isWithheld: "no" | "yes_risk_to_disclosure" | "yes_disclosure_prohibited" | "other" | ""

  // Step 3
  // Tenant-defined audience (`TenantConfig.targetAudiences`). Free string,
  // same pattern as `submitterOffice`.
  targetAudience: string
  impactedUsersCount: "lt_10" | "10_50" | "50_500" | "gt_500" | ""
  painPoints: string
  targetUserContext: string
  targetUserSummary: string

  // Step 4
  coreProblem: string
  problemImpact: string
  // Affected business units (issue #163) — multi-select, sourced from the
  // tenant's `affectedSystems` list (`TenantConfig.affectedSystems`), same
  // free-string-per-option pattern as `submitterOffice`. Replaces the
  // earlier single-value `affectedSystem`; legacy single values are wrapped
  // into a one-element array at the read boundary
  // (`lib/formDataMigrations.ts`'s `migrateAffectedBusinessUnits`).
  affectedBusinessUnits: string[]
  problemType: string[]
  severity: "low" | "medium" | "high" | ""
  problemDefinition: string

  // Step 5
  proposedSolution: string
  keyFunctionality: string[]
  solutionSummary: string
  // Internal vs external (issue #163) — whether the solution is built for
  // internal staff use or is customer/public-facing.
  deliveryAudience: "internal" | "external" | ""

  // Step 6
  userValue: string
  userTimeSavings: "lt_1" | "1_5" | "5_10" | "gt_10" | ""
  otherUserImprovements: string[]
  userValueSummary: string

  // Step 7
  businessValue: string
  costSavings: "lt_50k" | "50k_250k" | "250k_1m" | "gt_1m" | ""
  strategicBenefit: string[]
  businessValueSummary: string

  // Step 8
  usptoFocusArea: string[]
  relevantOkrs: string
  alignmentSummary: string

  // Step 7 (was 9 in pre-merge numbering): Feasibility & Security
  implementationComplexity: "low" | "medium" | "high" | ""
  resourcesNeeded: string[]
  dependencies: string
  involvesSensitiveData: "yes" | "no" | "" // PII / sensitive data use
  securityClassification: "internal" | "external" | "controlled" | ""
  accessControlRequirements: string[]
  // AI Risk Management questions — Department of Commerce mandated set,
  // plus the American-built model requirement per the current executive order.
  aiDecisionalImpact: "yes" | "no" | "" // Does AI make/influence a decision affecting an applicant or employee?
  aiModelSourcing: "american_built" | "open_source_us" | "foreign" | "unknown" | "" // Trump EO compliance
  aiHumanReview: "yes" | "no" | "" // Is there mandatory human review before action?
  // OMB federal AI use case inventory fields (M-25-21 companion guidance).
  // Field numbers below refer to docs/omb-2025-inventory-fields.md's 34-field
  // data-dictionary list (25 base + 9 high-impact-only).
  stageOfDevelopment: "pre_deployment" | "pilot" | "deployed" | "retired" | "" // #6
  highImpact: "high_impact" | "presumed_not_high_impact" | "not_high_impact" | "" // #7
  highImpactJustification: string // #8 — required only when highImpact is "presumed_not_high_impact"
  topicArea:
    | "administrative_functions"
    | "cybersecurity"
    | "emergency_management"
    | "energy_environment"
    | "government_benefits_processing"
    | "health_medical"
    | "human_resources"
    | "information_technology"
    | "international_affairs"
    | "law_enforcement"
    | "other"
    | "procurement_financial_management"
    | "science"
    | "service_delivery"
    | "transportation"
    | "" // #9
  aiClassification:
    | "agentic_ai"
    | "classical_predictive_ml"
    | "computer_vision"
    | "generative_ai"
    | "nlp"
    | "reinforcement_learning"
    | "" // #10
  // NIST AI RMF gap fields (docs/nist-rmf-mapping.md §8) — the DoC AI Use
  // Case Tracker has no existing signal for these two, unlike every other
  // Map-function field above. RMF/LaunchPad-specific, not one of OMB's 34 —
  // see lib/fieldRegistry.ts's `level: "department"` entry for both.
  disseminatesToPublic: "yes" | "no" | "" // does the AI system's output get disseminated to the public?
  scalable: "yes" | "no" | "" // is this use case intended to scale beyond its current deployment?
  hasATO: "yes" | "no" | "in_progress" | "" // #17 (kept an extra "in_progress" beyond OMB's Yes/No for in-flight status)
  atoSystemName: string // #18 sub-field — system name, only meaningful once hasATO is "yes"
  systemSource: "in_house" | "contract" | "vendor" | "" // #15
  systemSourceVendorName: string // #16 sub-field — vendor name, only meaningful once systemSource is contract/vendor
  operationalDate: string // #14 — date the use case became operational, or the pilot's start date
  trainingDataDescription: string // #19 — data used to train/fine-tune/evaluate the model(s)
  federalDataCatalogLink: string // #20 — Federal Data Catalog entry link, if publicly disclosed
  hasPii: "yes" | "no" | "" // #21 — OMB inventory field; distinct from the DoC-mandated involvesSensitiveData below
  piaLink: string // #22 — Privacy Impact Assessment link, if publicly available
  demographicFeatures: string[] // #23 — select-multiple; demographic variables used as model features
  customCode: "yes" | "no" | "" // #24 — does this project include custom-developed code?
  openSourceCodeLink: string // #25 — public source code link, only meaningful once customCode is "yes"
  // Reportability inputs (lib/ombReportability.ts): NSS/IC use and research-only
  // use are the two OMB inventory exclusions.
  nationalSecuritySystem: "yes" | "no" | ""
  researchOnly: "yes" | "no" | ""
  // High-impact determination inputs (lib/highImpactDetermination.ts): which
  // OMB M-25-21 Section 5 categories the AI output could meaningfully affect.
  // Drives the `highImpact` recommendation; the reviewer keeps the final call.
  highImpactFactors: string[]
  // M-25-21 minimum-practice risk-management fields (#26-34) — required only
  // once highImpact is "high_impact" AND stageOfDevelopment is "deployed"
  // (see components/submissions/governance-capture-panel.tsx — filled in
  // during vetting, not at idea intake, as of issue #162). Every
  // multiple-choice field in this group also permits "In-progress" and a
  // CAIO-waiver answer, not just Yes/No.
  preDeploymentTesting: "yes" | "in_progress" | "waived" | "" // #26
  preDeploymentTestingNote: string
  aiImpactAssessmentCompleted: "yes" | "in_progress" | "waived" | "" // #27
  aiImpactAssessment: string // #28 — potential impacts and how they were identified
  independentReviewConducted:
    | "yes_other_office"
    | "yes_oversight_board"
    | "yes_caio"
    | "in_progress"
    | "waived"
    | "" // #29
  ongoingMonitoringPlan: "yes" | "in_progress" | "waived" | "" // #30
  ongoingMonitoringNote: string
  operatorTrainingEstablished: "yes" | "in_progress" | "waived" | "" // #31
  failSafeMechanism: "yes" | "not_applicable" | "in_progress" | "waived" | "" // #32
  humanOversightAppeal: "yes" | "not_applicable" | "in_progress" | "law_precludes" | "waived" | "" // #33 — appeal process for affected individuals
  humanOversightAppealNote: string
  publicConsultationSteps: string[] // #34 — select-multiple; steps taken to consult end users and the public
  // DoD responsible-AI + maturity disclosures
  // Tenant-defined data classification (`TenantConfig.dataClassifications`) —
  // DoD Impact Levels for USPTO/DoW, FISMA impact levels for DoC. Free
  // string, same pattern as `submitterOffice`.
  impactLevel: string
  dataReadiness: "ai_ready" | "partial" | "needs_build" | "" // is AI-ready labeled data available today?
  trl: "" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" // Technology Readiness Level
  feasibilitySummary: string

  // Step 10
  successMetrics: string
  keyMetrics: string[]
  timelineForResults: "lt_3" | "3_6" | "6_12" | "gt_12" | ""
  metricsSummary: string

  // Step 11
  routeTo: string[]
  reviewerNotes: string

  // Readiness assessment
  readinessScore: "ready" | "needs_work" | "early_stage" | ""
  readinessSummary: string
  executiveSummary: string
  // The concrete gaps behind the rating, each pointing at the intake step that
  // closes it (ES2-14). Stored in form_data JSON, so no migration; records
  // written before ES2-14 simply have no key, and every consumer must read an
  // absent value and `[]` the same way.
  readinessFindings: { step: number; message: string }[]

  // Review workflow (stored in form_data for the demo — see lib/reviewWorkflow).
  reviewStatus?: "draft" | "submitted" | "in_review" | "needs_info" | "approved" | "rejected"
  comments?: {
    id: string
    authorName: string
    authorRole: "submitter" | "reviewer" | "admin"
    body: string
    createdAt: string
  }[]
  assignedReviewerName?: string
  assignedReviewerEmail?: string

  // Which intake experience produced this submission — "guided" (the
  // conversational thread, issue #169) or "form" (the step wizard). Set once,
  // at submit time, by whichever surface the submitter was on when they
  // clicked submit (issue #170); absent on drafts and on submissions saved
  // before this field existed. Lightweight instrumentation only — lets
  // reporting compare completion by mode without a separate event log.
  intakeMode?: "guided" | "form"
}

export const initialFormData: FormData = {
  submitterName: "",
  submitterEmail: "",
  submitterRole: "",
  submitterOffice: "",
  submitterSubOffice: "",
  sponsorName: "",
  sponsorRole: "",
  sponsorEmail: "",
  useCaseTitle: "",
  useCaseDescription: "",
  isWithheld: "",
  targetAudience: "",
  impactedUsersCount: "",
  painPoints: "",
  targetUserContext: "",
  targetUserSummary: "",
  coreProblem: "",
  problemImpact: "",
  affectedBusinessUnits: [],
  problemType: [],
  severity: "",
  problemDefinition: "",
  proposedSolution: "",
  keyFunctionality: [],
  solutionSummary: "",
  deliveryAudience: "",
  userValue: "",
  userTimeSavings: "",
  otherUserImprovements: [],
  userValueSummary: "",
  businessValue: "",
  costSavings: "",
  strategicBenefit: [],
  businessValueSummary: "",
  usptoFocusArea: [],
  relevantOkrs: "",
  alignmentSummary: "",
  implementationComplexity: "",
  resourcesNeeded: [],
  dependencies: "",
  involvesSensitiveData: "",
  securityClassification: "",
  impactLevel: "",
  dataReadiness: "",
  trl: "",
  accessControlRequirements: [],
  aiDecisionalImpact: "",
  aiModelSourcing: "",
  aiHumanReview: "",
  stageOfDevelopment: "",
  highImpact: "",
  highImpactJustification: "",
  topicArea: "",
  aiClassification: "",
  disseminatesToPublic: "",
  scalable: "",
  hasATO: "",
  atoSystemName: "",
  systemSource: "",
  systemSourceVendorName: "",
  operationalDate: "",
  trainingDataDescription: "",
  federalDataCatalogLink: "",
  hasPii: "",
  piaLink: "",
  demographicFeatures: [],
  customCode: "",
  openSourceCodeLink: "",
  nationalSecuritySystem: "",
  researchOnly: "",
  highImpactFactors: [],
  preDeploymentTesting: "",
  preDeploymentTestingNote: "",
  aiImpactAssessmentCompleted: "",
  aiImpactAssessment: "",
  independentReviewConducted: "",
  ongoingMonitoringPlan: "",
  ongoingMonitoringNote: "",
  operatorTrainingEstablished: "",
  failSafeMechanism: "",
  humanOversightAppeal: "",
  humanOversightAppealNote: "",
  publicConsultationSteps: [],
  feasibilitySummary: "",
  successMetrics: "",
  keyMetrics: [],
  timelineForResults: "",
  metricsSummary: "",
  routeTo: [],
  reviewerNotes: "",
  readinessScore: "",
  readinessSummary: "",
  executiveSummary: "",
  readinessFindings: [],
}

// Step title/prompt copy that names the organization is generated per-tenant
// (via getTenant()) rather than hardcoded, so a Commerce/USPTO deployment
// never shows another tenant's org name. Everything else is shared.
//
// `submitterOffice` is accepted (but currently unused in the step copy
// below) for call-site compatibility with the pre-#162 signature — Strategic
// Alignment, the step that used to name the submitter's bureau here, is no
// longer part of idea intake (filled in during vetting instead).
export function getFormSteps(submitterOffice?: string | null): FormStep[] {
  const { assistantName } = getTenant()
  return [
    {
      step: 1,
      name: "Submitter Info",
      title: "Submitter Information",
      prompt: "Let's start with who you are.",
    },
    {
      step: 2,
      name: "Business Problem & Opportunity",
      title: "What's the Problem or Opportunity?",
      prompt: "Who's affected, what's broken, and why does it matter?",
    },
    {
      step: 3,
      name: "Proposed Solution & Benefits",
      title: "Propose a Solution",
      prompt: "How would this work, and what benefit do you expect it to deliver?",
    },
    {
      step: 4,
      name: "Technical Constraints",
      title: "Any Known Technical Constraints?",
      prompt: "Quick notes only — dependencies, blockers, or integration realities we should know about.",
    },
    {
      step: 5,
      name: "Idea Overview",
      title: "Name & Summarize Your Idea",
      prompt: `${assistantName} drafted a title and summary from everything you entered: review and refine.`,
    },
    {
      step: 6,
      name: "Review & Submit",
      title: "Review & Submit for Vetting",
      prompt: "Review your idea before submitting it for vetting.",
    },
    {
      step: 7,
      name: "Submission Complete",
      title: "Idea Submitted for Vetting",
      prompt: "Your idea has been submitted and will be vetted by the review team.",
    },
  ]
}
