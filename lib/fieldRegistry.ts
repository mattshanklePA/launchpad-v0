// Field registry — the single source of truth for which form fields can be
// turned on or off via the admin Form Configuration tab. Each entry carries
// the metadata the admin UI needs to render a sensible toggle row, plus a
// `locked` flag for fields that the system requires (would break the AI
// assessment) or compliance requires (DoC-mandated AI risk questions).
//
// If you add a new field to FormData in lib/steps.ts, add it here too.
// Otherwise it'll be invisible to the toggle UI and stuck always-on.

import type { FormData } from "@/lib/steps"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { tenantHasBureauTier } from "@/lib/rationalization"

const ASSISTANT_NAME = getTenant().assistantName

// Field-authority cascade (DoC field-config cascade, issue #57): OMB mandates
// a prescriptive field set every bureau must collect, the Department (Office
// of the Secretary) adds its own mandatory fields on top, and a bureau may
// add its own optional fields — but a bureau can never remove what OMB or the
// Department mandated. `level` defaults to "bureau" when omitted (see
// `fieldLevel`), so every pre-existing entry below is unchanged unless
// explicitly marked otherwise. Only meaningful for tenants with a bureau tier
// (DoC) — `fieldsForBureau`/`canToggleField` no-op the cascade for USPTO/DoW
// (see `tenantHasBureauTier` in lib/rationalization.ts), so their field set
// and toggle behavior render exactly as today.
export type FieldLevel = "omb" | "department" | "bureau"

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
  // Who mandated this field: "omb" (federal inventory mandate) or
  // "department" (DoC/Office of the Secretary mandate) are mandatory for
  // every bureau and can never be toggled off, regardless of `locked`. Absent
  // (or "bureau") is the default — an ordinary field a bureau (or the
  // department) may freely toggle. See `fieldLevel`.
  level?: FieldLevel
  // Restricts a `level: "bureau"` field to one bureau's business_unit (e.g.
  // "census") — an optional field a bureau added for itself that never
  // appears for, or is togglable by, another bureau. Absent means the field
  // is in the general optional pool available to every bureau (today's
  // behavior). Meaningless at "omb"/"department" level (those already apply
  // to every bureau).
  businessUnit?: string
  // True if the field cannot be turned off. Either core to the AI assessment,
  // required for compliance (DoC AI risk mandate), or — combined with
  // `level: "omb"`/`"department"` — mandated by that authority for every
  // bureau.
  locked: boolean
  // Human-readable reason for the lock — shown in the UI next to the lock icon.
  lockedReason?: string
  // True if this field feeds the OMB federal AI use case inventory (M-25-21
  // companion guidance). Surfaces an "OMB" badge next to the field in the wizard.
  omb?: boolean
  // Conditional disclosure (issue #60): whether this field should render at
  // all for the submission in progress, given everything answered so far —
  // on top of (not instead of) the cascade (`fieldsForBureau`) and the
  // admin on/off toggle (`isFieldEnabled`). Absent means "always show once
  // enabled" (today's behavior for every pre-existing field). Only gates
  // *visibility*; it never changes whether a field is mandatory-when-shown.
  // The single resolver that combines all three checks is `isFieldVisible`
  // in lib/formConfig.ts — the wizard and lib/submissionReadiness.ts both
  // call through it so a hidden field is never demanded at submit time.
  showWhen?: (formData: FormData) => boolean
}

/** `field.level`, defaulting to "bureau" when unset — the single place that resolves the default. */
export function fieldLevel(field: FieldDefinition): FieldLevel {
  return field.level ?? "bureau"
}

// Shared `showWhen` predicates for the OMB inventory's conditional-disclosure
// rules (docs/omb-2025-inventory-fields.md's "Required when" column) — kept
// as named functions so the same gate is never hand-duplicated (and drifted)
// across fields that share it.
const stageAtOrPastPreDeployment = (fd: FormData) =>
  fd.stageOfDevelopment === "pre_deployment" || fd.stageOfDevelopment === "pilot" || fd.stageOfDevelopment === "deployed"
const stagePilotOrDeployed = (fd: FormData) => fd.stageOfDevelopment === "pilot" || fd.stageOfDevelopment === "deployed"
const highImpactAndDeployed = (fd: FormData) => fd.highImpact === "high_impact" && fd.stageOfDevelopment === "deployed"

// Single flat list. Grouping is computed at render time so admin UI changes
// don't require reshuffling the registry.
export const FIELD_REGISTRY: FieldDefinition[] = [
  // ────── Federal AI use case inventory (OMB) — Phase 4 / Feasibility ──────
  //
  // level: "omb" — OMB M-25-21's companion reporting guidance mandates these
  // fields for every bureau's AI use case inventory entry. `locked` stays
  // `false`: the cascade (`fieldsForBureau`/`canToggleField`/`isFieldEnabled`
  // in lib/formConfig.ts) only treats "omb"/"department" level as
  // non-removable for tenants with a bureau tier (DoC) — see
  // `tenantHasBureauTier`. USPTO/DoW have no bureau tier, so these OMB
  // inventory fields stay exactly what they were before issue #57: optional,
  // bureau-admin-togglable fields. Hard-coding `locked: true` here would wrongly
  // lock them for USPTO/DoW too, since this registry is shared across tenants.
  //
  // Reconciled against docs/omb-2025-inventory-fields.md — OMB's published
  // data dictionary, 34 fields (25 base + 9 high-impact-only). `id`,
  // `use_case_name`, `agency_bureau`, `contact_email`, and `is_withheld`
  // (#1-5) already have stand-ins collected elsewhere in the wizard
  // (`useCaseTitle`, `submitterOffice`, `submitterEmail`, `isWithheld`)
  // and aren't re-declared here. `#N` comments below refer to that doc's row
  // numbers.
  {
    fieldKey: "stageOfDevelopment",
    label: "Stage of Development",
    description: "Pre-deployment, pilot, deployed, or retired — the OMB inventory maturity stage.",
    reasonToInclude: "Required field in the OMB AI use case inventory; determines which reporting fields apply.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  {
    fieldKey: "highImpact",
    label: "High-impact AI?",
    description:
      "High-impact / presumed high-impact but determined not / not high-impact — OMB's three-way high-impact determination (M-25-21).",
    reasonToInclude: "Required in the OMB inventory; high-impact use cases trigger additional risk-management reporting.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  {
    fieldKey: "highImpactJustification",
    label: "High-impact justification",
    description: "Justification for why a presumed high-impact use case was determined not to be high-impact.",
    reasonToInclude: "OMB inventory field #8 — required whenever the high-impact answer is 'presumed but determined not'.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: (fd) => fd.highImpact === "presumed_not_high_impact",
  },
  {
    fieldKey: "topicArea",
    label: "Use Case Topic Area",
    description: "The OMB topic-area category this AI use case falls under.",
    reasonToInclude: "OMB inventory field #9 — required once a development stage is set.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stageAtOrPastPreDeployment,
  },
  {
    fieldKey: "aiClassification",
    label: "AI Classification",
    description: "The type of AI/ML technique this use case employs (agentic, generative, computer vision, etc.).",
    reasonToInclude: "OMB inventory field #10 — required once a development stage is set.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stageAtOrPastPreDeployment,
  },
  // ────── NIST AI RMF gap fields (docs/nist-rmf-mapping.md §8, Roadmap #22
  // story 4) — the DoC AI Use Case Tracker has no existing signal for these
  // two Map-function checks, unlike every OMB field above. `level:
  // "department"` (not "omb") since they're a LaunchPad/RMF addition, not one
  // of OMB's 34 — mandatory once shown, mirroring the DoC AI-risk-management
  // fields below. Gated on the tenant's `rmf` feature flag in `showWhen` so
  // USPTO/DoW (no RMF framing) never see them, on top of the same
  // stage-is-set gate `topicArea`/`aiClassification` use. ──────
  {
    fieldKey: "disseminatesToPublic",
    label: "Disseminates information to the public?",
    description: "Whether the AI system's output is disseminated to the public as part of its function.",
    reasonToInclude: "Closes a NIST AI RMF Map-function gap (docs/nist-rmf-mapping.md §8) — the DoC tracker has no other signal for this.",
    phase: 4,
    step: 16,
    level: "department",
    locked: true,
    lockedReason: "NIST AI RMF-mandated Map-function question — required for RMF governance, mandatory for every bureau.",
    showWhen: (fd) => stageAtOrPastPreDeployment(fd) && !!getTenant().features.rmf,
  },
  {
    fieldKey: "scalable",
    label: "Scalable beyond current deployment?",
    description: "Whether this use case is intended to scale beyond its current pilot/deployment footprint.",
    reasonToInclude: "Closes a NIST AI RMF Map-function gap (docs/nist-rmf-mapping.md §8) — the DoC tracker has no other signal for this.",
    phase: 4,
    step: 16,
    level: "department",
    locked: true,
    lockedReason: "NIST AI RMF-mandated Map-function question — required for RMF governance, mandatory for every bureau.",
    showWhen: (fd) => stageAtOrPastPreDeployment(fd) && !!getTenant().features.rmf,
  },
  {
    fieldKey: "hasATO",
    label: "Associated ATO?",
    description: "Whether the AI system has an Authorization to Operate.",
    reasonToInclude: "OMB inventory field #17; signals the security authorization status of the AI system.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    // ATO is only meaningful once the system is running somewhere other than
    // a lab — pre-deployment ideas have nothing to authorize yet.
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "atoSystemName",
    label: "ATO system name",
    description: "The authorized system's name, if the AI use case has an ATO.",
    reasonToInclude: "OMB inventory sub-field for field #18 — only meaningful once an ATO exists.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: (fd) => fd.hasATO === "yes" && stagePilotOrDeployed(fd),
  },
  {
    fieldKey: "systemSource",
    label: "Built in-house, under contract, or purchased?",
    description: "Whether the system was developed in-house, under contract, or purchased from a vendor.",
    reasonToInclude: "OMB inventory field #15; also informs acquisition and the custom-code / IP posture.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "systemSourceVendorName",
    label: "Vendor name",
    description: "The vendor's name, if the system was purchased or developed under contract.",
    reasonToInclude: "OMB inventory sub-field for field #16 — only meaningful once a vendor/contractor is involved.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: (fd) => (fd.systemSource === "contract" || fd.systemSource === "vendor") && stagePilotOrDeployed(fd),
  },
  {
    fieldKey: "operationalDate",
    label: "Operational / pilot start date",
    description: "Date the AI use case became operational, or the pilot's start date.",
    reasonToInclude: "OMB inventory field #14.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "trainingDataDescription",
    label: "Training / evaluation data",
    description: "Description of the data used to train, fine-tune, and/or evaluate the model(s) used in this use case.",
    reasonToInclude: "OMB inventory field #19.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "federalDataCatalogLink",
    label: "Federal Data Catalog entry",
    description: "Link to the Federal Data Catalog entry, if the training/eval data is publicly disclosed as an open government data asset.",
    reasonToInclude: "OMB inventory field #20. Optional — never required.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  {
    fieldKey: "hasPii",
    label: "Involves PII maintained by the agency?",
    description: "Whether the AI use case involves personally identifiable information the agency maintains.",
    reasonToInclude:
      "OMB inventory field #21 — a distinct federal mandate from the Department's own PII/sensitive-data question below; both are kept.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "piaLink",
    label: "Privacy Impact Assessment (PIA) link",
    description: "Link to the AI use case's associated Privacy Impact Assessment, if publicly available.",
    reasonToInclude: "OMB inventory field #22. Optional — never required.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  {
    fieldKey: "demographicFeatures",
    label: "Demographic variables used as model features",
    description: "Which demographic variables (if any) are used as features by the model(s).",
    reasonToInclude: "OMB inventory field #23 — select all that apply.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "customCode",
    label: "Includes custom-developed code?",
    description: "Whether this project includes custom-developed code.",
    reasonToInclude: "OMB inventory field #24.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: stagePilotOrDeployed,
  },
  {
    fieldKey: "openSourceCodeLink",
    label: "Open source code link",
    description: "Link to the publicly available source code, if the custom-developed code is open source.",
    reasonToInclude: "OMB inventory sub-field for field #25 — only meaningful once custom code exists. Optional — never required.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: (fd) => fd.customCode === "yes",
  },
  {
    fieldKey: "nationalSecuritySystem",
    label: "National Security System / IC use?",
    description: "Whether this is a National Security System or Intelligence Community use of AI.",
    reasonToInclude: "OMB inventory field; NSS/IC uses are excluded from the public OMB AI use case inventory.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  {
    fieldKey: "researchOnly",
    label: "Research-only use?",
    description: "Whether this AI use is limited to research, not an operational mission, service, or decision.",
    reasonToInclude:
      "OMB inventory field; research-only uses are excluded unless they control or significantly influence a decision about individuals.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  {
    fieldKey: "highImpactFactors",
    label: "High-impact factors",
    description: "Which OMB M-25-21 Section 5 categories (rights, safety, benefits access, resource allocation, enforcement) the AI output could meaningfully affect.",
    reasonToInclude: "Drives the rule-based high-impact recommendation (lib/highImpactDetermination.ts) instead of relying on a bare self-reported flag.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
  },
  // ────── High-impact risk-management fields (#26-34, issue #60: only
  // surfaced once highImpact = "high_impact" AND the system is fully
  // deployed — a pre-deployment or pilot high-impact idea has nothing to
  // assess/monitor/appeal yet). Every multiple-choice field here also
  // permits "In-progress" and a CAIO-waiver answer, not just Yes/No. ──────
  {
    fieldKey: "preDeploymentTesting",
    label: "Pre-deployment / real-world testing done?",
    description: "Whether the AI system was tested before deployment, including real-world/live-environment testing.",
    reasonToInclude: "OMB inventory field #26 — M-25-21 minimum practice for high-impact AI.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "aiImpactAssessmentCompleted",
    label: "AI impact assessment completed?",
    description: "Whether an AI impact assessment has been completed for this use case.",
    reasonToInclude: "OMB inventory field #27 — M-25-21 minimum practice for high-impact AI.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "aiImpactAssessment",
    label: "Potential impacts and how they were identified",
    description: "Intended purpose, expected benefits, and potential risks of the AI system.",
    reasonToInclude: "OMB inventory field #28 — M-25-21 minimum practice for high-impact AI: an impact assessment before deployment.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "independentReviewConducted",
    label: "Independent review conducted?",
    description: "Whether an independent review of the AI use case has been conducted.",
    reasonToInclude: "OMB inventory field #29 — M-25-21 minimum practice for high-impact AI.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "ongoingMonitoringPlan",
    label: "Ongoing monitoring plan?",
    description: "Whether there's a plan to monitor the AI system's performance after deployment.",
    reasonToInclude: "OMB inventory field #30 — M-25-21 minimum practice for high-impact AI: ongoing monitoring.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "operatorTrainingEstablished",
    label: "Periodic operator training established?",
    description: "Whether the agency has established sufficient and periodic training for operators of the AI to interpret and act on its output and manage associated risks.",
    reasonToInclude: "OMB inventory field #31 — M-25-21 minimum practice for high-impact AI.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "failSafeMechanism",
    label: "Appropriate fail-safe in place?",
    description: "Whether the AI use case has an appropriate fail-safe that minimizes the risk of significant harm.",
    reasonToInclude: "OMB inventory field #32 — M-25-21 minimum practice for high-impact AI.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "humanOversightAppeal",
    label: "Established appeal process?",
    description: "Whether affected individuals have an established appeal process available.",
    reasonToInclude: "OMB inventory field #33 — M-25-21 minimum practice for high-impact AI: an appeal path for affected individuals.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
  },
  {
    fieldKey: "publicConsultationSteps",
    label: "Steps taken to consult end users and the public",
    description: "Which steps were taken to consult end users and the public on this AI use case.",
    reasonToInclude: "OMB inventory field #34 — M-25-21 minimum practice for high-impact AI. Select all that apply.",
    phase: 4,
    step: 16,
    level: "omb",
    locked: false,
    omb: true,
    showWhen: highImpactAndDeployed,
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
    fieldKey: "submitterSubOffice",
    label: "Office",
    description: "Office sub-level under the submitter's bureau, for tenants/bureaus that define one (e.g. DoC Census -> Decennial).",
    reasonToInclude:
      "Routes the idea to the correct office-scoped reviewer and enables office-level roll-up when a bureau has offices.",
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
    step: 5,
    locked: true,
    lockedReason: "Required — the AI assessment and Decision Center both key off this field.",
  },
  {
    fieldKey: "useCaseDescription",
    label: "Idea Description",
    description: "1-3 sentence narrative explanation of the idea.",
    reasonToInclude:
      `Gives ${ASSISTANT_NAME} enough context to coach the submitter through subsequent steps without inventing details.`,
    phase: 5,
    step: 5,
    locked: true,
    lockedReason: `Required — ${ASSISTANT_NAME} uses this as the seed context for every step's coaching.`,
  },
  {
    fieldKey: "isWithheld",
    label: "Withhold from Public Reporting?",
    description:
      "OMB's four-way is_withheld reason: No / Yes - risk to disclosure (FOIA-protected interest) / Yes - disclosure prohibited by law / Other.",
    reasonToInclude:
      "Flags submissions that need restricted handling, prevents them from appearing in public-facing exports, and captures the reason the OMB inventory export requires.",
    phase: 5,
    step: 5,
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
      `Holds ${ASSISTANT_NAME}'s drafted summary — locked on so the AI output always has a field to land in.`,
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
    lockedReason: `Required — ${ASSISTANT_NAME}'s assessment and the Decision Center both depend on this field.`,
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
      `Holds ${ASSISTANT_NAME}'s drafted summary — locked on so the AI output always has a field to land in.`,
  },

  // Step 5: Value (merged user + business)
  {
    fieldKey: "userValue",
    label: "Value to Users",
    description: "Free-text description of how this benefits the end user.",
    reasonToInclude: "Articulates the user-facing benefit separate from the business case.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "userTimeSavings",
    label: "Expected User Time Savings",
    description: "Range: <1, 1-5, 5-10, 10+ hours per week.",
    reasonToInclude:
      "Quantifies the user benefit. Pairs with impacted-users-count to project agency-level hour savings.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "otherUserImprovements",
    label: "Other Measurable Improvements",
    description: "Multi-select tags: faster processing, better accuracy, reduced frustration, etc.",
    reasonToInclude: "Captures non-time-savings benefits that still matter to user experience.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "userValueSummary",
    label: "Refined User Value Summary",
    description: "AI-generated summary of user-facing value.",
    reasonToInclude:
      "Executive-ready quote for the value section. Editable after generation.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "businessValue",
    label: "Value to the Business",
    description: "Free-text business case — agency-level impact.",
    reasonToInclude:
      "The business-case framing that leadership reads first. Anchor for ROI estimates and strategic alignment.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "costSavings",
    label: "Estimated Cost / Time Savings",
    description: "Range: <$50K, $50K-$250K, $250K-$1M, $1M+.",
    reasonToInclude:
      "Order-of-magnitude $ figure that lets reviewers triage by ROI. Surfaces in the Decision Center prominently.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "strategicBenefit",
    label: "Strategic Benefit Tags",
    description: "Multi-select tags for what high-level outcomes this drives.",
    reasonToInclude: "Lets analytics roll up portfolio-level themes across the submission pool.",
    phase: 3,
    step: 3,
    locked: false,
  },
  {
    fieldKey: "businessValueSummary",
    label: "Refined Business Value Summary",
    description: "AI-generated 2-3 sentence executive summary of business value.",
    reasonToInclude:
      "The most-quoted field from a submission. Goes directly into the exec summary briefing.",
    phase: 3,
    step: 3,
    locked: true,
    lockedReason:
      `Holds ${ASSISTANT_NAME}'s drafted summary — locked on so the AI output always has a field to land in.`,
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
    // Strategic Alignment is no longer part of idea intake (issue #162) —
    // filled during vetting. Sentinel step (outside the wizard's 1-7 range)
    // so isStepEnabled never keys the intake "Summary" step (which reuses
    // step 5) off whether these vetting-only fields are toggled on.
    step: 15,
    locked: false,
  },
  {
    fieldKey: "relevantOkrs",
    label: "Relevant OKRs / Alignment Text",
    description: "Free-text naming specific OKRs or strategic objectives this advances.",
    reasonToInclude:
      "Detailed alignment language reviewers can quote when justifying funding decisions.",
    phase: 4,
    step: 15,
    locked: false,
  },
  {
    fieldKey: "alignmentSummary",
    label: "Refined Alignment Summary",
    description: "AI-generated executive summary of strategic alignment.",
    reasonToInclude: "Clean exec-ready quote for the strategic section of the readiness brief.",
    phase: 4,
    step: 15,
    locked: true,
    lockedReason:
      `Holds ${ASSISTANT_NAME}'s drafted summary — locked on so the AI output always has a field to land in.`,
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
    step: 16,
    locked: false,
  },
  {
    fieldKey: "dependencies",
    label: "Dependencies / Constraints",
    description: "Free-text dependencies, blockers, integration requirements.",
    reasonToInclude:
      "The honest-risks field. Without it, reviewers can't assess realistic feasibility.",
    phase: 4,
    // Idea intake's "Technical Constraints" step (issue #162) — the one
    // field kept from the old Feasibility & Security block, renumbered out
    // of the step:16 governance sentinel below so isStepEnabled/wizard nav
    // gate correctly on it instead of on fields that no longer render here.
    step: 4,
    locked: false,
  },
  {
    fieldKey: "involvesSensitiveData",
    label: "Uses PII / Sensitive Data",
    description: "Yes / No — does this idea use or expose PII or other sensitive data?",
    reasonToInclude:
      "Required for federal AI risk management per Department of Commerce mandate.",
    phase: 4,
    step: 16,
    level: "department",
    locked: true,
    lockedReason: "DoC-mandated AI risk question — required for federal compliance, mandatory for every bureau.",
  },
  {
    fieldKey: "securityClassification",
    label: "Security Classification",
    description: "Internal / External / Controlled — only shown if sensitive data answer is Yes.",
    reasonToInclude:
      "Determines handling controls when PII or sensitive data is involved.",
    phase: 4,
    step: 16,
    locked: false,
  },
  {
    fieldKey: "accessControlRequirements",
    label: "Access Control Requirements",
    description: "Tags: role-based, MFA, FedRAMP — only shown if sensitive data answer is Yes.",
    reasonToInclude: "Catalogs the security controls required to safely operate this AI use case.",
    phase: 4,
    step: 16,
    locked: false,
    // Dependent sub-field (issue #60): meaningless without PII/sensitive data
    // in play.
    showWhen: (fd) => fd.involvesSensitiveData === "yes",
  },
  {
    fieldKey: "aiDecisionalImpact",
    label: "AI Drives Decisions About People",
    description: "Yes / No — does the AI output drive a decision affecting an applicant or employee?",
    reasonToInclude:
      "Required for federal AI risk management. Decisional AI requires enhanced human-review controls per DoC mandate.",
    phase: 4,
    step: 16,
    level: "department",
    locked: true,
    lockedReason: "DoC-mandated AI risk question — required for federal compliance, mandatory for every bureau.",
  },
  {
    fieldKey: "aiModelSourcing",
    label: "AI Model Sourcing",
    description: "American-built / Open-source U.S.-hosted / Foreign / Unknown.",
    reasonToInclude:
      "Required by the current Executive Order on federal AI — foreign sourcing requires additional review.",
    phase: 4,
    step: 16,
    level: "department",
    locked: true,
    lockedReason: "Required per Executive Order on federal AI sourcing, applied Department-wide — mandatory for every bureau.",
  },
  {
    fieldKey: "aiHumanReview",
    label: "Mandatory Human Review",
    description: "Yes / No — is human review mandatory before the AI output drives action?",
    reasonToInclude:
      "Required for federal AI risk management. Human-in-the-loop status determines downstream control requirements.",
    phase: 4,
    step: 16,
    level: "department",
    locked: true,
    lockedReason: "DoC-mandated AI risk question — required for federal compliance, mandatory for every bureau.",
  },
  {
    fieldKey: "feasibilitySummary",
    label: "Refined Feasibility Summary",
    description: "AI-generated summary of feasibility and security considerations.",
    reasonToInclude:
      "Compact exec-ready summary covering implementation feasibility, security posture, and risk profile.",
    phase: 4,
    step: 16,
    locked: true,
    lockedReason:
      `Holds ${ASSISTANT_NAME}'s drafted summary — locked on so the AI output always has a field to land in.`,
  },

  // Step 8: Success Metrics
  {
    fieldKey: "successMetrics",
    label: "Success Metrics Description",
    description: "Free-text description of how success will be measured.",
    reasonToInclude:
      "Forces explicit measurement thinking — without this, ROI claims are unverifiable.",
    phase: 4,
    step: 17,
    locked: false,
  },
  {
    fieldKey: "keyMetrics",
    label: "Key Metrics Tags",
    description: "Multi-select tags for measurable outcome categories.",
    reasonToInclude: "Lets the metrics roll up to portfolio-level views (how many projects target which outcomes).",
    phase: 4,
    step: 17,
    locked: false,
  },
  {
    fieldKey: "timelineForResults",
    label: "Timeline for Results",
    description: "Range: <3, 3-6, 6-12, 12+ months.",
    reasonToInclude: "Sets reviewer expectations and helps prioritize quick wins vs. long bets.",
    phase: 4,
    step: 17,
    locked: false,
  },
  {
    fieldKey: "metricsSummary",
    label: "Refined Metrics Summary",
    description: "AI-generated executive summary of success metrics and timeline.",
    reasonToInclude:
      "Exec-ready summary used in the readiness briefing and Decision Center comparison.",
    phase: 4,
    step: 17,
    locked: true,
    lockedReason:
      `Holds ${ASSISTANT_NAME}'s drafted summary — locked on so the AI output always has a field to land in.`,
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

// ─── Field-authority cascade (OMB → Department → Bureau, issue #57) ────────
//
// The single place that resolves "which fields apply to this bureau" — the
// wizard (via `isFieldEnabled`/`useFieldVisibility` in lib/formConfig.ts) and
// the admin toggle UI (`components/admin/form-config-panel.tsx`) both filter
// through this function so they can never drift apart.

/**
 * Fields in scope for `businessUnit`: every OMB- and department-level field
 * (mandatory for every bureau), plus the general bureau-level optional pool
 * (no `businessUnit` restriction — today's shared toggle set), plus any
 * field scoped specifically to `businessUnit`. Never includes another
 * bureau's scoped field.
 *
 * No-op for tenants without a bureau tier (USPTO/DoW): returns the full
 * registry unfiltered, so their field set renders exactly as today — see
 * `tenantHasBureauTier` (lib/rationalization.ts), the same DoC-only signal
 * the rationalization/bureau-signoff features gate on.
 */
export function fieldsForBureau(
  businessUnit?: string | null,
  tenant: TenantConfig = getTenant(),
): FieldDefinition[] {
  if (!tenantHasBureauTier(tenant)) return FIELD_REGISTRY
  return FIELD_REGISTRY.filter((f) => {
    const level = fieldLevel(f)
    if (level === "omb" || level === "department") return true
    if (!f.businessUnit) return true
    return f.businessUnit === businessUnit
  })
}

/** Shape callers pass in for cascade permission checks — a subset of `Session`/`Viewer`. */
export type FieldViewer = { role: string; businessUnit?: string | null } | null | undefined

/**
 * True for a viewer with department-wide reach: an OS admin
 * (`businessUnit === "os"`) or a department-level viewer with no bureau
 * assignment — the same shape `hasDepartmentTransparency` (lib/bureauSignoff.ts)
 * and the roll-up gate in `visibleSubmissions` (lib/reviewWorkflow.ts) use.
 */
export function isDepartmentLevelViewer(viewer: FieldViewer): boolean {
  if (!viewer) return false
  return !viewer.businessUnit || viewer.businessUnit === "os"
}

/**
 * True when `viewer` may toggle `field` on/off. `mandatory` is the current
 * admin-set override (`FormConfig.mandatory[field.fieldKey]`, see
 * lib/formConfig.ts) for bureau-level fields an OS/department admin has
 * promoted to mandatory-for-all — pass it when known so a bureau admin can't
 * un-toggle a field the department just mandated.
 *
 * - `locked` fields: never togglable by anyone (unchanged from today).
 * - No bureau tier (USPTO/DoW): `level` is ignored entirely — togglable by
 *   any admin, exactly today's behavior.
 * - `level: "omb"` / `"department"` (bureau-tier tenants only): never
 *   togglable by anyone — mandatory and non-removable for every bureau, per
 *   the cascade.
 * - `level: "bureau"` scoped to a `businessUnit`: togglable only by that
 *   bureau's viewer, or a department-level viewer.
 * - `level: "bureau"` unscoped (the general optional pool): togglable by any
 *   admin, matching today's behavior — unless a department admin has since
 *   marked it `mandatory`, in which case only a department-level viewer can
 *   un-mandate it.
 */
export function canToggleField(
  field: FieldDefinition,
  viewer: FieldViewer,
  opts: { mandatory?: boolean; tenant?: TenantConfig } = {},
): boolean {
  if (field.locked) return false
  const tenant = opts.tenant ?? getTenant()
  // Level-based mandate only applies where there's a bureau tier to cascade
  // to (DoC). USPTO/DoW have none, so an unlocked `level: "omb"` field (the
  // existing OMB inventory fields) stays a plain optional toggle for them —
  // exactly today's behavior — instead of becoming newly non-removable.
  if (!tenantHasBureauTier(tenant)) return true
  const level = fieldLevel(field)
  if (level === "omb" || level === "department") return false
  if (opts.mandatory) return isDepartmentLevelViewer(viewer)
  if (field.businessUnit) return isDepartmentLevelViewer(viewer) || viewer?.businessUnit === field.businessUnit
  return true
}

/**
 * True when `viewer` may promote `field` to "mandatory for all bureaus"
 * (`setFieldMandatory` in lib/formConfig.ts). Only a department-level viewer
 * can do this, only for an ordinary bureau-level, unlocked field — an
 * OMB/department field is already mandatory, and a locked field is already
 * non-togglable, so promoting either would be a no-op. No-op for tenants
 * without a bureau tier: "mandatory for all bureaus" is meaningless when
 * there's only one flat field set (USPTO/DoW).
 */
export function canMarkFieldMandatory(
  field: FieldDefinition,
  viewer: FieldViewer,
  tenant: TenantConfig = getTenant(),
): boolean {
  if (field.locked) return false
  if (fieldLevel(field) !== "bureau") return false
  if (!tenantHasBureauTier(tenant)) return false
  return isDepartmentLevelViewer(viewer)
}
