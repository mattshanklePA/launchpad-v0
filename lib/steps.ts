export type FormStep = {
  step: number
  name: string
  title: string
  prompt: string
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
  submitterOffice: "patents" | "trademarks" | "ocio" | "ogc" | "other" | ""

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
  painPoints: string[]
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
  painPoints: [],
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
    name: "Target User",
    title: "Identify the Target User",
    prompt: "Who would benefit from this idea? Describe the primary users.",
  },
  {
    step: 4,
    name: "Problem Statement",
    title: "Define the Problem",
    prompt: "What problem does this idea solve? Be specific about the pain.",
  },
  {
    step: 5,
    name: "Proposed Solution",
    title: "Propose a Solution",
    prompt: "How would this work? Describe your proposed AI/ML approach.",
  },
  {
    step: 6,
    name: "User Value",
    title: "Define the User Value",
    prompt: "How would this make users' lives better? Quantify if you can.",
  },
  {
    step: 7,
    name: "Business Value",
    title: "Estimate the Business Value",
    prompt: "What's the business case? How does this help USPTO?",
  },
  {
    step: 8,
    name: "Strategic Alignment",
    title: "Align with USPTO Goals",
    prompt: "Does this align with USPTO's strategic priorities? Which ones?",
  },
  {
    step: 9,
    name: "Feasibility & Security",
    title: "Assess Feasibility & Security",
    prompt: "Is this idea feasible? Consider technical, security, and resource realities.",
  },
  {
    step: 10,
    name: "Outcome Measurements",
    title: "Define Success Metrics",
    prompt: "How will we know this worked? Define measurable success.",
  },
  {
    step: 11,
    name: "Review & Submit",
    title: "Review & Submit for Vetting",
    prompt: "Review your idea before submitting it for vetting.",
  },
  {
    step: 12,
    name: "Submission Complete",
    title: "Idea Submitted for Vetting",
    prompt: "Your idea has been submitted and will be vetted by the review team.",
  },
]
