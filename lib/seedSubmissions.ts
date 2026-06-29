// Demo seed submissions — pre-populates the Decision Center and Recent Drafts
// on first load so the demo to Ramesh + Scott Barker isn't an empty shell.
//
// Idempotent: only runs if no submissions exist AND the seed marker hasn't been
// set yet. Users can clear submissions normally (e.g. clearSubmissions()) and a
// fresh seed won't auto-rerun unless `SEED_MARKER` is also cleared.

import type { FormData } from "@/lib/steps"
import { initialFormData } from "@/lib/steps"
import { type Submission } from "@/lib/submissions"

const STORAGE_KEY = "launchpad-submissions"
const SEED_MARKER = "launchpad-seed-version"
const CURRENT_SEED_VERSION = "v2-2026-06-29"

function mk(partial: Partial<FormData>): FormData {
  return { ...initialFormData, ...partial }
}

// Five submissions across business units, readiness levels, and themes.
// All dates are recent enough to feel live but staggered for realism.
// Exported so the /api/seed route can read the same array used by the
// client-side localStorage fallback. Server-side seed is the canonical path
// now that data lives in Supabase; the localStorage helpers below are kept
// only as a last-resort fallback if the API is unreachable.
export const seedSubmissions: Submission[] = [
  // ── DEMO (Commerce / Doug Freeman): public-facing customer-experience pair. ──
  // A) Public-facing plain-language assistant — the demo centerpiece. Strong,
  //    customer-centered, responsible-AI by design; funded "with conditions"
  //    because it's public-facing (validate groundedness + 508 first).
  {
    id: "seed-cx-public-assistant",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // ~2 hours ago
    formData: mk({
      submitterName: "Renee Caldwell",
      submitterEmail: "renee.caldwell@uspto.gov",
      submitterRole: "product_owner",
      submitterOffice: "other",

      reviewStatus: "in_review",
      useCaseTitle: "Plain-Language Customer Assistant for Public Services",
      useCaseDescription:
        "A public-facing AI assistant that answers the public's and businesses' common questions and explains application status in plain language — 24/7, in multiple languages, with a citation to the official source behind every answer and a clean handoff to a person. It never determines eligibility or makes a decision about anyone; it helps people understand and navigate.",
      publicIndicator: "public",

      targetAudience: "applicant",
      impactedUsersCount: "gt_500",
      painPoints:
        "People navigating Commerce services can't get fast, clear answers. They wait days for email or sit in phone queues, the guidance they find is written in program jargon, and limited-English and assistive-technology users are underserved. The contact center is swamped with repetitive 'where is my application / what does this status mean / what do I do next' questions.",
      targetUserContext:
        "Members of the public and small businesses interacting with a public-facing Commerce service line, plus the contact-center staff who field their questions. Highest value for first-time applicants and limited-English speakers who don't know the terminology.",
      targetUserSummary:
        "The public and businesses using a Commerce public service — especially first-time and limited-English applicants — and the contact-center staff who support them.",

      coreProblem:
        "The public cannot get fast, plain-language answers about Commerce programs and the status of their applications. Existing self-service content is written for insiders, isn't available after hours or in multiple languages, and pushes avoidable volume into the phone and email queues.",
      problemImpact:
        "Repetitive, plain-language questions dominate contact-center volume; routine answers take days by email or long holds by phone. The burden falls hardest on first-time and limited-English customers, eroding trust and accessibility.",
      affectedSystem: "cross_functional",
      problemType: ["user_experience", "productivity"],
      severity: "high",
      problemDefinition:
        "Members of the public and businesses lack a fast, accessible, plain-language way to get answers and understand application status across Commerce public services, driving high contact-center volume and an uneven, often inaccessible customer experience.",

      proposedSolution:
        "A retrieval-grounded assistant that answers only from official, published Commerce content and cites the source for every answer, with plain-language rewriting and multilingual support. For status questions it reads from a scoped, authenticated status API — it never stores or decides anything. Low confidence or anything sensitive routes to a person. Every interaction is logged for oversight. The assistant is informational only; it never determines eligibility or issues a decision.",
      keyFunctionality: ["question_answering", "search", "summarization", "translation"],
      solutionSummary:
        "Source-grounded, plain-language, multilingual public assistant with a citation behind every answer, scoped status lookups, human handoff, and full interaction logging. Informational only — no decisions.",

      userValue:
        "Anyone can get a clear, correct answer in seconds, after hours, in their own language — and understand what their status means and what to do next — instead of waiting days or decoding jargon.",
      userTimeSavings: "1_5",
      otherUserImprovements: ["less_frustration", "better_decisions", "more_consistent_work"],
      userValueSummary:
        "Instant, plain-language, multilingual answers and status explanations, 24/7, with a human one click away.",

      businessValue:
        "Deflects a large share of repetitive contact-center volume to self-service, shortens response times, and raises trust and accessibility for the public — letting staff focus on the complex cases that actually need a person.",
      costSavings: "250k_1m",
      strategicBenefit: ["operational_efficiency", "employee_experience"],
      businessValueSummary:
        "Meaningful contact-center deflection and faster responses, with a more accessible, trustworthy customer experience as the headline outcome.",

      usptoFocusArea: ["goal_employee_experience", "goal_public_good", "ai_responsible_use"],
      relevantOkrs:
        "Customer-experience and digital-service goals: plain-language and accessibility commitments (21st Century IDEA Act / Section 508), responsible-AI use with human oversight, and bringing service improvements to the public.",
      alignmentSummary:
        "Advances customer experience and the public good, executed under responsible-AI guardrails (source-grounded, cited, human-in-the-loop). A human-centered, plain-language front door to Commerce services.",

      implementationComplexity: "medium",
      resourcesNeeded: ["ml_engineers", "content_owner", "infrastructure"],
      dependencies:
        "A clean, authoritative published-content corpus; a scoped, authenticated status API; plain-language and multilingual review; and Section 508 / accessibility validation. The model work is well understood — the real work is content quality, guardrails, and accessibility.",
      involvesSensitiveData: "yes",
      securityClassification: "controlled",
      accessControlRequirements: ["pii_protection", "audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "american_built",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Medium complexity. Public-facing means the bar is answer groundedness (no hallucinated guidance), Section 508 conformance, and multilingual accuracy — all validated in a measured pilot. Status lookups touch PII, so they run through a scoped, authenticated API with logging. American-built model, U.S.-hosted; informational only with mandatory human handoff.",

      successMetrics:
        "Self-service deflection rate, human-rated answer groundedness/accuracy (target: high, with zero un-cited guidance), customer satisfaction, time-to-answer, escalation rate, and language coverage — measured in a pilot against a control.",
      keyMetrics: ["user_satisfaction", "ticket_volume_reduction", "resolution_time", "adoption_rate"],
      timelineForResults: "6_12",
      metricsSummary:
        "Pilot measures deflection, answer groundedness, CSAT, time-to-answer, and language coverage against a control before scaling.",

      routeTo: ["governance"],
      reviewerNotes:
        "High-impact, public-facing CX play. Strong responsible-AI posture; the open item is a validated groundedness/accuracy baseline and 508 conformance before public exposure.",

      readinessScore: "ready",
      readinessSummary:
        "Comprehensive and clearly customer-centered, with a responsible-AI design (source-grounded, cited, human handoff, informational only). Because it is public-facing, fund it with one condition: validate answer groundedness, Section 508 conformance, and multilingual accuracy in the pilot before public exposure. Risk posture is otherwise sound.",
      executiveSummary:
        "Members of the public and businesses can't get fast, plain-language answers about Commerce services or what their application status means, which overloads the contact center and underserves first-time and limited-English customers. This public-facing assistant answers only from official content with a citation behind every answer, rewrites in plain language across multiple languages, reads status through a scoped authenticated API, and hands off to a person on anything sensitive or low-confidence — it never makes a decision about anyone. Expected outcome: meaningful contact-center deflection, faster responses, and a more accessible, trustworthy customer experience. It is American-built and U.S.-hosted, informational only, human-in-the-loop. Recommend funding with a pilot condition: validate answer groundedness, Section 508 conformance, and multilingual accuracy before public exposure.",
    } as Partial<FormData>),
  },

  // B) Internal agent copilot — the Decision Center comparison candidate.
  //    Same mission (better, faster, more consistent customer service), a
  //    different point in the workflow, and a lower-risk posture.
  {
    id: "seed-cx-agent-assist",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // ~5 hours ago
    formData: mk({
      submitterName: "Marcus Bell",
      submitterEmail: "marcus.bell@uspto.gov",
      submitterRole: "manager",
      submitterOffice: "other",

      reviewStatus: "submitted",
      useCaseTitle: "Contact-Center Response Assistant (Agent Copilot)",
      useCaseDescription:
        "An internal copilot that drafts a suggested reply for a customer-service representative to review, edit, and send. It pulls the right answer from the approved knowledge base with citations, never auto-sends, and is not public-facing.",
      publicIndicator: "public",

      targetAudience: "other",
      impactedUsersCount: "50_500",
      painPoints:
        "Representatives draft the same routine answers from scratch all day, answers vary in quality and consistency between staff, new reps take months to ramp, and response SLAs slip during peak periods.",
      targetUserContext:
        "Contact-center representatives who respond to public and business inquiries, and the supervisors who QA their responses. Indirect benefit to every member of the public waiting on a reply.",
      targetUserSummary:
        "Contact-center representatives and their supervisors; indirect benefit to the public awaiting responses.",

      coreProblem:
        "Representatives spend most of their time drafting repetitive responses by hand, with quality and consistency varying by individual, which slows responses and drives avoidable rework and escalations.",
      problemImpact:
        "Routine response drafting consumes the bulk of representative time; inconsistent answers generate rework and re-contacts, and SLAs slip when volume spikes.",
      affectedSystem: "cross_functional",
      problemType: ["productivity", "user_experience"],
      severity: "medium",
      problemDefinition:
        "Customer-service representatives lack a fast, consistent way to draft accurate responses to common inquiries, slowing response times and producing uneven answer quality across staff.",

      proposedSolution:
        "A copilot in the agent console that retrieves the right answer from the approved knowledge base and drafts a suggested, cited reply. The representative edits and approves every message before it is sent — the assistant never sends anything. Low-confidence drafts are flagged, and every suggestion and edit is logged.",
      keyFunctionality: ["question_answering", "summarization", "search"],
      solutionSummary:
        "Agent-console copilot that drafts cited replies from the approved knowledge base; the rep edits and approves every send. Internal only; fully logged.",

      userValue:
        "Representatives answer faster and more consistently, lean on a trusted source instead of memory, and ramp far quicker — with less repetitive drafting.",
      userTimeSavings: "5_10",
      otherUserImprovements: ["more_consistent_work", "less_frustration", "better_decisions"],
      userValueSummary:
        "Faster, more consistent responses and quicker onboarding for representatives; the rep stays the author and approver.",

      businessValue:
        "Increases response throughput, shortens response time, and improves answer consistency without putting AI in front of the public — a lower-risk first step that frees staff for complex cases.",
      costSavings: "250k_1m",
      strategicBenefit: ["operational_efficiency", "employee_experience"],
      businessValueSummary:
        "Higher throughput, faster and more consistent responses, and quicker rep onboarding — with a low-risk, human-approved posture.",

      usptoFocusArea: ["goal_employee_experience", "ai_responsible_use"],
      relevantOkrs:
        "Customer-service response-time and quality targets; responsible-AI use with mandatory human review; workforce enablement and faster onboarding.",
      alignmentSummary:
        "Improves customer experience indirectly through faster, more consistent staff responses, under a low-risk, human-approved design. Strong responsible-AI posture (internal, every send human-approved).",

      implementationComplexity: "low",
      resourcesNeeded: ["ml_engineers", "content_owner"],
      dependencies:
        "Access to the approved knowledge base and the agent console for integration. The main lift is knowledge-base curation, not modeling. A measured pilot baseline (handle time, consistency) is already available.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["employee_authentication", "audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "american_built",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Low complexity and low risk. Internal only, not public-facing; the representative approves every send; full audit logging. Knowledge-base curation is the main effort. American-built, U.S.-hosted, with a measured pilot baseline already collected.",

      successMetrics:
        "Average handle time, first-contact resolution, QA/consistency pass rate, percentage of responses using a suggested draft, and response-time SLA attainment — tracked against the current baseline.",
      keyMetrics: ["resolution_time", "productivity", "user_satisfaction", "adoption_rate"],
      timelineForResults: "3_6",
      metricsSummary:
        "Tracks handle time, first-contact resolution, consistency, and draft adoption against an existing pilot baseline.",

      routeTo: ["governance"],
      reviewerNotes:
        "Clean, low-risk operational case with a measured baseline and human approval on every send. Strong candidate to move first.",

      readinessScore: "ready",
      readinessSummary:
        "Low-risk, well-scoped, and measurable: internal only, human-approved on every send, full logging, American-built, with a pilot baseline already collected. Ready to fund.",
      executiveSummary:
        "Customer-service representatives draft the same routine replies by hand all day, with quality varying by person and SLAs slipping at peak. This internal copilot drafts a cited reply from the approved knowledge base for the representative to edit and approve — it never sends on its own and is not public-facing. Expected outcome: faster, more consistent responses and quicker onboarding, freeing staff for complex cases. Low complexity, low risk: human-approved on every send, fully logged, American-built and U.S.-hosted, with a measured pilot baseline already in hand. Ready to fund.",
    } as Partial<FormData>),
  },

  // ── Submitter-owned records (submitter@uspto.gov) — populate "My ideas" with
  //    a spread across statuses, including a completed (approved) example. ──
  {
    id: "seed-sub-tm-status",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // ~3 days ago
    formData: mk({
      submitterName: "USPTO Submitter",
      submitterEmail: "submitter@uspto.gov",
      submitterRole: "product_owner",
      submitterOffice: "trademarks",

      reviewStatus: "approved",
      useCaseTitle: "Trademark Application Status Assistant",
      useCaseDescription:
        "A plain-language assistant that lets trademark applicants ask where their application stands and what the current status means — answered from authoritative TSDR status data with a citation and a clear next step. Informational only; it never changes or decides anything.",
      publicIndicator: "public",

      targetAudience: "applicant",
      impactedUsersCount: "gt_500",
      painPoints:
        "Applicants flood the Trademark Assistance Center with 'where is my application / what does this status mean' questions, and the status language is full of internal codes the public can't interpret.",
      targetUserContext:
        "Trademark applicants and their representatives checking on pending applications, plus the Assistance Center staff who field status questions.",
      targetUserSummary:
        "Trademark applicants and representatives checking status; indirectly, the Assistance Center staff who field those calls.",

      coreProblem:
        "Applicants can't easily understand the status of their trademark application or what to do next, so they generate high call volume on routine status questions.",
      problemImpact:
        "A large share of Assistance Center contacts are routine status questions a plain-language, self-service answer could deflect.",
      affectedSystem: "trademarks",
      problemType: ["user_experience", "productivity"],
      severity: "medium",
      problemDefinition:
        "Trademark applicants lack a plain-language, self-service way to understand application status and next steps, driving avoidable contact-center volume.",

      proposedSolution:
        "An assistant that reads status from authoritative TSDR data and explains it in plain language with a citation and a next step. It never changes or decides anything and hands off to a person for anything beyond status.",
      keyFunctionality: ["question_answering", "summarization", "search"],
      solutionSummary:
        "Plain-language, source-grounded trademark status explainer with citations and human handoff. Informational only.",

      userValue:
        "Applicants understand exactly where they stand and what to do next, in seconds, without waiting on a call.",
      userTimeSavings: "1_5",
      otherUserImprovements: ["less_frustration", "better_decisions"],
      userValueSummary: "Instant, plain-language status and next-step guidance for applicants.",

      businessValue:
        "Deflects routine status contacts from the Assistance Center and improves the applicant experience.",
      costSavings: "50k_250k",
      strategicBenefit: ["operational_efficiency", "employee_experience"],
      businessValueSummary: "Meaningful deflection of routine status contacts with a better applicant experience.",

      usptoFocusArea: ["goal_employee_experience", "goal_public_good"],
      relevantOkrs: "Customer-experience and plain-language commitments; reduce routine contact volume.",
      alignmentSummary:
        "Advances customer experience and the public good with a low-risk, informational, source-grounded design.",

      implementationComplexity: "low",
      resourcesNeeded: ["ml_engineers", "content_owner"],
      dependencies:
        "Read access to TSDR status data and the published status-code glossary. Low modeling lift; the main work is plain-language mapping and Section 508 accessibility.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "american_built",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Low complexity, low risk: reads existing status data, informational only, human handoff, American-built. Section 508 and plain-language review are the main work.",

      successMetrics:
        "Status-contact deflection rate, applicant satisfaction, answer accuracy, and time-to-answer measured against a baseline.",
      keyMetrics: ["ticket_volume_reduction", "user_satisfaction", "resolution_time"],
      timelineForResults: "3_6",
      metricsSummary: "Tracks deflection, satisfaction, accuracy, and time-to-answer against a baseline.",

      routeTo: ["governance"],
      reviewerNotes: "Approved: low-risk, high-value CX improvement with a clean responsible-AI posture.",

      readinessScore: "ready",
      readinessSummary:
        "Low-risk, well-scoped, measurable, American-built, informational only with human handoff. Approved for implementation.",
      executiveSummary:
        "Trademark applicants can't easily interpret their application status, driving routine call volume. This plain-language assistant reads authoritative status data and explains it with a citation and a next step — informational only, with human handoff. Expected: meaningful contact deflection and a better applicant experience. Low risk, American-built, with Section 508 review in the pilot. Approved.",
    } as Partial<FormData>),
  },

  {
    id: "seed-sub-teas-validator",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 47).toISOString(), // ~2 days ago
    formData: mk({
      submitterName: "USPTO Submitter",
      submitterEmail: "submitter@uspto.gov",
      submitterRole: "product_owner",
      submitterOffice: "trademarks",

      reviewStatus: "needs_info",
      comments: [
        {
          id: "c-teas-1",
          authorName: "Jonathan Moody",
          authorRole: "reviewer",
          body: "Useful idea. Before I can score it: what's the baseline filing-error rate today, and can you confirm it only flags issues for the filer to fix — it must never auto-reject a submission?",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        },
      ],
      useCaseTitle: "Automated TEAS Submission Validator",
      useCaseDescription:
        "An assistant that checks a trademark application in TEAS for common, fixable errors before the applicant submits — missing specimens, goods/services classification mismatches, inconsistent owner info — and explains each in plain language so the filer can correct it. It only advises; the applicant decides and submits.",
      publicIndicator: "public",

      targetAudience: "applicant",
      impactedUsersCount: "gt_500",
      painPoints:
        "Many applications come in with avoidable errors that trigger office actions and rework, delaying the applicant and adding examiner load. Filers often don't know the rules.",
      targetUserContext:
        "Pro-se trademark filers and small-business applicants using TEAS, plus examiners who currently catch these errors downstream.",
      targetUserSummary: "TEAS filers (especially pro-se applicants); indirectly, examiners who handle avoidable office actions.",

      coreProblem:
        "Applicants submit fixable errors they don't know about, which drives avoidable office actions, rework, and pendency.",
      problemImpact:
        "Avoidable filing errors generate office actions and re-filing cycles that delay applicants and consume examiner time.",
      affectedSystem: "trademarks",
      problemType: ["productivity", "user_experience"],
      severity: "medium",
      problemDefinition:
        "Trademark applicants lack pre-submission, plain-language guidance on common fixable errors, driving avoidable office actions and rework.",

      proposedSolution:
        "A pre-submission validator that flags common, rule-based issues and explains each in plain language with the fix. Advisory only — it never blocks or auto-rejects; the applicant makes every change and chooses to submit.",
      keyFunctionality: ["question_answering", "classification", "summarization"],
      solutionSummary: "Advisory pre-submission TEAS checker that flags fixable errors in plain language. Applicant decides.",

      userValue: "Fewer surprise office actions and faster approval, with clear guidance on how to fix issues before filing.",
      userTimeSavings: "1_5",
      otherUserImprovements: ["less_frustration", "better_decisions", "more_consistent_work"],
      userValueSummary: "Catch fixable errors before filing; fewer office actions and faster approval.",

      businessValue: "Reduces avoidable office actions and rework, freeing examiner time and improving the applicant experience.",
      costSavings: "50k_250k",
      strategicBenefit: ["operational_efficiency", "employee_experience"],
      businessValueSummary: "Fewer avoidable office actions and rework; reclaimed examiner time.",

      usptoFocusArea: ["goal_pendency_quality", "goal_employee_experience"],
      relevantOkrs: "Reduce avoidable office actions; improve first-pass filing quality and applicant experience.",
      alignmentSummary: "Supports efficient delivery of reliable IP rights and a better applicant experience, with an advisory, human-decides design.",

      implementationComplexity: "medium",
      resourcesNeeded: ["ml_engineers", "examiner_sme", "content_owner"],
      dependencies:
        "Access to TEAS validation rules and historical office-action reasons. Mostly rules + plain-language explanation; limited modeling.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "american_built",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Medium complexity; advisory only, never blocks a filing. American-built; needs the validation-rule set and a baseline error rate to size impact.",

      successMetrics: "Avoidable-office-action rate, first-pass filing quality, applicant satisfaction — against a baseline.",
      keyMetrics: ["error_rate", "user_satisfaction", "quality_improvement"],
      timelineForResults: "6_12",
      metricsSummary: "Tracks avoidable office actions and first-pass quality against a baseline (to be measured).",

      routeTo: ["governance"],
      reviewerNotes: "Needs a measured baseline error rate and explicit confirmation it never auto-rejects.",

      readinessScore: "needs_work",
      readinessSummary:
        "Strong, low-risk applicant-experience case. Gaps before scoring: a measured baseline filing-error rate, and explicit confirmation the validator only advises (never auto-rejects).",
      executiveSummary:
        "Many trademark applications include avoidable, fixable errors that trigger office actions and rework. This advisory validator flags those in plain language before submission so filers can fix them — it never blocks or auto-rejects. Promising and low-risk; needs a measured baseline error rate and confirmation of the advisory-only design before scoring.",
    } as Partial<FormData>),
  },

  {
    id: "seed-sub-conflict-search",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), // ~1 day ago
    formData: mk({
      submitterName: "USPTO Submitter",
      submitterEmail: "submitter@uspto.gov",
      submitterRole: "product_owner",
      submitterOffice: "trademarks",

      reviewStatus: "in_review",
      useCaseTitle: "Trademark Conflict Search Advisory Assistant",
      useCaseDescription:
        "An advisory assistant that, given a new application's mark and its goods/services, surfaces the most likely conflicting prior marks — accounting for phonetic, visual/design, and goods/services relatedness — ranked, with the basis for each match. The examining attorney reviews and decides the refusal; the AI never issues it.",
      publicIndicator: "public",

      targetAudience: "trademark_examiner",
      impactedUsersCount: "gt_500",
      painPoints:
        "Examining attorneys manually search for confusingly similar prior marks across word, design, and goods/services dimensions. Searches vary between attorneys, similar marks get missed, and that drives pendency and inconsistent likelihood-of-confusion refusals.",
      targetUserContext:
        "Trademark examining attorneys across all law offices, and the supervisory attorneys who review their conflict determinations.",
      targetUserSummary: "Trademark examining attorneys performing likelihood-of-confusion conflict searches.",

      coreProblem:
        "Conflict search relies on manual, attorney-by-attorney technique, so similar marks get missed and refusals are inconsistent — driving pendency and quality variance.",
      problemImpact:
        "Inconsistent conflict search lengthens examination and produces uneven Section 2(d) refusal outcomes across attorneys.",
      affectedSystem: "trademarks",
      problemType: ["productivity", "quality"],
      severity: "high",
      problemDefinition:
        "Trademark examiners lack a consistent, advisory way to surface likely conflicting marks across phonetic, visual, and goods/services dimensions, driving pendency and inconsistent refusals.",

      proposedSolution:
        "A retrieval/ranking assistant that surfaces the most likely conflicting prior marks with the basis for each (phonetic, visual, goods/services relatedness). The attorney reviews and decides; the AI never issues a refusal. Runs on a U.S.-hosted model inside the USPTO boundary.",
      keyFunctionality: ["search", "ranking", "summarization"],
      solutionSummary:
        "Advisory, ranked conflict-mark surfacing across phonetic/visual/goods-services signals; attorney decides. U.S.-hosted.",

      userValue:
        "Cuts conflict-search time and surfaces marks an attorney might miss, with the reasoning shown — the attorney stays the decision-maker.",
      userTimeSavings: "5_10",
      otherUserImprovements: ["better_decisions", "more_consistent_work", "less_frustration"],
      userValueSummary: "Faster, more consistent conflict search with the basis shown; attorney decides.",

      businessValue:
        "Reduces trademark pendency and improves the consistency of Section 2(d) refusals, improving the applicant experience and reducing rework.",
      costSavings: "gt_1m",
      strategicBenefit: ["reduce_pendency", "improve_quality"],
      businessValueSummary:
        "Lower conflict-search time and more consistent 2(d) outcomes — pendency and quality gains at scale.",

      usptoFocusArea: ["goal_pendency_quality", "ai_responsible_use"],
      relevantOkrs:
        "Efficient delivery of reliable IP rights (trademark pendency + quality); responsible AI use with human oversight.",
      alignmentSummary:
        "Directly advances efficient delivery of reliable IP rights, under a responsible-AI design (advisory, attorney-in-the-loop, basis shown).",

      implementationComplexity: "medium",
      resourcesNeeded: ["ml_engineers", "examiner_sme", "infrastructure"],
      dependencies:
        "Access to the trademark register and design-code data; integration with the examiner workbench; a U.S.-hosted model inside the boundary.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["examiner_authentication", "audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "american_built",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Medium complexity. Advisory only, attorney decides, basis shown for each match. American-built, U.S.-hosted. Integration with the examiner workbench is the main lift.",

      successMetrics:
        "Conflict-search time per application (target down 30-40%), attorney-rated relevance of surfaced marks, consistency of 2(d) outcomes, and trademark first-action pendency in pilot law offices vs. control.",
      keyMetrics: ["time_saved", "quality_improvement", "user_satisfaction"],
      timelineForResults: "6_12",
      metricsSummary:
        "Pilot measures search time, surfaced-mark relevance, 2(d) consistency, and pendency against a control.",

      routeTo: ["governance"],
      reviewerNotes: "Strong, high-value examiner-assist with a clean responsible-AI posture. In review.",

      readinessScore: "ready",
      readinessSummary:
        "Comprehensive, measurable, and well-aligned to pendency and quality, with an advisory, attorney-in-the-loop design and American-built sourcing. Ready for AI Council review.",
      executiveSummary:
        "Trademark conflict search is manual and varies by attorney, so similar marks get missed and refusals are inconsistent — driving pendency and quality variance. This advisory assistant surfaces the most likely conflicting marks with the basis for each across phonetic, visual, and goods/services signals; the attorney reviews and decides, and the AI never issues a refusal. Expected: 30-40% less search time and more consistent 2(d) outcomes. American-built, U.S.-hosted, attorney-in-the-loop. Ready for AI Council review.",
    } as Partial<FormData>),
  },

  // 1) Patents — READY. Strong example, shows the tool's "ideal" state.
  {
    id: "seed-patents-prior-art",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // ~1.25 days ago
    formData: mk({
      submitterName: "Dr. Anita Krishnan",
      submitterEmail: "anita.krishnan@uspto.gov",
      submitterRole: "patent_examiner",
      submitterOffice: "patents",

      reviewStatus: "in_review",
      useCaseTitle: "AI-Assisted Prior Art Retrieval for Patent Examiners",
      useCaseDescription:
        "An AI search agent that takes an examiner's claim language and returns a ranked list of the most relevant prior art across U.S. patents, foreign patents, and non-patent literature — with citation snippets and a confidence score for each result. The examiner reviews and confirms; the AI never makes the allowance/rejection decision.",
      publicIndicator: "public",

      targetAudience: "patent_examiner",
      impactedUsersCount: "gt_500",
      painPoints:
        "Examiners spend 30-40% of their time on prior art search. Searches rely on Boolean keyword logic that misses semantically equivalent disclosures, especially in foreign-language filings.",
      targetUserContext:
        "Primary users are GS-12 through GS-15 patent examiners across all technology centers. Secondary users are supervisory examiners (SPEs) reviewing examiner work. Examiners average 19 hours per Balanced Disposal Unit; prior art search consumes 6-8 of those hours.",
      targetUserSummary:
        "Patent examiners across all art units who currently spend 30-40% of their examination time on prior art search. Particular value for art units with high foreign-language filings (Tech Center 2800 — Semiconductors, Tech Center 1700 — Chemical).",

      coreProblem:
        "Boolean keyword search misses semantically relevant prior art. Examiners must manually expand search terms, translate foreign disclosures, and iterate — leading to longer pendency and inconsistent search quality.",
      problemImpact:
        "Average prior art search adds 6-8 hours per application. With 600K applications/year, conservative estimate is 3.6M examiner-hours annually spent on a task where 30-50% could be automated. Search misses also drive post-allowance prior art surprises and reissue activity.",
      affectedSystem: "patents",
      problemType: ["productivity", "quality", "search_retrieval"],
      severity: "high",
      problemDefinition:
        "Patent examiners cannot efficiently surface semantically relevant prior art using current Boolean search tools, particularly across foreign-language disclosures and non-patent literature, leading to longer pendency and uneven search quality across examiners and art units.",

      proposedSolution:
        "A retrieval-augmented LLM agent integrated into the Patents End-to-End (PE2E) suite. Examiner pastes claim language; system returns top-20 ranked prior art with similarity scores, machine-translated foreign abstracts, and highlighted claim-overlap snippets. Examiner remains the decision-maker. Built on a USPTO-hosted open-source embedding model (no claim text leaves USPTO infrastructure).",
      keyFunctionality: ["search", "summarization", "translation", "ranking"],
      solutionSummary:
        "RAG-based prior art retrieval inside PE2E. American-built or open-source models, USPTO-hosted. Examiner-in-the-loop; AI never makes patentability decisions.",

      userValue:
        "Reclaims 2-4 hours per application for examiners — time that goes back to substantive examination, claim analysis, and writing clearer office actions. Reduces frustration with the search experience.",
      userTimeSavings: "5_10",
      otherUserImprovements: ["better_decisions", "less_frustration", "more_consistent_work"],
      userValueSummary:
        "Examiners save 5-10 hours per Balanced Disposal Unit on search; redirect that time to substantive examination. Especially impactful for art units with high foreign-language filings.",

      businessValue:
        "Pendency reduction is the biggest lever. If 50% of examiners adopt and save 4 hours/BDU, that's ~1.5M examiner-hours/year back — equivalent to 700 FTEs of capacity at current productivity. At a fully-loaded examiner cost of ~$150K, that's $105M in capacity reclaimed annually, or 3-month pendency reduction at current filing rates.",
      costSavings: "gt_1m",
      strategicBenefit: ["reduce_pendency", "improve_quality", "increase_capacity"],
      businessValueSummary:
        "Conservative estimate: $100M+ annual capacity reclamation OR equivalent 3-month pendency reduction. Directly supports Goal 1 (reduce pendency) and Goal 2 (improve quality) of the 2022-2026 Strategic Plan.",

      usptoFocusArea: ["goal_pendency_quality", "ai_infrastructure", "ai_responsible_use"],
      relevantOkrs:
        "Strategic Plan Goal 1: Drive Inclusive U.S. Innovation — pendency targets. Goal 2: Promote the Efficient Delivery of Reliable IP Rights — quality targets. AI Strategy Priority 1: Accelerate AI use in core examination workflows.",
      alignmentSummary:
        "Anchored to USPTO 2022-2026 Strategic Plan Goals 1 (pendency) and 2 (quality), and AI Strategy Priority 1 (examination workflows). Direct line of sight to Ramesh's three priorities: reduced pendency, improved quality, reduced costs.",

      implementationComplexity: "medium",
      resourcesNeeded: ["ml_engineers", "examiner_sme", "pe2e_integration_team", "infrastructure"],
      dependencies:
        "Requires access to current PE2E search index, USPTO-hosted compute (likely AWS GovCloud), and integration with examiner authentication. Embedding model fine-tuning needs labeled examiner-validated prior art pairs (~50K available from past office actions).",
      involvesSensitiveData: "yes",
      securityClassification: "internal",
      accessControlRequirements: ["pii_protection", "examiner_authentication", "audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "open_source_us",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Medium complexity. Core ML is well-understood (RAG over patent corpus). Real complexity is PE2E integration and examiner change management. American-built or open-source models only; no claim text leaves USPTO infrastructure.",

      successMetrics:
        "Primary: examiner time per BDU on search (target: reduce from 6-8h to 4-5h). Secondary: examiner-reported relevance of top-5 AI results (target: >70% rated relevant). Tertiary: post-allowance prior art surprise rate (target: reduce 20%).",
      keyMetrics: ["time_saved", "user_satisfaction", "quality_improvement", "adoption_rate"],
      timelineForResults: "6_12",
      metricsSummary:
        "Three measurable outcomes: hours/BDU on search, top-5 relevance rate, post-allowance prior art surprises. Quarterly review against baseline established in pilot art units.",

      routeTo: ["governance"],
      reviewerNotes:
        "Recommend pilot with 2 art units (TC 2800 and TC 1700) for 90 days before agency-wide rollout decision.",

      readinessScore: "ready",
      readinessSummary:
        "This submission is comprehensive, well-grounded in measurable outcomes, and clearly aligned to USPTO's strategic priorities. Risk profile is appropriate (examiner-in-the-loop, no decisional AI). Ready for AI Council review.",
      executiveSummary:
        "Patent examiners spend 30-40% of examination time on prior art search using Boolean tools that miss semantically relevant disclosures, particularly in foreign-language filings. This RAG-based retrieval agent, integrated into PE2E, returns ranked prior art with confidence scores while keeping the examiner as the sole decision-maker. Conservative ROI is $100M+ in annual examiner capacity reclaimed, with direct contribution to Strategic Plan Goal 1 (pendency) and Goal 2 (quality). American-built or open-source models hosted on USPTO infrastructure; no claim text leaves USPTO control. Recommend 90-day pilot in TC 2800 and TC 1700 before agency-wide rollout.",
    } as Partial<FormData>),
  },

  // 2) Trademarks — NEEDS_WORK. Real problem but value claims are soft.
  {
    id: "seed-trademarks-confusion",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 52).toISOString(), // ~2 days ago
    formData: mk({
      submitterName: "Marcus Webb",
      submitterEmail: "marcus.webb@uspto.gov",
      submitterRole: "trademark_examiner",
      submitterOffice: "trademarks",

      reviewStatus: "needs_info",
      comments: [
        {
          id: "c-tm-1",
          authorName: "Jonathan Moody",
          authorRole: "reviewer",
          body: "Strong direction. Before I can score this, put a number on examiner hours saved per application with a baseline source — right now the value is directional.",
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
        },
      ],
      useCaseTitle: "Likelihood-of-Confusion Pre-Screen for Trademark Applications",
      useCaseDescription:
        "An AI tool that compares a new trademark application against the existing TM register and flags potential likelihood-of-confusion issues before an examiner picks up the file. Aims to surface obvious conflicts faster.",
      publicIndicator: "public",

      targetAudience: "trademark_examiner",
      impactedUsersCount: "50_500",
      painPoints:
        "Examiners search for confusingly similar marks across the register. The current TESS/TSDR tools require manual phonetic, semantic, and visual comparison. Backlog has been growing.",
      targetUserContext: "Trademark examining attorneys at all levels.",
      targetUserSummary: "Trademark examining attorneys across the Trademarks business unit.",

      coreProblem:
        "Trademark backlog grew 40% in the last 18 months. Examiners spend significant time on likelihood-of-confusion analysis that could be partially pre-screened.",
      problemImpact: "Pendency for first office action has grown from 8 months to 14 months.",
      affectedSystem: "trademarks",
      problemType: ["productivity", "backlog"],
      severity: "high",
      problemDefinition:
        "Trademark examiner backlog is growing and likelihood-of-confusion analysis is a known bottleneck.",

      proposedSolution:
        "An ML model that combines phonetic similarity (Soundex/Metaphone), embedding-based semantic similarity, and image similarity for design marks. Returns a ranked list of potentially conflicting registrations with similarity scores. Examiner makes the call.",
      keyFunctionality: ["search", "ranking", "image_similarity"],
      solutionSummary:
        "Multi-signal similarity model (phonetic + semantic + visual) returning ranked candidate conflicts.",

      userValue: "Saves examiner time on initial conflict review.",
      userTimeSavings: "1_5",
      otherUserImprovements: ["better_decisions"],
      userValueSummary: "Faster initial conflict review; examiner remains the decision-maker.",

      businessValue: "Helps reduce the trademark backlog.",
      costSavings: "250k_1m",
      strategicBenefit: ["reduce_pendency"],
      businessValueSummary:
        "Contributes to backlog reduction but specific FTE-hours-saved estimate not yet developed.",

      usptoFocusArea: ["goal_pendency_quality"],
      relevantOkrs: "Strategic Plan Goal 1: pendency targets for trademarks.",
      alignmentSummary: "Aligns with Goal 1 (pendency) but other strategic linkages not yet articulated.",

      implementationComplexity: "medium",
      resourcesNeeded: ["ml_engineers", "examiner_sme"],
      dependencies:
        "TM register access; existing image hash infrastructure; integration with TM examiner workbench.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["examiner_authentication"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "unknown",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Technically feasible; integration path with existing TM tools needs scoping. American-built model status TBD — current vendor is being evaluated.",

      successMetrics: "Reduce examiner time on initial conflict review.",
      keyMetrics: ["time_saved", "adoption_rate"],
      timelineForResults: "6_12",
      metricsSummary:
        "Need to define quantitative target (e.g., minutes saved per application) — currently directional only.",

      routeTo: ["governance"],
      reviewerNotes: "Want to discuss whether to procure or build in-house.",

      readinessScore: "needs_work",
      readinessSummary:
        "Strong problem statement and clear strategic alignment to pendency reduction. Gaps: (1) quantitative value metrics are vague — needs specific hours-saved-per-application estimate; (2) American-built model status not confirmed; (3) success metrics are directional, not measurable. Recommend revision before AI Council review.",
      executiveSummary:
        "Trademark examiner backlog has grown 40% in 18 months, with first-action pendency now at 14 months. This pre-screen tool would surface likely-confusing prior marks via combined phonetic, semantic, and visual similarity scoring before examiner pickup. Direction is strong but the submission needs harder numbers on examiner hours saved per application and explicit confirmation of American-built model sourcing before going to the AI Council.",
    } as Partial<FormData>),
  },

  // 3) HR — NEEDS_WORK. Shows non-examination use case for breadth.
  {
    id: "seed-hr-onboarding",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 78).toISOString(), // ~3.25 days ago
    formData: mk({
      submitterName: "Priya Subramanian",
      submitterEmail: "priya.subramanian@uspto.gov",
      submitterRole: "manager",
      submitterOffice: "hr",

      reviewStatus: "submitted",
      useCaseTitle: "AI Onboarding Assistant for New USPTO Employees",
      useCaseDescription:
        "A conversational AI assistant that answers new-hire questions during the 90-day onboarding window — benefits, training schedules, telework policy, IT access, badge/parking, expense system, leave types. Replaces a lot of one-off HR ticket volume.",
      publicIndicator: "public",

      targetAudience: "other",
      impactedUsersCount: "10_50",
      painPoints:
        "New hires (200-400/year depending on hiring cycle) generate roughly 3,000 HR tickets in their first 90 days — most are repetitive policy questions. HR ticket queue gets buried; new employees feel unsupported.",
      targetUserContext: "All new USPTO hires across every business unit, federal and contractor.",
      targetUserSummary: "All new hires across USPTO during their 90-day onboarding window.",

      coreProblem:
        "HR ticket volume from new hires is dominated by repetitive policy questions that are answerable from existing handbook/intranet content. New hires don't know where to look and HR is overwhelmed.",
      problemImpact:
        "HR estimates 60-70% of new-hire tickets could be self-served if discovery were easier. Currently ~3,000 tickets/year tied up.",
      affectedSystem: "cross_functional",
      problemType: ["productivity", "user_experience"],
      severity: "medium",
      problemDefinition:
        "New USPTO hires lack a fast, accurate way to find answers to common onboarding questions, generating high HR ticket volume on repetitive items.",

      proposedSolution:
        "A RAG chatbot trained on the USPTO Employee Handbook, HR policy memos, and the IT onboarding documentation. Surfaces answers with citations to source documents. Escalates to a human HR rep when it can't answer with confidence.",
      keyFunctionality: ["question_answering", "search", "summarization"],
      solutionSummary:
        "RAG chatbot over employee handbook and HR/IT onboarding docs. Cited answers; human escalation on low confidence.",

      userValue: "Faster answers, less waiting on HR tickets, better first 90 days.",
      userTimeSavings: "1_5",
      otherUserImprovements: ["less_frustration", "better_decisions"],
      userValueSummary:
        "New hires get answers in seconds instead of waiting 2-3 days for a ticket response.",

      businessValue: "Cuts HR ticket load; lets HR staff focus on higher-value cases.",
      costSavings: "50k_250k",
      strategicBenefit: ["operational_efficiency", "employee_experience"],
      businessValueSummary:
        "Saves an estimated 1,500-2,000 HR ticket hours/year. Helps free HR for higher-value work.",

      usptoFocusArea: ["goal_employee_experience"],
      relevantOkrs: "Internal: HR ticket SLA targets, new-hire engagement scores.",
      alignmentSummary:
        "Aligns with operational excellence goals but does not directly support the three top-of-mind Ramesh priorities (pendency, examination quality, examination cost). Framing as 'employee experience and HR efficiency' may be more appropriate.",

      implementationComplexity: "low",
      resourcesNeeded: ["ml_engineers", "hr_sme", "content_owner"],
      dependencies:
        "Access to current handbook and policy library; intranet identity integration. Most lift is content curation, not ML.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["employee_authentication"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "unknown",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Low technical complexity. Bigger lift is HR content owner availability for QA. American-built model: undecided — will use whatever AI Council approves for internal RAG.",

      successMetrics: "Reduce HR onboarding tickets by 40%.",
      keyMetrics: ["ticket_volume_reduction", "user_satisfaction", "adoption_rate"],
      timelineForResults: "3_6",
      metricsSummary:
        "Target: 40% ticket reduction in 6 months. Baseline currently being measured.",

      routeTo: ["governance"],
      reviewerNotes:
        "Non-examination use case — but a good proof point for internal AI rollout that doesn't touch applicant data.",

      readinessScore: "needs_work",
      readinessSummary:
        "Solid, low-risk internal use case with realistic scope. Submission needs sharper measurement (current baseline is unknown) and explicit American-built model commitment. Recommend pairing with the IT ticket triage proposal for a coordinated internal-AI track.",
      executiveSummary:
        "USPTO new hires generate ~3,000 HR tickets/year on repetitive onboarding questions. A RAG chatbot over the employee handbook and HR policy library would deflect 60-70% of these with cited answers and clean human escalation. Low technical risk, no applicant data involved. Submission needs a measured baseline and confirmed American-built model sourcing before AI Council review.",
    } as Partial<FormData>),
  },

  // 4) OCIO — READY. Different business unit; clean utility case.
  {
    id: "seed-ocio-ticket-triage",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // ~8 hours ago
    formData: mk({
      submitterName: "James Okonkwo",
      submitterEmail: "james.okonkwo@uspto.gov",
      submitterRole: "it_staff",
      submitterOffice: "ocio",

      reviewStatus: "approved",
      useCaseTitle: "Automated IT Service Ticket Triage and Routing",
      useCaseDescription:
        "An AI classifier that reads inbound IT service tickets, identifies category (network, account, hardware, application-specific), assigns priority, and routes to the right tier-2 team. Reduces queue dwell time and improves first-touch resolution rate.",
      publicIndicator: "public",

      targetAudience: "other",
      impactedUsersCount: "gt_500",
      painPoints:
        "Average IT ticket spends 4-6 hours in the unassigned queue before a human triage agent classifies it. Misrouted tickets bounce 2-3 times before reaching the right team, adding days to resolution.",
      targetUserContext:
        "Tier-1 triage agents (12 staff), tier-2 specialists across 8 application support teams, and ultimately every USPTO employee submitting a ticket.",
      targetUserSummary:
        "Tier-1 IT triage agents and downstream specialist teams. Indirect benefit to every USPTO employee submitting a ticket.",

      coreProblem:
        "Manual IT ticket triage is slow, inconsistent, and miscategorizes 18% of tickets, causing rerouting and resolution delay.",
      problemImpact:
        "Average ticket-to-resolution time is 3.2 business days. Internal benchmarks suggest 1.8 days is achievable with automated triage. Lost productivity across USPTO from IT-blocked work is estimated at 8,000 hours/year.",
      affectedSystem: "it_systems",
      problemType: ["productivity", "operational_efficiency"],
      severity: "medium",
      problemDefinition:
        "USPTO IT tickets sit unclassified for 4-6 hours and are misrouted 18% of the time, delaying resolution and consuming triage-agent capacity that could focus on complex cases.",

      proposedSolution:
        "A text classifier trained on 18 months of historical tickets (~120K labeled examples). Predicts category, priority, and team assignment. Confidence threshold determines auto-route vs. human-review. Initially shadow-deployed for 30 days to validate accuracy before going live.",
      keyFunctionality: ["classification", "routing", "prioritization"],
      solutionSummary:
        "ML classifier predicting category/priority/team. Auto-routes high-confidence tickets; flags low-confidence for human triage.",

      userValue:
        "Tier-1 agents stop doing repetitive classification work, freeing 60% of their time for complex cases. Employees get faster resolution.",
      userTimeSavings: "1_5",
      otherUserImprovements: ["less_frustration", "more_consistent_work"],
      userValueSummary:
        "Tier-1 agents reclaim 60% of triage time; downstream teams see fewer misroutes; employees see faster ticket resolution.",

      businessValue:
        "Reduces ticket-to-resolution time from 3.2 to <2 business days. Reclaims ~14,000 hours/year of tier-1 triage capacity (~7 FTEs).",
      costSavings: "250k_1m",
      strategicBenefit: ["operational_efficiency", "reduce_costs"],
      businessValueSummary:
        "$700K-$1M/year in reclaimed tier-1 capacity. Knock-on productivity benefit across USPTO from faster IT resolution.",

      usptoFocusArea: ["goal_employee_experience", "ai_infrastructure"],
      relevantOkrs:
        "OCIO ticket SLA targets; AI Strategy Priority 3: AI for operational efficiency.",
      alignmentSummary:
        "Anchored to AI Strategy Priority 3 (operational efficiency) and OCIO SLA targets. Directly supports the 'reduced costs' priority Ramesh emphasized.",

      implementationComplexity: "low",
      resourcesNeeded: ["ml_engineers", "ocio_sme"],
      dependencies:
        "ServiceNow API access (already in place); historical ticket export (already extracted for pilot). No external vendor dependency.",
      involvesSensitiveData: "no",
      securityClassification: "internal",
      accessControlRequirements: ["ocio_authentication", "audit_logging"],
      aiDecisionalImpact: "no",
      aiModelSourcing: "open_source_us",
      aiHumanReview: "yes",
      feasibilitySummary:
        "Low technical complexity. American-built model — using open-source distilBERT fine-tuned on internal ticket data, hosted on USPTO infrastructure. 30-day shadow deployment de-risks accuracy concerns before go-live.",

      successMetrics:
        "Primary: ticket-to-resolution time (target: <2 business days, from 3.2). Secondary: misroute rate (target: <5%, from 18%). Tertiary: tier-1 triage agent productivity (% time on complex cases, target: >70%).",
      keyMetrics: ["resolution_time", "error_rate", "productivity"],
      timelineForResults: "3_6",
      metricsSummary:
        "Three measurable outcomes tracked weekly. Pilot baseline already collected; go-live measurement begins day 1.",

      routeTo: ["governance"],
      reviewerNotes:
        "Pilot complete; results validated. Ready for production approval.",

      readinessScore: "ready",
      readinessSummary:
        "Strong proposal. Concrete baseline metrics, validated pilot, low risk, American-built model, no PII concerns. Ready for AI Council review.",
      executiveSummary:
        "USPTO IT tickets currently spend 4-6 hours unassigned and are misrouted 18% of the time, driving average resolution to 3.2 business days. An open-source distilBERT classifier (USPTO-hosted, American-built) trained on 18 months of internal tickets predicts category, priority, and team assignment. A 30-day shadow pilot has validated accuracy; production deployment is expected to reduce resolution time to under 2 business days and reclaim ~14,000 tier-1 hours/year ($700K-$1M annual value). No PII exposure, no decisional AI, full audit logging. Ready for AI Council production approval.",
    } as Partial<FormData>),
  },

  // 5) Cross-functional/OGC — EARLY_STAGE. Shows what gets flagged as not ready.
  {
    id: "seed-ogc-foia",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 100).toISOString(), // ~4 days ago
    formData: mk({
      submitterName: "Reginald Ortiz",
      submitterEmail: "reginald.ortiz@uspto.gov",
      submitterRole: "other",
      submitterOffice: "ogc",

      reviewStatus: "rejected",
      useCaseTitle: "AI for FOIA Request Processing",
      useCaseDescription:
        "We get lots of FOIA requests and they take a long time. Maybe AI can help.",
      publicIndicator: "public",

      targetAudience: "other",
      impactedUsersCount: "lt_10",
      painPoints: "FOIA team is slow.",
      targetUserContext: "FOIA team in OGC.",
      targetUserSummary: "OGC FOIA team.",

      coreProblem: "FOIA backlog.",
      problemImpact: "Requests take too long.",
      affectedSystem: "cross_functional",
      problemType: ["backlog"],
      severity: "medium",
      problemDefinition: "FOIA backlog is too big.",

      proposedSolution: "Use AI to process FOIA requests faster.",
      keyFunctionality: ["search"],
      solutionSummary: "AI for FOIA.",

      userValue: "Faster FOIA responses.",
      userTimeSavings: "1_5",
      otherUserImprovements: [],
      userValueSummary: "Faster.",

      businessValue: "Less backlog.",
      costSavings: "lt_50k",
      strategicBenefit: [],
      businessValueSummary: "Less backlog.",

      usptoFocusArea: [],
      relevantOkrs: "",
      alignmentSummary: "",

      implementationComplexity: "high",
      resourcesNeeded: [],
      dependencies: "Need to figure out.",
      involvesSensitiveData: "yes",
      securityClassification: "controlled",
      accessControlRequirements: [],
      aiDecisionalImpact: "yes",
      aiModelSourcing: "unknown",
      aiHumanReview: "no",
      feasibilitySummary:
        "FOIA processing involves PII, attorney-client material, and exemption-driven redaction logic. High security and policy complexity. American-built model status not addressed.",

      successMetrics: "Less backlog.",
      keyMetrics: [],
      timelineForResults: "gt_12",
      metricsSummary: "TBD.",

      routeTo: ["draft"],
      reviewerNotes: "Early thinking — wanted to start the conversation.",

      readinessScore: "early_stage",
      readinessSummary:
        "This is an idea, not yet a proposal. Significant work needed across every section — target users, specific problem, solution architecture, value metrics, alignment, feasibility, and especially the security/redaction approach given FOIA's PII and exemption complexity. Recommend a working session with OGC and OCIO before resubmitting.",
      executiveSummary:
        "An early-stage idea to apply AI to USPTO FOIA processing. Concept has merit — FOIA backlog is real — but the submission lacks scoped problem definition, target users, measurable value claims, and (critically) a security/redaction architecture appropriate for FOIA's PII and exemption-driven workflow. Not ready for AI Council review; recommend OGC + OCIO working session to scope and resubmit.",
    } as Partial<FormData>),
  },
  {
    id: "seed-ocfo-invoice",
    submittedAt: new Date(Date.now() - 18000000).toISOString(),
    formData: mk({
      "submitterName": "Karen Diallo",
      "submitterEmail": "karen.diallo@uspto.gov",
      "submitterRole": "manager",
      "submitterOffice": "ocfo",
      "useCaseTitle": "Invoice Anomaly Detection for Financial Operations",
      "publicIndicator": "public",
      "useCaseDescription": "An ML model that flags anomalous vendor invoices (duplicate, out-of-pattern amounts, mismatched POs) for analyst review before payment.",
      "coreProblem": "OCFO analysts manually spot-check a fraction of invoices; anomalies slip through and are caught late in reconciliation.",
      "problemImpact": "~40,000 invoices/year, only ~10% reviewed in depth. Late catches drive rework and occasional improper payments.",
      "impactedUsersCount": "10_50",
      "targetAudience": "other",
      "proposedSolution": "Anomaly model over historical invoice/PO data; scores each invoice and routes high-risk ones to an analyst. Analyst decides — model never blocks payment.",
      "businessValue": "Shifts analysts from sampling to exception-handling; reduces improper payments and reconciliation rework.",
      "costSavings": "250k_1m",
      "usptoFocusArea": [
            "goal_employee_experience",
            "ai_infrastructure"
      ],
      "successMetrics": "Improper-payment rate; % anomalies caught pre-payment; analyst hours on routine review.",
      "timelineForResults": "3_6",
      "implementationComplexity": "medium",
      "involvesSensitiveData": "no",
      "aiModelSourcing": "open_source_us",
      "aiDecisionalImpact": "no",
      "aiHumanReview": "yes",
      "readinessScore": "needs_work",
      "readinessSummary": "Promising operational case; needs a measured baseline for improper-payment rate and confirmation of data access.",
      "executiveSummary": "OCFO reviews only a fraction of ~40,000 annual invoices by hand, so anomalies surface late in reconciliation. An anomaly model would score invoices and route high-risk ones to analysts, who keep the decision. Needs a measured baseline before scoring.",
      "reviewStatus": "submitted"
} as Partial<FormData>),
  },
  {
    id: "seed-patents-onboarding",
    submittedAt: new Date(Date.now() - 39600000).toISOString(),
    formData: mk({
      "submitterName": "Daniel Roth",
      "submitterEmail": "daniel.roth@uspto.gov",
      "submitterRole": "manager",
      "submitterOffice": "patents",
      "useCaseTitle": "Examiner Onboarding Knowledge Assistant",
      "publicIndicator": "public",
      "useCaseDescription": "A cited-source assistant that answers new examiners' procedure questions (MPEP, art-unit practice, PE2E how-tos) during their first year.",
      "coreProblem": "New examiners ramp slowly and lean heavily on SPEs for repetitive procedural questions.",
      "problemImpact": "Each cohort of new examiners generates heavy SPE mentoring load on repeatable MPEP/procedure questions.",
      "impactedUsersCount": "50_500",
      "targetAudience": "patent_examiner",
      "proposedSolution": "RAG assistant over the MPEP and internal procedure docs with citations; escalates to SPE when unsure.",
      "businessValue": "Faster examiner ramp; frees SPE time for substantive mentoring and quality review.",
      "costSavings": "50k_250k",
      "usptoFocusArea": [
            "goal_employee_experience",
            "ai_workforce"
      ],
      "successMetrics": "Time-to-productivity for new examiners; SPE hours on routine Q&A; assistant answer-acceptance rate.",
      "timelineForResults": "6_12",
      "implementationComplexity": "low",
      "involvesSensitiveData": "no",
      "aiModelSourcing": "open_source_us",
      "aiDecisionalImpact": "no",
      "aiHumanReview": "yes",
      "readinessScore": "needs_work",
      "readinessSummary": "Low-risk internal assistant. Needs a baseline for ramp time and a content owner for the MPEP corpus.",
      "executiveSummary": "New patent examiners ramp slowly and lean on SPEs for repeatable procedure questions. A cited RAG assistant over the MPEP and internal docs would deflect routine questions and escalate the rest. Low risk; needs a ramp-time baseline and a content owner.",
      "reviewStatus": "submitted"
} as Partial<FormData>),
  },
  {
    id: "seed-opia-inquiry",
    submittedAt: new Date(Date.now() - 64800000).toISOString(),
    formData: mk({
      "submitterName": "Lena Park",
      "submitterEmail": "lena.park@uspto.gov",
      "submitterRole": "other",
      "submitterOffice": "opia",
      "useCaseTitle": "Public Inquiry Auto-Responder (Draft Suggestions)",
      "publicIndicator": "public",
      "useCaseDescription": "Suggests draft replies to common public/press inquiries for a comms specialist to edit and approve. Never auto-sends.",
      "coreProblem": "OPIA fields repetitive public inquiries; drafting from scratch each time is slow.",
      "problemImpact": "High volume of repeat questions; response SLAs slip during peak periods.",
      "impactedUsersCount": "lt_10",
      "targetAudience": "other",
      "proposedSolution": "RAG over approved public messaging + FAQ; drafts a suggested reply with citations; specialist edits and sends.",
      "businessValue": "Faster, more consistent public responses; specialists focus on novel/sensitive inquiries.",
      "costSavings": "lt_50k",
      "usptoFocusArea": [
            "goal_employee_experience"
      ],
      "successMetrics": "Median response time; % responses using a suggested draft; consistency review pass rate.",
      "timelineForResults": "3_6",
      "implementationComplexity": "low",
      "involvesSensitiveData": "no",
      "aiModelSourcing": "american_built",
      "aiDecisionalImpact": "no",
      "aiHumanReview": "yes",
      "readinessScore": "needs_work",
      "readinessSummary": "Reasonable comms-efficiency case. Confirm the approved-messaging corpus and a human-approval gate on every send.",
      "executiveSummary": "OPIA handles many repetitive public inquiries and drafts each reply from scratch. A draft-suggestion assistant over approved messaging would speed consistent responses, with a specialist editing and sending every reply. Confirm the source corpus and the human-approval gate.",
      "reviewStatus": "submitted"
} as Partial<FormData>),
  },
  {
    id: "seed-trademarks-specimen",
    submittedAt: new Date(Date.now() - 93600000).toISOString(),
    formData: mk({
      "submitterName": "Omar Haddad",
      "submitterEmail": "omar.haddad@uspto.gov",
      "submitterRole": "trademark_examiner",
      "submitterOffice": "trademarks",
      "useCaseTitle": "Specimen Acceptability Pre-Check",
      "publicIndicator": "public",
      "useCaseDescription": "Flags likely-unacceptable trademark specimens (mockups, digitally altered images) for examiner attention.",
      "coreProblem": "Examiners manually assess specimen acceptability; questionable specimens are easy to miss at volume.",
      "problemImpact": "Specimen review is a known time sink and a source of inconsistent outcomes across examiners.",
      "impactedUsersCount": "50_500",
      "targetAudience": "trademark_examiner",
      "proposedSolution": "Image model trained on accepted/refused specimens; flags likely-unacceptable ones with a reason. Examiner decides.",
      "businessValue": "More consistent specimen review; less time on clearly-acceptable cases.",
      "costSavings": "50k_250k",
      "usptoFocusArea": [
            "goal_pendency_quality"
      ],
      "successMetrics": "Examiner agreement with flags; time per specimen; consistency across examiners.",
      "timelineForResults": "6_12",
      "implementationComplexity": "medium",
      "involvesSensitiveData": "no",
      "aiModelSourcing": "unknown",
      "aiDecisionalImpact": "no",
      "aiHumanReview": "yes",
      "readinessScore": "needs_work",
      "readinessSummary": "Good fit, but model sourcing is unconfirmed and there's no labeled training set identified yet.",
      "executiveSummary": "Trademark specimen acceptability is reviewed by hand and questionable specimens slip through at volume. An image model would flag likely-unacceptable specimens with a reason for examiner decision. Needs a labeled training set and confirmed American-built sourcing.",
      "comments": [
            {
                  "id": "c-tm-spec-1",
                  "authorName": "Jonathan Moody",
                  "authorRole": "reviewer",
                  "body": "Like this. Two things before scoring: where does the labeled specimen training set come from, and can you confirm the model sourcing? Right now it's marked unknown, which is a blocker under the EO.",
                  "createdAt": "2026-05-31T15:00:00Z"
            }
      ],
      "reviewStatus": "needs_info"
} as Partial<FormData>),
  },
  {
    id: "seed-ocio-outage",
    submittedAt: new Date(Date.now() - 118800000).toISOString(),
    formData: mk({
      "submitterName": "Tariq Nguyen",
      "submitterEmail": "tariq.nguyen@uspto.gov",
      "submitterRole": "it_staff",
      "submitterOffice": "ocio",
      "useCaseTitle": "Network Outage Predictive Alerts",
      "publicIndicator": "public",
      "useCaseDescription": "Predicts likely network/service degradations from telemetry so ops can act before users are impacted.",
      "coreProblem": "Outages are detected reactively after users are already affected.",
      "problemImpact": "Reactive detection means lost productivity agency-wide during incidents.",
      "impactedUsersCount": "gt_500",
      "targetAudience": "other",
      "proposedSolution": "Time-series model over infrastructure telemetry that raises early-warning alerts to the NOC. Humans triage and act.",
      "businessValue": "Fewer user-impacting outages; faster mean-time-to-mitigate.",
      "costSavings": "250k_1m",
      "usptoFocusArea": [
            "ai_infrastructure",
            "goal_employee_experience"
      ],
      "successMetrics": "User-impacting incident count; lead time on early warnings; false-alert rate.",
      "timelineForResults": "6_12",
      "implementationComplexity": "high",
      "involvesSensitiveData": "no",
      "aiModelSourcing": "open_source_us",
      "aiDecisionalImpact": "no",
      "aiHumanReview": "yes",
      "readinessScore": "needs_work",
      "readinessSummary": "Valuable but the highest-complexity item; needs a baseline incident rate and a false-alert tolerance before committing.",
      "executiveSummary": "USPTO detects network outages reactively, after users are hit. A predictive model over telemetry would give the NOC early warnings to act on. High complexity; needs a baseline incident rate and an agreed false-alert tolerance.",
      "comments": [
            {
                  "id": "c-ocio-out-1",
                  "authorName": "Jonathan Moody",
                  "authorRole": "reviewer",
                  "body": "Strong upside but this is the most complex one in the queue. Before I score it: what's the current user-impacting incident baseline, and what false-alert rate would ops actually tolerate? Need those to judge feasibility.",
                  "createdAt": "2026-05-31T16:00:00Z"
            }
      ],
      "reviewStatus": "needs_info"
} as Partial<FormData>),
  },
  {
    id: "seed-patents-autoreject",
    submittedAt: new Date(Date.now() - 216000000).toISOString(),
    formData: mk({
      "submitterName": "Victor Solis",
      "submitterEmail": "victor.solis@uspto.gov",
      "submitterRole": "other",
      "submitterOffice": "patents",
      "useCaseTitle": "Auto-Draft Office Action Rejections",
      "publicIndicator": "public",
      "useCaseDescription": "AI that drafts and issues 102/103 rejections automatically based on retrieved prior art.",
      "coreProblem": "Writing office actions takes examiner time.",
      "problemImpact": "Office-action drafting is a large share of examiner workload.",
      "impactedUsersCount": "gt_500",
      "targetAudience": "patent_examiner",
      "proposedSolution": "LLM retrieves prior art and issues the rejection directly to applicants to save examiner time.",
      "businessValue": "Faster office actions.",
      "costSavings": "gt_1m",
      "usptoFocusArea": [
            "goal_pendency_quality"
      ],
      "successMetrics": "Office actions per examiner per period.",
      "timelineForResults": "6_12",
      "implementationComplexity": "high",
      "involvesSensitiveData": "no",
      "aiModelSourcing": "unknown",
      "aiDecisionalImpact": "yes",
      "aiHumanReview": "no",
      "readinessScore": "early_stage",
      "readinessSummary": "Rejected: the AI would make a patentability determination affecting applicants with no mandatory human review — outside policy. Reframe as examiner-assist with the examiner as decision-maker.",
      "executiveSummary": "This proposes AI that drafts and issues 102/103 rejections directly, making a patentability determination affecting applicants with no human in the loop. That crosses the decisional-AI line without mandatory human review and was declined. A reframed examiner-assist version (examiner decides) would be reconsidered.",
      "reviewStatus": "rejected"
} as Partial<FormData>),
  },
  {
    id: "seed-hr-resume",
    submittedAt: new Date(Date.now() - 288000000).toISOString(),
    formData: mk({
      "submitterName": "Bianca Lowe",
      "submitterEmail": "bianca.lowe@uspto.gov",
      "submitterRole": "manager",
      "submitterOffice": "hr",
      "useCaseTitle": "Resume Screening AI for Hiring",
      "publicIndicator": "public",
      "useCaseDescription": "AI that scores and ranks applicants and auto-rejects the bottom tier to reduce HR screening load.",
      "coreProblem": "HR spends significant time screening high applicant volumes.",
      "problemImpact": "High-volume postings generate large screening workloads.",
      "impactedUsersCount": "10_50",
      "targetAudience": "other",
      "proposedSolution": "Model scores resumes and auto-rejects low scorers before a human reviews them.",
      "businessValue": "Less screening time.",
      "costSavings": "50k_250k",
      "usptoFocusArea": [
            "goal_employee_experience"
      ],
      "successMetrics": "Screening hours saved.",
      "timelineForResults": "3_6",
      "implementationComplexity": "medium",
      "involvesSensitiveData": "yes",
      "aiModelSourcing": "unknown",
      "aiDecisionalImpact": "yes",
      "aiHumanReview": "no",
      "readinessScore": "early_stage",
      "readinessSummary": "Rejected: auto-rejecting candidates is a decisional use affecting individuals, involves PII, and carries significant bias/EEO risk with no human review. Not appropriate for adoption as scoped.",
      "executiveSummary": "This proposes AI that auto-rejects job candidates before any human review — a decisional use affecting individuals, involving PII, with substantial bias and EEO exposure and no human in the loop. Declined as scoped. A human-in-the-loop assistive version would need legal/EEO review before reconsideration.",
      "reviewStatus": "rejected"
} as Partial<FormData>),
  },
]

// ── DEMO in-progress draft (Commerce / Doug Freeman) ──
// A third, related idea left mid-wizard so the demo can show "save and resume."
// This is NOT a submission — the landing/home "Resume" affordance reads the
// in-progress draft straight from localStorage (aid-form-data + aid-current-step),
// independent of which user is signed in. Resumes at the Solution step with the
// problem already captured.
const DEMO_DRAFT_FORM_KEY = "aid-form-data"
const DEMO_DRAFT_STEP_KEY = "aid-current-step"
const DEMO_DRAFT_STEP = "3" // Solution step (problem already filled)

const DEMO_IN_PROGRESS_DRAFT: Partial<FormData> = {
  useCaseDescription:
    "Proactively tell customers, in plain language, when their application status changes — so they stop having to call or email just to ask 'where is my application?'",
  publicIndicator: "public",
  targetAudience: "applicant",
  impactedUsersCount: "gt_500",
  painPoints:
    "Customers have no easy way to know when their application moves forward, so they contact the call center just to ask for a status update — and the updates that do exist are written in internal jargon they can't interpret.",
  targetUserContext:
    "Members of the public and businesses waiting on an application decision from a public-facing Commerce service.",
  targetUserSummary:
    "The public and businesses awaiting an application outcome from a Commerce public service.",
  coreProblem:
    "Customers are left in the dark between status changes, so they generate avoidable call and email volume asking for updates — and when they do see a status, it's in language they can't understand.",
  problemImpact:
    "A large share of contact-center volume is simple 'what's my status / what does this mean' inquiries that a proactive, plain-language notification could prevent.",
  affectedSystem: "cross_functional",
  problemType: ["user_experience", "productivity"],
  severity: "medium",
}

/** Install the demo in-progress draft into localStorage. With force=false, it
 *  won't clobber a real draft the user already has in progress. */
function installDemoDraft(force: boolean): void {
  if (typeof window === "undefined") return
  try {
    if (!force && localStorage.getItem(DEMO_DRAFT_FORM_KEY)) return
    localStorage.setItem(DEMO_DRAFT_FORM_KEY, JSON.stringify(DEMO_IN_PROGRESS_DRAFT))
    localStorage.setItem(DEMO_DRAFT_STEP_KEY, DEMO_DRAFT_STEP)
  } catch (error) {
    console.error("Failed to install demo in-progress draft:", error)
  }
}

/**
 * Seeds the demo submissions into localStorage if (a) there are no existing
 * submissions, OR (b) the seed marker is missing or out of date. Safe to call
 * multiple times — idempotent based on the version marker.
 *
 * Call once at app load (e.g. from RequireAuth or RecentDrafts) to ensure the
 * Decision Center is populated on first demo open.
 */
export function seedDemoSubmissionsIfEmpty(): void {
  if (typeof window === "undefined") return
  try {
    const marker = localStorage.getItem(SEED_MARKER)
    if (marker === CURRENT_SEED_VERSION) return // already seeded with this version

    const existing = localStorage.getItem(STORAGE_KEY)
    let existingArr: Submission[] = []
    if (existing) {
      try {
        const parsed = JSON.parse(existing)
        if (Array.isArray(parsed)) existingArr = parsed
      } catch {
        existingArr = []
      }
    }

    // If a user has REAL submissions already (any submission not from seeds),
    // don't overwrite — just mark the seed version so we don't keep checking.
    const hasUserSubmissions = existingArr.some((s) => !s.id?.startsWith("seed-"))
    if (hasUserSubmissions) {
      localStorage.setItem(SEED_MARKER, CURRENT_SEED_VERSION)
      return
    }

    // Otherwise: install the seed set fresh.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSubmissions))
    localStorage.setItem(SEED_MARKER, CURRENT_SEED_VERSION)
    // Also stage the demo in-progress draft (won't overwrite a real one).
    installDemoDraft(false)
  } catch (error) {
    console.error("Failed to seed demo submissions:", error)
  }
}

/**
 * Force re-seed. Useful for an admin "reset demo data" action.
 */
export function reseedDemoSubmissions(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedSubmissions))
    localStorage.setItem(SEED_MARKER, CURRENT_SEED_VERSION)
    // Force-stage the demo in-progress draft on an explicit reset.
    installDemoDraft(true)
  } catch (error) {
    console.error("Failed to reseed demo submissions:", error)
  }
}
