import type { TenantConfig } from "./types"

// Army CPE ES2 tenant — Enterprise Software and Services, the portfolio that
// delivers the Army's business systems (contract writing, training management,
// foreign military sales, logistics and finance, human resources, enterprise
// IT acquisition).
//
// A configured instance of the same product DoC runs, not a second product:
// `productName` stays "Keystone" and `assistantName` stays "Plumb".
//
// The org taxonomy here is the PROGRAM OFFICE; AT&R also declares `offices`
// (its programs), giving a third tier: Enterprise -> Program Office -> Program.
// Every `unit.option` declares its own `focusAreas`, which is what makes
// `tenantHasBureauTier()` true for this tenant — deliberately, since that gate
// turns on sign-off, cross-program rationalization, and the roll-up views the
// demo needs (see lib/rationalization.ts).
//
// NAMING RULE, throughout this file: the department is the Department of War /
// DoW, and no other abbreviation for it appears in any string here — a test in
// tenant.test.ts enforces that. Published document names and directive numbers
// keep what they were published as, which is why `humanReviewCitation` reads
// "DoDD 3000.09" and `srgCaveat` names the Cloud Computing SRG with no
// department prefix.
//
// Register in lib/tenant/index.ts:  const TENANTS = { uspto, dow, doc, es2 }.
// Deploy with NEXT_PUBLIC_TENANT=es2.
//
// The `unit.options` and `offices` VALUES below are load-bearing: the seed data
// and db/migrations/es2/0000_es2_base_schema.sql's column comments reference
// them. The five program-office labels and the four AT&R program labels are
// verbatim from the organization's own published org chart — including
// "Training and Readiness" rather than an ampersand, and the en dash in the
// FMS-ACES name. Do not restyle them.
export const es2: TenantConfig = {
  id: "es2",
  shortName: "CPE ES2",
  orgName: "Enterprise Software and Services",
  productName: "Keystone",
  assistantName: "Plumb",
  logoSubtitle: "AI Use Case Governance",
  sidebarTagline: "AI use case governance",
  heroHeadline: "Move fast on AI without losing the record.",
  heroSubtitle:
    "One front door for AI ideas across the enterprise. Capture an idea in two minutes, let reviewers complete the governance record, and keep an inventory you can hand your chain of command on demand.",
  // `heroImage` deliberately unset — the hero falls back to `theme.primary` as
  // a clean solid background rather than inheriting another org's imagery.
  loginEmailPlaceholder: "you@es2.demo",
  publicInquiryEmail: "ai.inventory@es2.demo",

  strategicContext: `
Enterprise Software and Services delivers the business systems the Army runs on: contract writing, training management, foreign military sales, logistics and finance, human resources, and enterprise IT acquisition. Its stated mission is standardizing, streamlining, and sharing critical data across the Army, the Department of War, and industry partners.

Reason about every idea using the AI Hierarchy of Needs: quality, AI-ready data is the foundation, analytics sits on top of it, and Responsible AI governs the whole stack. An idea with no realistic data foundation is not yet a use case, no matter how good the concept.

The Department of War's AI Strategy pushes for speed: name priority projects quickly, field capability fast, and let small accountable teams move rather than waiting on process. Speed is the goal. It does not remove the obligation to keep a defensible record of what was fielded, what data it used, and who stayed accountable for the decision.

Every AI use here must satisfy the DoW AI Ethical Principles:
- Responsible: appropriate human judgment and care; people remain accountable
- Equitable: deliberate steps to minimize unintended bias
- Traceable: transparent, auditable methods, data sources, and design; for generative AI that means citations and hallucination controls
- Reliable: explicit, well-defined uses, tested for safety and security across the lifecycle
- Governable: detect and avoid unintended behavior, with the ability to disengage

Data is managed to the VAULTIS standard: visible, accessible, understandable, linked, trustworthy, interoperable, secure.

A serious idea here does six things: (1) names the program and the mission outcome it improves, and the mechanism; (2) states whether AI-ready, accessible data exists today or has to be built; (3) states its data classification and required Impact Level (unclassified to IL2, CUI to IL4 or IL5, Secret to IL6); (4) states the human-judgment posture — who decides, where a person reviews, how it can be turned off; (5) states its maturity (TRL 1-9) and a plan to mature or sustain it; (6) says plainly what it does not address.

Push back on these patterns. Vague modernization or efficiency with no named outcome. No data-readiness plan, which oversight bodies repeatedly identify as the most common reason government AI efforts fail. No human oversight. Automated decisions about people, awards, or careers with no review. No test-and-evaluation story. Value claims with no number behind them, or claims that ignore what the thing costs to sustain.

Use the submitter's own words. Never invent facts, figures, program names, or dollar amounts.
`,

  leadershipPriorities: "readiness, delivery speed, audit defensibility, and sustainment cost",

  // Enterprise-level fallback, used when no program office is selected (see
  // getFocusAreasForUnit in lib/strategicFocusAreas.ts). Each program office
  // declares its own list below and takes precedence when one is chosen.
  focusAreas: [
    { id: "dow_ai_first", label: "AI-first operations", category: "DoW AI Strategy" },
    { id: "dow_enterprise_agents", label: "Enterprise agents and GenAI access", category: "DoW AI Strategy" },
    { id: "dow_data_catalogs", label: "Federated, discoverable data", category: "DoW AI Strategy" },
    { id: "dow_deployment_velocity", label: "Deployment velocity", category: "DoW AI Strategy" },
    { id: "rai_responsible", label: "Responsible (judgment, care, accountability)", category: "DoW AI Ethical Principles" },
    { id: "rai_equitable", label: "Equitable (minimize unintended bias)", category: "DoW AI Ethical Principles" },
    { id: "rai_traceable", label: "Traceable (transparent, auditable)", category: "DoW AI Ethical Principles" },
    { id: "rai_reliable", label: "Reliable (tested for safety and security)", category: "DoW AI Ethical Principles" },
    { id: "rai_governable", label: "Governable (detect and avoid unintended behavior)", category: "DoW AI Ethical Principles" },
  ],

  // Public landing's "strategic priorities, for reference" columns — the same
  // two groups as `focusAreas` above, in the shape that section renders.
  // Internal inventory to the same field set, not a published federal one.
  inventoryLabel: "AI use case inventory",
  inventoryShortLabel: "Inventory",
  minimumPracticesLabel: "High-impact AI minimum practices",
  inventoryFileName: "es2-ai-use-case-inventory.csv",
  inventoryColumnLabels: { agency: "Organization", agencyBureau: "Program Office" },
  inventoryAuthority: "the widely-used commercial AI category rule in the Department's internal inventory guidance",

  landingObjectives: [
    {
      title: "Department of War AI Strategy",
      subtitle: "What the enterprise is being pushed toward",
      items: [
        { title: "AI-first operations", description: "Make AI the default way routine enterprise work gets done, not a side project." },
        { title: "Enterprise agents and GenAI access", description: "Put governed generative AI and agents in reach of the people doing the work." },
        { title: "Federated, discoverable data", description: "Catalog data where it lives so it can be found, trusted, and reused across programs." },
        { title: "Deployment velocity", description: "Field capability quickly with small accountable teams, without losing the record." },
      ],
    },
    {
      title: "DoW AI Ethical Principles",
      subtitle: "Responsible AI",
      items: [
        { title: "Responsible", description: "Exercise appropriate judgment and care; people remain accountable." },
        { title: "Equitable", description: "Take deliberate steps to minimize unintended bias." },
        { title: "Traceable", description: "Transparent, auditable methods, data sources, and design." },
        { title: "Reliable", description: "Explicit, well-defined uses, tested for safety and security across the lifecycle." },
        { title: "Governable", description: "Detect and avoid unintended behavior, with the ability to disengage." },
      ],
    },
  ],

  // Illustrative rows in the landing page's Command Center preview. Set here
  // because the shared default list is civilian-agency flavored ("Grant
  // application triage"); the three existing tenants leave it unset and render
  // that default unchanged.
  heroPreviewItems: [
    { label: "Contract clause recommendation", status: "needs_work" },
    { label: "Training content refresh from doctrine", status: "ready" },
    { label: "FMS case document summarization", status: "early" },
  ],

  // The KPI strip, pinned (ES2-15). The two cards the demo drills into
  // (pipeline, duplicates) plus the two that carry the governance story:
  // high-impact determination and NIST AI RMF posture. `signoff` and
  // `omb-reportable` still reach a reviewer as Action Center rows and roll-up
  // columns; `readiness` still reaches them as the decision-readiness gauge.
  dashboardKpiCardIds: ["pipeline", "duplicates", "high-impact", "rmf"],

  tierLabels: {
    department: "Enterprise",
    unit: "Program Office",
    unitPlural: "Program Offices",
    subUnit: "Program",
    subUnitPlural: "Programs",
  },

  unit: {
    label: "Program Office",
    options: [
      {
        value: "atr",
        label: "Acquisition, Training and Readiness (AT&R)",
        offices: [
          { value: "acws", label: "Army Contract Writing System (ACWS)" },
          { value: "atis", label: "Army Training Information System (ATIS)" },
          { value: "fmsaces", label: "Foreign Military Sales – Army Case Execution System (FMS-ACES)" },
          { value: "digitalmarket", label: "Digital Market" },
        ],
        focusAreas: [
          { id: "atr_contract_speed", label: "Faster, more accurate contract actions", category: "AT&R",
            description: "Reduce cycle time and rework across contract writing and administration." },
          { id: "atr_audit_readiness", label: "Audit readiness and data quality", category: "AT&R",
            description: "Keep contract, case, and training data complete and defensible under audit." },
          { id: "atr_training_currency", label: "Current, accessible training content", category: "AT&R",
            description: "Keep training products aligned to doctrine and reachable across the force." },
          { id: "atr_security_cooperation", label: "Security cooperation case execution", category: "AT&R",
            description: "Improve visibility and quality of foreign military sales case data end to end." },
          { id: "atr_acquisition_efficiency", label: "Efficient IT acquisition", category: "AT&R",
            description: "Shorten the path from a stated requirement to an awarded, sustainable capability." },
          { id: "atr_shared_data", label: "Standardized, shared enterprise data", category: "AT&R",
            description: "Standardize and share critical data across the Army, the Department of War, and industry partners." },
        ],
      },
      {
        value: "hrfm",
        label: "Human Resources & Force Management (HR-FM)",
        focusAreas: [
          { id: "hrfm_personnel_data", label: "Accurate personnel data", category: "HR-FM",
            description: "Keep soldier and civilian records complete, current, and consistent across systems." },
          { id: "hrfm_force_decisions", label: "Talent and force management decisions", category: "HR-FM",
            description: "Give assignment, retention, and readiness decisions a defensible data basis." },
          { id: "hrfm_self_service", label: "Self-service for soldiers and civilians", category: "HR-FM",
            description: "Let people resolve routine personnel actions without a service-desk round trip." },
        ],
      },
      {
        value: "logfin",
        label: "Logistics & Finance (LOG-FIN)",
        focusAreas: [
          { id: "logfin_supply_visibility", label: "Sustainment and supply visibility", category: "LOG-FIN",
            description: "See where materiel is and what it will take to sustain it, across the pipeline." },
          { id: "logfin_financial_integrity", label: "Financial data integrity", category: "LOG-FIN",
            description: "Keep financial records accurate and reconcilable across the systems that feed them." },
          { id: "logfin_audit_sustainment", label: "Audit sustainment", category: "LOG-FIN",
            description: "Hold audit findings closed and keep the supporting evidence trail intact." },
        ],
      },
      {
        value: "bts",
        label: "Business Technology Solutions (BTS)",
        focusAreas: [
          { id: "bts_modernization", label: "Enterprise application modernization", category: "BTS",
            description: "Move enterprise applications onto sustainable, supportable platforms." },
          { id: "bts_reduce_duplication", label: "Fewer duplicate systems", category: "BTS",
            description: "Consolidate overlapping applications instead of funding the same capability twice." },
          { id: "bts_experience", label: "Developer and user experience", category: "BTS",
            description: "Reduce the friction of building on, and working in, enterprise systems." },
        ],
      },
      {
        value: "cerp",
        label: "Consolidated ERP (C-ERP)",
        focusAreas: [
          { id: "cerp_consolidation", label: "ERP consolidation", category: "C-ERP",
            description: "Converge separate ERP instances onto one consolidated enterprise system." },
          { id: "cerp_auditability", label: "Financial auditability", category: "C-ERP",
            description: "Make transactions traceable end to end so financial statements stand up to audit." },
          { id: "cerp_retire_legacy", label: "Retire legacy systems", category: "C-ERP",
            description: "Decommission superseded systems once their capability has moved, and stop paying to sustain them." },
        ],
      },
    ],
  },

  submitterRoles: [
    { value: "contracting_officer", label: "Contracting Officer" },
    { value: "contract_specialist", label: "Contract Specialist" },
    { value: "training_developer", label: "Training Developer" },
    { value: "analyst", label: "Analyst" },
    { value: "program_manager", label: "Program / Product Manager" },
    { value: "product_owner", label: "Product Owner" },
    { value: "it_staff", label: "IT Staff" },
    { value: "developer", label: "Developer" },
    { value: "other", label: "Other" },
  ],

  affectedSystems: [
    { value: "contract_writing", label: "Contract writing & administration" },
    { value: "training_management", label: "Training management & delivery" },
    { value: "security_cooperation", label: "Security cooperation / FMS" },
    { value: "acquisition_marketplace", label: "IT acquisition & marketplace" },
    { value: "logistics_finance", label: "Logistics & finance" },
    { value: "human_resources", label: "Human resources" },
    { value: "it_systems", label: "Enterprise IT systems" },
    { value: "cross_functional", label: "Cross-program" },
    { value: "other", label: "Other" },
  ],

  targetAudiences: [
    { value: "contracting_officer", label: "Contracting Officer" },
    { value: "contract_specialist", label: "Contract Specialist" },
    { value: "training_developer", label: "Training Developer" },
    { value: "instructor", label: "Instructor" },
    { value: "soldier", label: "Soldier / Trainee" },
    { value: "analyst", label: "Analyst" },
    { value: "program_manager", label: "Program / Product Manager" },
    { value: "supervisor", label: "Supervisor" },
    { value: "test_evaluation", label: "Test & Evaluation" },
    { value: "industry_partner", label: "Industry Partner" },
    { value: "other", label: "Other" },
  ],

  dataClassifications: [
    { value: "unclassified", label: "Unclassified / public (IL2)" },
    { value: "cui", label: "CUI (IL4)" },
    { value: "il5", label: "CUI, higher sensitivity / NSS (IL5)" },
    { value: "il6", label: "Classified up to Secret (IL6 / SIPRNet)" },
  ],

  okrsLabel: "Strategic Priorities",

  riskFramework: {
    label: "DoW AI Ethical Principles + NIST AI RMF",
    description:
      "Responsible-AI posture: data classification and Impact Level, data readiness, model sourcing inside the accredited boundary, mandatory human judgment where decisions affect people, bias mitigation, and a test-and-evaluation plan.",
  },

  dataMaturityFraming:
    "AI-ready data is the foundation. Maturity is what turns a promising idea into something that can be funded and sustained.",
  modelSourcingGuidance:
    "American-built or U.S.-hosted models running inside an accredited boundary are preferred, with documented sourcing. Foreign or unknown sourcing requires additional review.",
  // `trlSystemName` deliberately unset — its only render site prints "A
  // required {trlSystemName} field," and there is no downstream marketplace an
  // internal submitter here files into. TRL still renders without it.
  srgCaveat: "FedRAMP authorization alone does not satisfy the Cloud Computing SRG.",
  humanReviewCitation: "Governable / DoDD 3000.09",

  theme: { primary: "#2A333C", primaryForeground: "#ffffff" }, // Keystone basalt

  // `aiHubExport` is a Commerce-specific integration. `departmentFinalApproval`
  // adds a second sign-off tier that would slow the demo. `rmf` stays on — it
  // is the strongest governance surface in the product.
  features: {
    decisionCenter: true,
    rallyExport: false,
    scout: true,
    aiHubExport: false,
    departmentFinalApproval: false,
    rmf: true,
  },
}
