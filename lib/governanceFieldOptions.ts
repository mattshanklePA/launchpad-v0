// Shared option lists for the OMB inventory / M-25-21 governance fields —
// used by the reviewer governance-capture panel (components/submissions/governance-capture-panel.tsx,
// issue #161) that fills these in during vetting. These fields are no longer
// collected in the submitter wizard itself (issue #162 moved them out of
// intake), but the shared option lists keep old and new consumers in sync.

export type FieldOption = { value: string; label: string }

export const YES_NO_OPTIONS: FieldOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]

// OMB inventory field #6.
export const STAGE_OF_DEVELOPMENT_OPTIONS: FieldOption[] = [
  { value: "pre_deployment", label: "Pre-deployment (development or acquisition)" },
  { value: "pilot", label: "Pilot (limited test)" },
  { value: "deployed", label: "Deployed / operational" },
  { value: "retired", label: "Retired" },
]

// OMB inventory field #7.
export const HIGH_IMPACT_OPTIONS: FieldOption[] = [
  { value: "high_impact", label: "High-impact" },
  { value: "presumed_not_high_impact", label: "Presumed high-impact, but determined not high-impact" },
  { value: "not_high_impact", label: "Not high-impact" },
]

// OMB inventory field #9.
export const TOPIC_AREA_OPTIONS: FieldOption[] = [
  { value: "administrative_functions", label: "Administrative Functions" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "emergency_management", label: "Emergency Management" },
  { value: "energy_environment", label: "Energy and the Environment" },
  { value: "government_benefits_processing", label: "Government Benefits Processing" },
  { value: "health_medical", label: "Health and Medical" },
  { value: "human_resources", label: "Human Resources" },
  { value: "information_technology", label: "Information Technology" },
  { value: "international_affairs", label: "International Affairs" },
  { value: "law_enforcement", label: "Law Enforcement" },
  { value: "procurement_financial_management", label: "Procurement and Financial Management" },
  { value: "science", label: "Science" },
  { value: "service_delivery", label: "Service Delivery" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
]

// OMB inventory field #10.
export const AI_CLASSIFICATION_OPTIONS: FieldOption[] = [
  { value: "agentic_ai", label: "Agentic AI" },
  { value: "classical_predictive_ml", label: "Classical/Predictive Machine Learning" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "generative_ai", label: "Generative AI" },
  { value: "nlp", label: "Natural Language Processing" },
  { value: "reinforcement_learning", label: "Reinforcement Learning" },
]

// OMB inventory field #17.
export const HAS_ATO_OPTIONS: FieldOption[] = [
  { value: "yes", label: "Yes" },
  { value: "in_progress", label: "In progress" },
  { value: "no", label: "No" },
]

// OMB inventory field #15.
export const SYSTEM_SOURCE_OPTIONS: FieldOption[] = [
  { value: "in_house", label: "Developed in-house" },
  { value: "contract", label: "Developed under contract" },
  { value: "vendor", label: "Purchased from a vendor" },
]

// OMB inventory field #23.
export const DEMOGRAPHIC_FEATURE_OPTIONS: FieldOption[] = [
  { value: "race_ethnicity", label: "Race/Ethnicity" },
  { value: "sex", label: "Sex" },
  { value: "age", label: "Age" },
  { value: "religious_affiliation", label: "Religious Affiliation" },
  { value: "socioeconomic_status", label: "Socioeconomic Status" },
  { value: "ability_status", label: "Ability Status" },
  { value: "residency_status", label: "Residency Status" },
  { value: "marital_status", label: "Marital Status" },
  { value: "income", label: "Income" },
  { value: "employment_status", label: "Employment Status" },
  { value: "none", label: "None of the above" },
  { value: "other", label: "Other" },
]

// M-25-21 minimum-practice fields #26/27/30/31 share this yes/in-progress/waived shape.
export const MIN_PRACTICE_STATUS_OPTIONS: FieldOption[] = [
  { value: "yes", label: "Yes" },
  { value: "in_progress", label: "In-progress" },
  { value: "waived", label: "Agency CAIO has waived this minimum practice" },
]

// OMB inventory field #29.
export const INDEPENDENT_REVIEW_OPTIONS: FieldOption[] = [
  { value: "yes_other_office", label: "Yes — by another agency office/reviewer not involved in development" },
  { value: "yes_oversight_board", label: "Yes — by an agency AI oversight board" },
  { value: "yes_caio", label: "Yes — by the CAIO" },
  { value: "in_progress", label: "In-progress" },
  { value: "waived", label: "Agency CAIO has waived this minimum practice" },
]

// OMB inventory field #32.
export const FAILSAFE_OPTIONS: FieldOption[] = [
  { value: "yes", label: "Yes" },
  { value: "not_applicable", label: "Not applicable" },
  { value: "in_progress", label: "In-progress" },
  { value: "waived", label: "Agency CAIO has waived this minimum practice" },
]

// OMB inventory field #33.
export const APPEAL_OPTIONS: FieldOption[] = [
  { value: "yes", label: "Yes, appeal process established" },
  { value: "not_applicable", label: "Not applicable" },
  { value: "in_progress", label: "In-progress" },
  { value: "law_precludes", label: "Law/operational limits preclude appeal" },
  { value: "waived", label: "Agency CAIO has waived this minimum practice" },
]

// OMB inventory field #34.
export const PUBLIC_CONSULTATION_OPTIONS: FieldOption[] = [
  { value: "direct_usability_testing", label: "Direct usability testing" },
  { value: "general_solicitation", label: "General solicitations of public feedback/comments" },
  { value: "public_hearings", label: "Public hearings or meetings" },
  { value: "other", label: "Other" },
  { value: "in_progress", label: "In-progress" },
  { value: "waived", label: "Agency CAIO has waived this minimum practice" },
]
