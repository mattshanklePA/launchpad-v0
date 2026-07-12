import { getTenant, getOrgNameForUnit } from "@/lib/tenant"

export type FormStep = {
  step: number
  name: string
  title: string
  prompt: string
  phase?: number
  phaseName?: string
}

// Shared labels for the submitterRole enum (Step 1's "Role" dropdown). Kept
// in one place and reused everywhere this value is displayed (the wizard's
// "Submitting as…" pill, the Step 10 recap) so they can't drift out of sync
// with each other — that drift is what showed a stale "Trademark Examiner"
// in the pill after the dropdown itself had moved to neutral job titles.
export const SUBMITTER_ROLE_LABELS: Record<string, string> = {
  patent_examiner: "Operations / Staff Officer",
  trademark_examiner: "Analyst",
  manager: "Manager",
  it_staff: "IT Staff",
  product_owner: "Product Owner",
  lead_product_owner: "Lead Product Owner",
  developer: "Developer",
  other: "Other",
}

// Phase grouping for the progress reframe.
// Ramesh-bias: show "Phase N of 4" instead of intimidating step counts.
// Steps 3 (Problem & Target Users) and 5 (Value) are merged steps that used
// to be two separate substeps each.
export type FormPhase = {
  phase: number
  name: string
  description: string
  stepStart: number
  stepEnd: number
}

export const formPhases: FormPhase[] = [
  { phase: 1, name: "Setup", description: "Who you are.", stepStart: 1, stepEnd: 1 },
  { phase: 2, name: "Problem & Users", description: "Who's affected and what's broken.", stepStart: 2, stepEnd: 2 },
  { phase: 3, name: "Solution & Value", description: "What you'd build and why it matters.", stepStart: 3, stepEnd: 4 },
  { phase: 4, name: "Alignment & Feasibility", description: "Strategic fit, security, and measurable success.", stepStart: 5, stepEnd: 7 },
  { phase: 5, name: "Summary", description: "Name and summarize the finished idea.", stepStart: 8, stepEnd: 8 },
]

export function getPhaseForStep(step: number): FormPhase | null {
  return formPhases.find((p) => step >= p.stepStart && step <= p.stepEnd) || null
}

export type FormData = {
  // Step 1
  submitterName: string
  submitterEmail: string
  submitterRole:
    | "patent_examiner"
    | "trademark_examiner"
    | "manager"
    | "it_staff"
    | "product_owner"
    | "lead_product_owner"
    | "developer"
    | "other"
    | ""
  // Tenant-defined org unit (USPTO business unit, DoC bureau, ...). Options come
  // from the active tenant's `unit.options`, so this is a free string rather than
  // a per-tenant union.
  submitterOffice: string
  // Office sub-level under submitterOffice, only meaningful when the chosen
  // bureau declares `offices` (see lib/tenant/types.ts). Empty when the
  // bureau has no offices or the tenant doesn't use the concept.
  submitterSubOffice: string

  // Step 2 - Use Case Overview
  useCaseTitle: string
  useCaseDescription: string
  publicIndicator: "public" | "excluded" | ""

  // Step 3
  targetAudience:
    | "patent_examiner"
    | "trademark_examiner"
    | "supervisory_examiner"
    | "product_owner"
    | "lead_product_owner"
    | "developer"
    | "applicant"
    | "other"
    | ""
  impactedUsersCount: "lt_10" | "10_50" | "50_500" | "gt_500" | ""
  painPoints: string
  targetUserContext: string
  targetUserSummary: string

  // Step 4
  coreProblem: string
  problemImpact: string
  affectedSystem: "patents" | "trademarks" | "it_systems" | "cross_functional" | "other" | ""
  problemType: string[]
  severity: "low" | "medium" | "high" | ""
  problemDefinition: string

  // Step 5
  proposedSolution: string
  keyFunctionality: string[]
  solutionSummary: string

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
  // (see components/steps/step-8-feasibility-security.tsx). Every multiple-choice
  // field in this group also permits "In-progress" and a CAIO-waiver answer,
  // not just Yes/No.
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
  impactLevel: "unclassified" | "cui" | "il4" | "il5" | "il6" | "" // data classification -> required DoD Impact Level
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
}

export const initialFormData: FormData = {
  submitterName: "",
  submitterEmail: "",
  submitterRole: "",
  submitterOffice: "",
  submitterSubOffice: "",
  useCaseTitle: "",
  useCaseDescription: "",
  publicIndicator: "",
  targetAudience: "",
  impactedUsersCount: "",
  painPoints: "",
  targetUserContext: "",
  targetUserSummary: "",
  coreProblem: "",
  problemImpact: "",
  affectedSystem: "",
  problemType: [],
  severity: "",
  problemDefinition: "",
  proposedSolution: "",
  keyFunctionality: [],
  solutionSummary: "",
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
}

// Step title/prompt copy that names the organization is generated per-tenant
// (via getTenant()) rather than hardcoded, so a Commerce/USPTO deployment
// never shows another tenant's org name. Everything else is shared.
//
// `submitterOffice` (the wizard's `formData.submitterOffice`) lets the
// Strategic Alignment step (5) name the submitter's own bureau instead of
// the department when that bureau has its own strategic priorities (DoC) —
// see getOrgNameForUnit. Callers that don't have a submitter in scope (e.g.
// the progress bar) can omit it and get the department-level fallback.
export function getFormSteps(submitterOffice?: string | null): FormStep[] {
  const { orgName, assistantName } = getTenant()
  const alignmentOrgName = getOrgNameForUnit(submitterOffice)
  return [
    {
      step: 1,
      name: "Submitter Info",
      title: "Submitter Information",
      prompt: "Let's start with who you are.",
    },
    {
      step: 2,
      name: "Problem & Target Users",
      title: "Define the Problem and Who It Affects",
      prompt: "What problem or opportunity are you trying to address, and who's affected by it?",
    },
    {
      step: 3,
      name: "Proposed Solution",
      title: "Propose a Solution",
      prompt: "How would this work? Describe your proposed AI/ML approach.",
    },
    {
      step: 4,
      name: "Value",
      title: "Define the Value to Users and the Business",
      prompt: `How does this help users, and what's the business case for the ${orgName}?`,
    },
    {
      step: 5,
      name: "Strategic Alignment",
      title: `Align with ${alignmentOrgName} Goals`,
      prompt: `Does this align with the ${alignmentOrgName}'s strategic priorities? Which ones?`,
    },
    {
      step: 6,
      name: "Feasibility & Security",
      title: "Assess Feasibility & Security",
      prompt: "Is this idea feasible? Consider technical, security, and resource realities.",
    },
    {
      step: 7,
      name: "Success Metrics",
      title: "Define Success Metrics",
      prompt: "How will we know this worked? Define measurable success.",
    },
    {
      step: 8,
      name: "Idea Overview",
      title: "Name & Summarize Your Idea",
      prompt: `${assistantName} drafted a title and summary from everything you entered — review and refine.`,
    },
    {
      step: 9,
      name: "Review & Submit",
      title: "Review & Submit for Vetting",
      prompt: "Review your idea before submitting it for vetting.",
    },
    {
      step: 10,
      name: "Submission Complete",
      title: "Idea Submitted for Vetting",
      prompt: "Your idea has been submitted and will be vetted by the review team.",
    },
  ]
}
