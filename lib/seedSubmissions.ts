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
const CURRENT_SEED_VERSION = "v1-2026-05-15"

function mk(partial: Partial<FormData>): FormData {
  return { ...initialFormData, ...partial }
}

// Five submissions across business units, readiness levels, and themes.
// All dates are recent enough to feel live but staggered for realism.
const seedSubmissions: Submission[] = [
  // 1) Patents — READY. Strong example, shows the tool's "ideal" state.
  {
    id: "seed-patents-prior-art",
    submittedAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), // ~1.25 days ago
    formData: mk({
      submitterName: "Dr. Anita Krishnan",
      submitterEmail: "anita.krishnan@uspto.gov",
      submitterRole: "patent_examiner",
      submitterOffice: "patents",

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
]

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
  } catch (error) {
    console.error("Failed to reseed demo submissions:", error)
  }
}
