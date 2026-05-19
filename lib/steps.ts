export type FormStep = {
  step: number
  name: string
  title: string
  prompt: string
  phase?: number
  phaseName?: string
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
  { phase: 1, name: "Setup", description: "Who you are and what you're proposing.", stepStart: 1, stepEnd: 2 },
  { phase: 2, name: "Problem & Users", description: "Who's affected and what's broken.", stepStart: 3, stepEnd: 3 },
  { phase: 3, name: "Solution & Value", description: "What you'd build and why it matters.", stepStart: 4, stepEnd: 5 },
  { phase: 4, name: "Alignment & Feasibility", description: "Strategic fit, security, and measurable success.", stepStart: 6, stepEnd: 8 },
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
  submitterOffice: "patents" | "trademarks" | "ocio" | "ocfo" | "ogc" | "opia" | "hr" | "other" | ""

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

  // Step 9
  implementationComplexity: "low" | "medium" | "high" | ""
  resourcesNeeded: string[]
  dependencies: string
  involvesSensitiveData: "yes" | "no" | ""
  securityClassification: "internal" | "external" | "controlled" | ""
  accessControlRequirements: string[]
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
}

export const initialFormData: FormData = {
  submitterName: "",
  submitterEmail: "",
  submitterRole: "",
  submitterOffice: "",
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
  accessControlRequirements: [],
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

export const formSteps: FormStep[] = [
  {
    step: 1,
    name: "Submitter Info",
    title: "Submitter Information",
    prompt: "Let's start with who you are.",
  },
  {
    step: 2,
    name: "Idea Overview",
    title: "Describe Your Idea",
    prompt: "What's your AI idea? It doesn't need to be polished yet.",
  },
  {
    step: 3,
    name: "Problem & Target Users",
    title: "Define the Problem and Who It Affects",
    prompt: "What problem does this idea solve, and who's affected by it?",
  },
  {
    step: 4,
    name: "Proposed Solution",
    title: "Propose a Solution",
    prompt: "How would this work? Describe your proposed AI/ML approach.",
  },
  {
    step: 5,
    name: "Value",
    title: "Define the Value to Users and the Business",
    prompt: "How does this help users, and what's the business case for USPTO?",
  },
  {
    step: 6,
    name: "Strategic Alignment",
    title: "Align with USPTO Goals",
    prompt: "Does this align with USPTO's strategic priorities? Which ones?",
  },
  {
    step: 7,
    name: "Feasibility & Security",
    title: "Assess Feasibility & Security",
    prompt: "Is this idea feasible? Consider technical, security, and resource realities.",
  },
  {
    step: 8,
    name: "Outcome Measurements",
    title: "Define Success Metrics",
    prompt: "How will we know this worked? Define measurable success.",
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
