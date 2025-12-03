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

  // Step 4
  coreProblem: string
  problemImpact: string
  affectedSystem: "patents" | "trademarks" | "it_systems" | "cross_functional" | "other" | ""
  problemType: string[]
  severity: "low" | "medium" | "high" | ""

  // Step 5
  proposedSolution: string
  keyFunctionality: string[]

  // Step 6
  userValue: string
  userTimeSavings: "lt_1" | "1_5" | "5_10" | "gt_10" | ""
  otherUserImprovements: string[]

  // Step 7
  businessValue: string
  costSavings: "lt_50k" | "50k_250k" | "250k_1m" | "gt_1m" | ""
  strategicBenefit: string[]

  // Step 8
  usptoFocusArea: string[]
  relevantOkrs: string

  // Step 9
  implementationComplexity: "low" | "medium" | "high" | ""
  resourcesNeeded: string[]
  dependencies: string
  involvesSensitiveData: "yes" | "no" | ""
  securityClassification: "internal" | "external" | "controlled" | ""
  accessControlRequirements: string[]

  // Step 10
  successMetrics: string
  keyMetrics: string[]
  timelineForResults: "lt_3" | "3_6" | "6_12" | "gt_12" | ""

  // Step 11
  routeTo: string[]
  reviewerNotes: string
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
  coreProblem: "",
  problemImpact: "",
  affectedSystem: "",
  problemType: [],
  severity: "",
  proposedSolution: "",
  keyFunctionality: [],
  userValue: "",
  userTimeSavings: "",
  otherUserImprovements: [],
  businessValue: "",
  costSavings: "",
  strategicBenefit: [],
  usptoFocusArea: [],
  relevantOkrs: "",
  implementationComplexity: "",
  resourcesNeeded: [],
  dependencies: "",
  involvesSensitiveData: "",
  securityClassification: "",
  accessControlRequirements: [],
  successMetrics: "",
  keyMetrics: [],
  timelineForResults: "",
  routeTo: [],
  reviewerNotes: "",
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
    name: "Use Case Overview",
    title: "Use Case Overview",
    prompt: "Provide a title and description for your AI use case.",
  },
  {
    step: 3,
    name: "Target User",
    title: "Identify the Target User",
    prompt: "Who is the primary user or audience for this idea?",
  },
  {
    step: 4,
    name: "Problem Statement",
    title: "Define the Problem",
    prompt: "Describe the core problem or opportunity you’ve identified.",
  },
  {
    step: 5,
    name: "Proposed Solution",
    title: "Propose a Solution",
    prompt: "How do you envision solving this problem?",
  },
  {
    step: 6,
    name: "User Value",
    title: "Define the User Value",
    prompt: "How will this solution make life better for the end user?",
  },
  {
    step: 7,
    name: "Business Value",
    title: "Estimate the Business Value",
    prompt: "What is the expected impact for the USPTO?",
  },
  {
    step: 8,
    name: "Strategic Alignment",
    title: "Align with USPTO Goals",
    prompt: "How does this idea support USPTO’s strategic priorities?",
  },
  {
    step: 9,
    name: "Feasibility & Security",
    title: "Assess Feasibility & Security",
    prompt: "Consider the technical and security aspects of your proposal.",
  },
  {
    step: 10,
    name: "Outcome Measurements",
    title: "Define Success Metrics",
    prompt: "How will we know this initiative is successful?",
  },
  {
    step: 11,
    name: "Review & Submit",
    title: "Review & Submit",
    prompt: "Please review all your inputs before submitting.",
  },
  {
    step: 12,
    name: "Submission Complete",
    title: "Submission Received",
    prompt: "Thank you! Your use case has been submitted.",
  },
]
