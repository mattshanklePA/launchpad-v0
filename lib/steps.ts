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
  // OMB federal AI use case inventory fields (M-25-21 companion guidance)
  stageOfDevelopment: "pre_deployment" | "pilot" | "deployed" | "retired" | ""
  highImpact: "yes" | "no" | ""
  hasATO: "yes" | "no" | "in_progress" | ""
  systemSource: "in_house" | "contract" | "vendor" | ""
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
  hasATO: "",
  systemSource: "",
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
    prompt: "How does this help users, and what's the business case for the Department of War?",
  },
  {
    step: 5,
    name: "Strategic Alignment",
    title: "Align with Department of War Goals",
    prompt: "Does this align with the Department of War's strategic priorities? Which ones?",
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
    prompt: "Scout drafted a title and summary from everything you entered — review and refine.",
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
