// F4-3 (#304): the CPE-wide part of the ES2 demo seed. 26 ideas that, with the
// 16 in lib/seedSubmissionsEs2.ts, give all five program offices a believable
// portfolio: AT&R 15, HR-FM 9, LOG-FIN 8, BTS 7, C-ERP 3 (the split in the
// approved portfolio-report mock).
//
// Two new duplicate clusters live here, each across two program offices:
//   - duplicate payment check: HR-FM + LOG-FIN
//   - support request routing: BTS + C-ERP
// `similarity()` is word overlap, so the members of a cluster share real
// phrases in title, problem and solution. Every other idea is written to stay
// clear of them and of the supplier past-performance cluster.
//
// Every date is worked out from "now" (days before the reset), never typed in.
// No new users: every email is in db/migrations/es2/0001_es2_users_seed.sql.
// C-ERP has a reviewer (Maria Santos) and no submitter account, so she files
// the C-ERP ideas and Avery Lang (enterprise admin) decides the one decided
// C-ERP idea, so nobody approves their own idea.

import type { FormData } from "@/lib/steps"
import { initialFormData } from "@/lib/steps"
import { type Submission } from "@/lib/submissions"

const daysAgo = (d: number) => new Date(Date.now() - 1000 * 60 * 60 * 24 * d).toISOString()

type Person = { name: string; email: string }
const P = {
  marcus: { name: "Marcus Bell", email: "marcus.bell@es2.demo" },
  priya: { name: "Priya Nair", email: "priya.nair@es2.demo" },
  victor: { name: "Victor Hale", email: "victor.hale@es2.demo" },
  renee: { name: "Renee Calder", email: "renee.calder@es2.demo" },
  sofia: { name: "Sofia Marquez", email: "sofia.marquez@es2.demo" },
  andre: { name: "Andre Duval", email: "andre.duval@es2.demo" },
  maria: { name: "Maria Santos", email: "maria.santos@es2.demo" },
  jordan: { name: "Jordan Pierce", email: "jordan.pierce@es2.demo" },
  karen: { name: "Karen Udall", email: "karen.udall@es2.demo" },
  derek: { name: "Derek Hsu", email: "derek.hsu@es2.demo" },
  avery: { name: "Avery Lang", email: "avery.lang@es2.demo" },
} satisfies Record<string, Person>

type Risk = "low" | "medium" | "high"
type Status = "submitted" | "in_review" | "needs_info" | "approved" | "rejected"

type Idea = {
  id: string
  unit: string
  program?: string
  by: Person
  role: string
  status: Status
  submittedDaysAgo: number
  title: string
  description: string
  coreProblem: string
  proposedSolution: string
  audience: string
  systems: string[]
  focus: string[]
  savings: string
  complexity: string
  /** Risk answers; left empty on "submitted" ideas (not assessed yet). */
  risk?: Risk
  /** Decided ideas only. */
  decision?: { by: Person; daysAgo: number; reason: string }
}

function riskAnswers(risk: Risk): Partial<FormData> {
  if (risk === "high") {
    return { involvesSensitiveData: "yes", aiDecisionalImpact: "yes", aiModelSourcing: "american_built", aiHumanReview: "no" }
  }
  if (risk === "medium") {
    return { involvesSensitiveData: "yes", aiDecisionalImpact: "no", aiModelSourcing: "american_built", aiHumanReview: "yes" }
  }
  return { involvesSensitiveData: "no", aiDecisionalImpact: "no", aiModelSourcing: "american_built", aiHumanReview: "yes" }
}

function build(i: Idea): Submission {
  const base: Record<string, unknown> = {
    ...initialFormData,
    submitterName: i.by.name,
    submitterEmail: i.by.email,
    submitterRole: i.role,
    submitterOffice: i.unit,
    submitterSubOffice: i.program ?? "",
    reviewStatus: i.status,
    useCaseTitle: i.title,
    useCaseDescription: i.description,
    isWithheld: "no",
    targetAudience: i.audience,
    impactedUsersCount: "50_500",
    painPoints: i.coreProblem,
    coreProblem: i.coreProblem,
    problemDefinition: i.coreProblem,
    affectedBusinessUnits: i.systems,
    problemType: ["productivity"],
    severity: "medium",
    proposedSolution: i.proposedSolution,
    solutionSummary: i.proposedSolution,
    deliveryAudience: "internal",
    userTimeSavings: "1_5",
    costSavings: i.savings,
    strategicBenefit: ["operational_efficiency"],
    usptoFocusArea: i.focus,
    implementationComplexity: i.complexity,
    timelineForResults: "3_6",
    routeTo: ["governance"],
    readinessScore: i.status === "submitted" ? "needs_work" : "ready",
  }

  if (i.status !== "submitted" && i.risk) Object.assign(base, riskAnswers(i.risk))

  if (i.status === "in_review" || i.status === "needs_info") {
    // Some governance in, some deliberately still open (hasATO empty).
    Object.assign(base, {
      stageOfDevelopment: "pre_deployment",
      highImpact: i.risk === "high" ? "high_impact" : "not_high_impact",
      securityClassification: "controlled",
      impactLevel: "cui",
      scalable: "yes",
      hasATO: "",
    })
  }

  if (i.status === "approved" || i.status === "rejected") {
    const d = i.decision!
    Object.assign(base, {
      stageOfDevelopment: i.status === "approved" ? "pilot" : "pre_deployment",
      highImpact: i.risk === "high" ? "high_impact" : "not_high_impact",
      securityClassification: "controlled",
      impactLevel: "cui",
      scalable: "yes",
      hasATO: i.status === "approved" ? "yes" : "no",
      systemSource: "in_house",
      preDeploymentTesting: i.status === "approved" ? "yes" : "no",
      ongoingMonitoringPlan: i.status === "approved" ? "yes" : "no",
      bureauSignoff: {
        bureau: i.unit,
        decision: i.status,
        signedOffByName: d.by.name,
        signedOffByEmail: d.by.email,
        signedOffAt: daysAgo(d.daysAgo),
      },
      comments: [
        {
          id: `c-${i.id.replace(/^es2-/, "")}-1`,
          authorName: d.by.name,
          authorRole: d.by === P.avery ? "admin" : "reviewer",
          body: d.reason,
          createdAt: daysAgo(d.daysAgo),
        },
      ],
    })
  }

  return { id: i.id, submittedAt: daysAgo(i.submittedDaysAgo), formData: base as unknown as FormData }
}

const IDEAS: Idea[] = [
  // ─── AT&R: three more, none decided (AT&R already has five decisions) ────
  {
    id: "es2-atis-instructor-feedback-themes",
    unit: "atr", program: "atis", by: P.priya, role: "training_developer", status: "in_review", submittedDaysAgo: 18,
    title: "Instructor Feedback Themes For Course Updates",
    description: "Groups end-of-course comments from students and instructors into a short list of recurring themes, so course owners know which lessons to revise first.",
    coreProblem: "End-of-course comments pile up as free text and are rarely read in full, so the same lesson problems repeat class after class.",
    proposedSolution: "Group the comments for each course into recurring themes with example quotes, ranked by how often they appear, for the course owner to review each quarter.",
    audience: "training_developer", systems: ["training_management"], focus: ["atr_training_currency"],
    savings: "lt_50k", complexity: "low", risk: "low",
  },
  {
    id: "es2-digitalmarket-listing-completeness",
    unit: "atr", program: "digitalmarket", by: P.victor, role: "product_owner", status: "submitted", submittedDaysAgo: 3,
    title: "Catalog Listing Completeness Check",
    description: "Checks each new marketplace catalog listing for missing part numbers, units of issue and pricing terms before it is published.",
    coreProblem: "Listings go live with missing part numbers or units of issue, and buyers then call the program office to ask what they are ordering.",
    proposedSolution: "A completeness check that runs when a listing is saved, highlights the missing or unusual entries, and holds publication until the listing owner fixes or confirms them.",
    audience: "industry_partner", systems: ["acquisition_marketplace"], focus: ["atr_acquisition_efficiency"],
    savings: "lt_50k", complexity: "low",
  },
  {
    id: "es2-acws-modification-request-sorting",
    unit: "atr", program: "acws", by: P.marcus, role: "analyst", status: "submitted", submittedDaysAgo: 10,
    title: "Contract Modification Request Sorting",
    description: "Sorts incoming contract modification requests into administrative, funding and scope changes so each goes to the right specialist on day one.",
    coreProblem: "Modification requests arrive in one shared queue and wait days before someone reads each one and decides which specialist should take it.",
    proposedSolution: "Read each modification request as it arrives, suggest whether it is an administrative, funding or scope change, and place it in that specialist's queue for confirmation.",
    audience: "contract_specialist", systems: ["contract_writing"], focus: ["atr_contract_speed"],
    savings: "50k_250k", complexity: "medium",
  },

  // ─── HR-FM: eight more ───────────────────────────────────────────────────
  {
    id: "es2-hrfm-personnel-action-completeness",
    unit: "hrfm", by: P.renee, role: "analyst", status: "approved", submittedDaysAgo: 36,
    title: "Personnel Action Packet Completeness Check",
    description: "Checks personnel action packets for missing forms and signatures before they reach the processing center.",
    coreProblem: "About one packet in five comes back from the processing center for a missing form or signature, which adds weeks to a simple action.",
    proposedSolution: "Check each packet against the list of forms and signatures its action type needs, and show the specialist what is missing before the packet is sent.",
    audience: "analyst", systems: ["human_resources"], focus: ["hrfm_personnel_data"],
    savings: "50k_250k", complexity: "low", risk: "medium",
    decision: { by: P.jordan, daysAgo: 25, reason: "Approved for a pilot in two offices. The check only lists what is missing; the specialist still decides what to send. Personnel data stays inside the accredited system." },
  },
  {
    id: "es2-hrfm-reenlistment-eligibility",
    unit: "hrfm", by: P.renee, role: "analyst", status: "rejected", submittedDaysAgo: 33,
    title: "Automatic Reenlistment Eligibility Decisions",
    description: "Reads service records and issues a reenlistment eligibility decision for each Soldier without a career counselor reviewing it.",
    coreProblem: "Career counselors spend hours confirming eligibility for routine reenlistments, and the backlog peaks at the end of each fiscal year.",
    proposedSolution: "Apply the eligibility rules to each service record and post the decision straight to the Soldier's record, with no counselor review before it takes effect.",
    audience: "soldier", systems: ["human_resources"], focus: ["hrfm_force_decisions"],
    savings: "250k_1m", complexity: "medium", risk: "high",
    decision: { by: P.jordan, daysAgo: 21, reason: "Not approved as written. The tool decides a Soldier's eligibility with no person reviewing it and no clear way to appeal. Resubmit as a checklist the counselor confirms, and we will look again." },
  },
  {
    id: "es2-hrfm-assignment-matching",
    unit: "hrfm", by: P.renee, role: "analyst", status: "in_review", submittedDaysAgo: 15,
    title: "Assignment Matching That Issues Orders Directly",
    description: "Matches Soldiers to open positions from their records and preferences and issues the assignment orders without an assignment officer approving each match.",
    coreProblem: "Assignment officers balance hundreds of preferences and open positions by hand each cycle, and the cycle regularly runs late.",
    proposedSolution: "Score every Soldier and position pairing, pick the best overall set of matches, and issue the orders directly once the cycle closes.",
    audience: "soldier", systems: ["human_resources"], focus: ["hrfm_force_decisions"],
    savings: "250k_1m", complexity: "high", risk: "high",
  },
  {
    id: "es2-hrfm-bonus-eligibility",
    unit: "hrfm", by: P.renee, role: "analyst", status: "in_review", submittedDaysAgo: 13,
    title: "Incentive Pay Eligibility Without Manual Review",
    description: "Decides which personnel qualify for retention incentive pay and starts the payment, with no pay specialist checking the result.",
    coreProblem: "Incentive pay eligibility is checked by hand against several rules, so qualified people wait months for payments they are owed.",
    proposedSolution: "Apply the incentive rules to each personnel record, mark the qualified records, and start the payments automatically at the end of each month.",
    audience: "supervisor", systems: ["human_resources", "logistics_finance"], focus: ["hrfm_force_decisions"],
    savings: "50k_250k", complexity: "medium", risk: "high",
  },
  {
    id: "es2-hrfm-duplicate-payment-check",
    unit: "hrfm", by: P.renee, role: "analyst", status: "submitted", submittedDaysAgo: 7,
    title: "Duplicate Payment Check For Relocation And Travel Claims",
    description: "Flags relocation and travel claims that look like a duplicate payment of a claim already paid, before the payment is released.",
    coreProblem: "The same relocation or travel claim is sometimes paid twice when it is resubmitted, and recovering a duplicate payment takes months.",
    proposedSolution: "Compare each new claim with claims already paid, using the traveler, dates, amounts and receipts, and hold any likely duplicate payment for a person to check before release.",
    audience: "analyst", systems: ["human_resources", "logistics_finance"], focus: ["hrfm_self_service"],
    savings: "250k_1m", complexity: "medium",
  },
  {
    id: "es2-hrfm-record-correction-routing",
    unit: "hrfm", by: P.renee, role: "analyst", status: "submitted", submittedDaysAgo: 2,
    title: "Personnel Record Correction Requests To The Right Team",
    description: "Reads record correction requests and suggests which personnel team owns the field being corrected.",
    coreProblem: "Correction requests bounce between teams because the requester cannot tell which team owns the field they want fixed.",
    proposedSolution: "Suggest the owning team for each correction request from the fields it mentions, and let the receiving team accept or send it on.",
    audience: "soldier", systems: ["human_resources"], focus: ["hrfm_self_service"],
    savings: "lt_50k", complexity: "low",
  },
  {
    id: "es2-hrfm-hiring-package-status",
    unit: "hrfm", by: P.renee, role: "analyst", status: "needs_info", submittedDaysAgo: 17,
    title: "Civilian Hiring Package Status In Plain Words",
    description: "Answers hiring managers' questions about where a civilian hiring package stands and what step comes next.",
    coreProblem: "Hiring managers email the personnel office for status on every package because the system shows codes they cannot read.",
    proposedSolution: "Turn the package status codes into a plain sentence on what has happened and what comes next, shown to the hiring manager on request.",
    audience: "supervisor", systems: ["human_resources"], focus: ["hrfm_self_service"],
    savings: "lt_50k", complexity: "low", risk: "medium",
  },
  {
    id: "es2-hrfm-civilian-training-due-dates",
    unit: "hrfm", by: P.renee, role: "analyst", status: "submitted", submittedDaysAgo: 19,
    title: "Mandatory Training Due Date Reminders For Civilians",
    description: "Lists each civilian employee's mandatory courses that fall due in the next 60 days and sends the list to their supervisor.",
    coreProblem: "Supervisors find out about overdue mandatory courses from compliance reports after the date has passed.",
    proposedSolution: "Each month, list the mandatory courses falling due for each employee in the next 60 days and send that list to the supervisor.",
    audience: "supervisor", systems: ["human_resources"], focus: ["hrfm_personnel_data"],
    savings: "lt_50k", complexity: "low",
  },

  // ─── LOG-FIN: six more ───────────────────────────────────────────────────
  {
    id: "es2-logfin-unliquidated-obligations",
    unit: "logfin", by: P.sofia, role: "analyst", status: "approved", submittedDaysAgo: 30,
    title: "Unliquidated Obligation Review Order",
    description: "Ranks open obligations by how likely they are to be stale, so analysts review the ones most likely to free up funds first.",
    coreProblem: "Analysts review open obligations in a fixed order each quarter, so stale obligations that could free up funds are found late.",
    proposedSolution: "Rank open obligations by age, activity and past patterns of stale obligations, and give analysts a review list they can reorder.",
    audience: "analyst", systems: ["logistics_finance"], focus: ["logfin_financial_integrity"],
    savings: "250k_1m", complexity: "medium", risk: "low",
    decision: { by: P.karen, daysAgo: 21, reason: "Approved. It orders the review list only; analysts still decide every action. Good audit trail and an easy measure of funds freed." },
  },
  {
    id: "es2-logfin-invoice-mismatch-notes",
    unit: "logfin", by: P.sofia, role: "analyst", status: "approved", submittedDaysAgo: 28,
    title: "Invoice Mismatch Explanations For Payment Technicians",
    description: "Explains in one sentence why an invoice failed to match its order and receipt, so technicians resolve mismatches faster.",
    coreProblem: "Technicians open three records to work out why an invoice did not match, and most mismatches have one of a handful of causes.",
    proposedSolution: "For each invoice that fails to match, compare it with the order and receipt and state the likely cause in one sentence beside the mismatch.",
    audience: "analyst", systems: ["logistics_finance"], focus: ["logfin_audit_sustainment"],
    savings: "50k_250k", complexity: "low", risk: "low",
    decision: { by: P.karen, daysAgo: 17, reason: "Approved. Low risk: the note explains a mismatch and the technician still resolves it. Start with one paying office and measure time to resolve." },
  },
  {
    id: "es2-logfin-automatic-vendor-holds",
    unit: "logfin", by: P.sofia, role: "analyst", status: "rejected", submittedDaysAgo: 26,
    title: "Automatic Holds On Payments To Flagged Businesses",
    description: "Places payment holds on businesses a model flags as risky, with no finance officer confirming the hold first.",
    coreProblem: "Finance officers spot risky payees late, after payments have gone out.",
    proposedSolution: "Score each payee from its payment history and outside records, and place an automatic hold on every payment to a payee above the risk line.",
    audience: "analyst", systems: ["logistics_finance"], focus: ["logfin_financial_integrity"],
    savings: "250k_1m", complexity: "high", risk: "high",
    decision: { by: P.karen, daysAgo: 9, reason: "Not approved. Holding a business's payment is a decision about that business, and here no person confirms it and there is no way to contest it. Resubmit with a finance officer confirming every hold." },
  },
  {
    id: "es2-logfin-duplicate-payment-check",
    unit: "logfin", by: P.sofia, role: "analyst", status: "submitted", submittedDaysAgo: 5,
    title: "Duplicate Payment Check Before Disbursement",
    description: "Flags travel claims and invoices that look like a duplicate payment of something already paid, before the money goes out.",
    coreProblem: "Resubmitted claims and invoices are sometimes paid twice, and recovering a duplicate payment takes months of letters and offsets.",
    proposedSolution: "Compare each claim or invoice with payments already made, using the payee, dates, amounts and receipts, and hold any likely duplicate payment for a person to check before release.",
    audience: "analyst", systems: ["logistics_finance"], focus: ["logfin_financial_integrity"],
    savings: "250k_1m", complexity: "medium",
  },
  {
    id: "es2-logfin-depot-parts-forecast",
    unit: "logfin", by: P.sofia, role: "analyst", status: "in_review", submittedDaysAgo: 11,
    title: "Spare Parts Demand Forecast For Depot Repair",
    description: "Forecasts which spare parts depot repair lines will need next quarter, so orders are placed before lines stop.",
    coreProblem: "Repair lines stop when a common part runs out, because orders follow last quarter's usage instead of the coming workload.",
    proposedSolution: "Forecast part demand from the scheduled repair workload and past usage per repair, and show item managers the parts likely to run short.",
    audience: "analyst", systems: ["logistics_finance"], focus: ["logfin_supply_visibility"],
    savings: "250k_1m", complexity: "medium", risk: "low",
  },
  {
    id: "es2-logfin-fund-balance-variance",
    unit: "logfin", by: P.sofia, role: "analyst", status: "submitted", submittedDaysAgo: 4,
    title: "Fund Balance Variance Notes For Monthly Close",
    description: "Drafts a short note for each fund balance variance at monthly close, naming the transactions that explain it.",
    coreProblem: "Each monthly close, analysts trace every fund balance variance back to its transactions by hand.",
    proposedSolution: "For each variance over the reporting line, list the transactions that explain it and a one-line note the analyst can accept or change.",
    audience: "analyst", systems: ["logistics_finance"], focus: ["logfin_audit_sustainment"],
    savings: "50k_250k", complexity: "medium",
  },

  // ─── BTS: six more ───────────────────────────────────────────────────────
  {
    id: "es2-bts-license-right-sizing",
    unit: "bts", by: P.andre, role: "it_staff", status: "approved", submittedDaysAgo: 24,
    title: "Software License Right-Sizing",
    description: "Finds software licenses that have not been used in 90 days and lists them for reassignment before renewal.",
    coreProblem: "Licenses are renewed at the same count every year, and nobody can see how many seats sit unused.",
    proposedSolution: "Compare license assignments with sign-in records, list seats unused for 90 days, and give each license owner a reassign or release list before renewal.",
    audience: "program_manager", systems: ["it_systems"], focus: ["bts_reduce_duplication"],
    savings: "250k_1m", complexity: "low", risk: "low",
    decision: { by: P.derek, daysAgo: 18, reason: "Approved. Clear savings and low risk: owners decide every release. Run it before the next renewal cycle." },
  },
  {
    id: "es2-bts-policy-chat-front-end",
    unit: "bts", by: P.andre, role: "it_staff", status: "rejected", submittedDaysAgo: 22,
    title: "Separate Chat Tool For Policy Questions",
    description: "A new chat tool, built and hosted by BTS, that answers staff questions about IT policy.",
    coreProblem: "Staff cannot find the right IT policy page and ask the same questions again and again.",
    proposedSolution: "Build and host a separate chat tool that answers IT policy questions from the policy pages.",
    audience: "other", systems: ["it_systems"], focus: ["bts_experience"],
    savings: "lt_50k", complexity: "medium", risk: "low",
    decision: { by: P.derek, daysAgo: 12, reason: "Not approved. The enterprise already has an approved assistant that staff can point at these policy pages. A second tool doubles hosting and accreditation for the same result." },
  },
  {
    id: "es2-bts-support-request-routing",
    unit: "bts", by: P.andre, role: "it_staff", status: "submitted", submittedDaysAgo: 6,
    title: "Support Request Routing To The Right Resolver Group",
    description: "Reads each new support request and routes it to the resolver group most likely to fix it, instead of a first-line queue.",
    coreProblem: "Support requests wait in a first-line queue and are reassigned two or three times before reaching the resolver group that can fix them.",
    proposedSolution: "Read each support request, suggest the resolver group from the words used and from how similar requests were resolved, and route it there with a person able to reassign it.",
    audience: "other", systems: ["it_systems"], focus: ["bts_experience"],
    savings: "50k_250k", complexity: "medium",
  },
  {
    id: "es2-bts-access-review-evidence",
    unit: "bts", by: P.andre, role: "it_staff", status: "in_review", submittedDaysAgo: 9,
    title: "Account Access Review Evidence Packets",
    description: "Pulls the account lists and approvals each system owner needs for the quarterly access review into one packet.",
    coreProblem: "System owners spend days each quarter collecting account lists and approvals for the access review.",
    proposedSolution: "Collect each system's current accounts and the approval on file for each one into a single packet the owner signs.",
    audience: "program_manager", systems: ["it_systems"], focus: ["bts_modernization"],
    savings: "50k_250k", complexity: "low", risk: "low",
  },
  {
    id: "es2-bts-legacy-interface-inventory",
    unit: "bts", by: P.andre, role: "developer", status: "needs_info", submittedDaysAgo: 16,
    title: "Legacy Interface Inventory",
    description: "Builds a list of the file and data interfaces between legacy systems, from job schedules and configuration files.",
    coreProblem: "Nobody has a full list of the interfaces between legacy systems, so retirements stall on surprise dependencies.",
    proposedSolution: "Read job schedules and configuration files to list every interface, its source, its target and how often it runs, for system owners to confirm.",
    audience: "program_manager", systems: ["it_systems"], focus: ["bts_modernization"],
    savings: "50k_250k", complexity: "medium", risk: "low",
  },
  {
    id: "es2-bts-hosting-cost-alerts",
    unit: "bts", by: P.andre, role: "it_staff", status: "submitted", submittedDaysAgo: 12,
    title: "Hosting Cost Spike Alerts",
    description: "Warns system owners when a system's monthly hosting bill is on track to run well above its normal level.",
    coreProblem: "Hosting cost spikes are found when the monthly bill arrives, weeks after the cause.",
    proposedSolution: "Watch each system's daily hosting spend against its usual pattern and alert the owner when the month is on track to run well over.",
    audience: "program_manager", systems: ["it_systems"], focus: ["bts_reduce_duplication"],
    savings: "50k_250k", complexity: "low",
  },

  // ─── C-ERP: three ────────────────────────────────────────────────────────
  {
    id: "es2-cerp-material-master-cleanup",
    unit: "cerp", by: P.maria, role: "program_manager", status: "approved", submittedDaysAgo: 20,
    title: "Material Master Record Cleanup Before Consolidation",
    description: "Finds material master records that describe the same item under different numbers, ahead of consolidating the ERP instances.",
    coreProblem: "The same item exists under several material numbers across ERP instances, which will multiply after consolidation.",
    proposedSolution: "Compare material descriptions, units and part numbers across instances, propose groups that look like the same item, and let data stewards confirm each merge.",
    audience: "analyst", systems: ["logistics_finance", "it_systems"], focus: ["cerp_consolidation"],
    savings: "250k_1m", complexity: "medium", risk: "low",
    decision: { by: P.avery, daysAgo: 8, reason: "Approved. Data stewards confirm every merge, so nothing changes without a person. This directly lowers the risk of the consolidation." },
  },
  {
    id: "es2-cerp-support-request-routing",
    unit: "cerp", by: P.maria, role: "program_manager", status: "submitted", submittedDaysAgo: 8,
    title: "Support Request Routing For ERP Users",
    description: "Reads each ERP support request and routes it to the resolver group most likely to fix it, instead of a general queue.",
    coreProblem: "ERP support requests wait in a general queue and are reassigned several times before reaching the resolver group that can fix them.",
    proposedSolution: "Read each support request, suggest the resolver group from the words used and from how similar requests were resolved, and route it there with a person able to reassign it.",
    audience: "other", systems: ["it_systems", "logistics_finance"], focus: ["cerp_auditability"],
    savings: "50k_250k", complexity: "medium",
  },
  {
    id: "es2-cerp-interface-failure-warning",
    unit: "cerp", by: P.maria, role: "program_manager", status: "in_review", submittedDaysAgo: 14,
    title: "Early Warning On Nightly ERP Job Failures",
    description: "Warns the operations team when a nightly ERP job is running in a way that has led to failures before.",
    coreProblem: "Nightly ERP jobs fail without warning, and finance users find out the next morning when reports are empty.",
    proposedSolution: "Watch each nightly job's run time and record counts against its normal pattern and alert operations while there is still time to rerun it.",
    audience: "other", systems: ["it_systems"], focus: ["cerp_retire_legacy"],
    savings: "50k_250k", complexity: "low", risk: "low",
  },
]

export const es2CpeSeedSubmissions: Submission[] = IDEAS.map(build)
