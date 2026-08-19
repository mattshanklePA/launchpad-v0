// DoW tenant configuration (Department of War instance)
import type { TenantConfig } from "./types"

export const dow: TenantConfig = {
  id: "dow",
  shortName: "DoW",
  orgName: "Department of War",
  productName: "LaunchPad",
  assistantName: "Scout",
  logoSubtitle: "Department of War AI Use Case Platform",
  sidebarTagline: "AI use case governance",
  heroHeadline: "The governable front door for AI across the Department of War",
  heroSubtitle:
    "One place to turn AI ideas into vetted, decision-ready use cases, so leaders can fund the strongest ones and catch responsible-AI risks early.",
  heroImage: "/hero-dow.jpg",
  loginEmailPlaceholder: "you@army.mil",
  publicInquiryEmail: "AI.Inventory@dow.mil",

  strategicContext: `
The Department of War pursues AI under the DoD Data, Analytics, and AI Adoption Strategy and DoD responsible-AI guidance. Reason about every idea using the "AI Hierarchy of Needs": quality, AI-ready data is the foundation; analytics sits on top of it; and Responsible AI governs the whole stack. An idea with no realistic data foundation is not yet a use case, no matter how good the concept.

**Adoption Strategy goals (name the one an idea advances):**
- Invest in interoperable, federated infrastructure
- Advance the data, analytics, and AI ecosystem
- Expand digital talent management
- Improve foundational data management (data made Visible, Accessible, Understandable, Linked, Trustworthy, Interoperable, Secure)
- Deliver capabilities for enduring decision advantage

**Mission outcomes that justify funding:** readiness, decision advantage, sustainment and logistics, force protection, responsible speed, and enterprise efficiency. Leaders fund outcomes, not technology.

**DoD AI Ethical Principles (every AI use must be):**
- Responsible: appropriate human judgment and care; humans remain accountable
- Equitable: deliberate steps to minimize unintended bias
- Traceable: transparent, auditable methods, data sources, and design (for generative AI, that means citations and hallucination controls)
- Reliable: explicit, well-defined uses, tested for safety and security across the lifecycle
- Governable: detect and avoid unintended behavior, with the ability to disengage or deactivate

A serious DoW AI idea does six things: (1) names the specific Adoption-Strategy goal and mission outcome it advances and the mechanism; (2) states whether AI-ready, labeled, accessible data exists today or must be built or relabeled; (3) states its data classification and required Impact Level (Unclassified to IL2; CUI to IL4 or IL5; Secret to IL6); (4) states the human-judgment posture (who decides, where the human reviews, how it can be disengaged); (5) states its maturity (TRL 1-9) and a maturation or sustainment plan; (6) acknowledges what it does not address.

Push back on these anti-patterns: vague "modernization" or "efficiency" with no named priority; no data-readiness plan (the most common reason DoD AI fails per GAO); no human oversight; decisional AI about people with no review; no test-and-evaluation or assurance story; and value claims with no quantification or that ignore sustainment cost. Use the submitter's own words; never invent facts, figures, or program names.
`,
  leadershipPriorities: "readiness, decision advantage, cost, and risk reduction",

  focusAreas: [
    { id: "adopt_infrastructure", label: "Invest in interoperable, federated infrastructure", category: "DoW AI Adoption Strategy" },
    { id: "adopt_ecosystem", label: "Advance the data, analytics & AI ecosystem", category: "DoW AI Adoption Strategy" },
    { id: "adopt_talent", label: "Expand digital talent management", category: "DoW AI Adoption Strategy" },
    { id: "adopt_data", label: "Improve foundational data management", category: "DoW AI Adoption Strategy" },
    { id: "adopt_advantage", label: "Deliver capabilities for enduring decision advantage", category: "DoW AI Adoption Strategy" },
    { id: "mission_readiness", label: "Readiness", category: "Mission outcome" },
    { id: "mission_decision", label: "Decision advantage", category: "Mission outcome" },
    { id: "mission_sustainment", label: "Sustainment & logistics", category: "Mission outcome" },
    { id: "mission_protection", label: "Force protection", category: "Mission outcome" },
    { id: "mission_speed", label: "Responsible speed", category: "Mission outcome" },
    { id: "mission_enterprise", label: "Enterprise efficiency", category: "Mission outcome" },
    { id: "rai_responsible", label: "Responsible (judgment, care, accountability)", category: "DoW AI Ethical Principles" },
    { id: "rai_equitable", label: "Equitable (minimize unintended bias)", category: "DoW AI Ethical Principles" },
    { id: "rai_traceable", label: "Traceable (transparent, auditable)", category: "DoW AI Ethical Principles" },
    { id: "rai_reliable", label: "Reliable (tested for safety and security)", category: "DoW AI Ethical Principles" },
    { id: "rai_governable", label: "Governable (detect and avoid unintended behavior)", category: "DoW AI Ethical Principles" },
  ],

  // Internal inventory to the same field set, not a published federal one.
  inventoryLabel: "AI use case inventory",
  inventoryShortLabel: "Inventory",
  minimumPracticesLabel: "High-impact AI minimum practices",
  inventoryFileName: "omb-ai-use-case-inventory.csv",

  landingObjectives: [
    {
      title: "Department of War AI priorities",
      subtitle: "Data, Analytics & AI Adoption Strategy",
      items: [
        { title: "Interoperable, federated infrastructure", description: "Invest in the connective infrastructure that lets data and AI move across the enterprise." },
        { title: "Advance the data, analytics & AI ecosystem", description: "Build and field the tools, models, and partnerships that turn data into advantage." },
        { title: "Expand digital talent management", description: "Grow and retain the workforce able to build, evaluate, and oversee AI." },
        { title: "Improve foundational data management", description: "Make data visible, accessible, understandable, and trustworthy across the Department." },
        { title: "Deliver capabilities for enduring decision advantage", description: "Get responsible AI into the hands of decision-makers and the warfighter." },
      ],
    },
    {
      title: "Department of War AI ethical principles",
      subtitle: "Responsible AI",
      items: [
        { title: "Responsible", description: "Exercise appropriate judgment and care; humans remain accountable." },
        { title: "Equitable", description: "Take deliberate steps to minimize unintended bias in AI capabilities." },
        { title: "Traceable", description: "Transparent, auditable methodologies, data sources, and design." },
        { title: "Reliable", description: "Explicit, well-defined uses, tested for safety and security across the lifecycle." },
        { title: "Governable", description: "Detect and avoid unintended behavior, with the ability to disengage." },
      ],
    },
  ],

  // Department -> Command. `unit` agrees with `unit.label` below ("Command /
  // organization") but drops the slash, since the tier noun is read inline in
  // sentences and headings where the alternative reads badly. Like USPTO, DoW
  // configures no third tier, so `subUnit`/`subUnitPlural` never render today.
  tierLabels: {
    department: "Department",
    unit: "Command",
    unitPlural: "Commands",
    subUnit: "Office",
    subUnitPlural: "Offices",
  },

  unit: {
    label: "Command / organization",
    options: [
      { value: "forscom", label: "Forces Command (FORSCOM)" },
      { value: "amc", label: "Army Materiel Command (AMC)" },
      { value: "tradoc", label: "Training & Doctrine Command (TRADOC)" },
      { value: "afc", label: "Army Futures Command (AFC)" },
      { value: "medcom", label: "Army Medical Command (MEDCOM)" },
      { value: "arcyber", label: "Army Cyber Command" },
      { value: "sustainment", label: "Sustainment / Logistics" },
      { value: "other", label: "Other" },
    ],
  },

  submitterRoles: [
    { value: "patent_examiner", label: "Operations / Staff Officer" },
    { value: "trademark_examiner", label: "Analyst" },
    { value: "manager", label: "Manager" },
    { value: "it_staff", label: "IT Staff" },
    { value: "product_owner", label: "Product Owner" },
    { value: "lead_product_owner", label: "Lead Product Owner" },
    { value: "developer", label: "Developer" },
    { value: "other", label: "Other" },
  ],

  affectedSystems: [
    { value: "operations", label: "Mission operations" },
    { value: "logistics", label: "Sustainment / logistics" },
    { value: "it_systems", label: "IT systems" },
    { value: "cross_functional", label: "Cross-functional" },
    { value: "other", label: "Other" },
  ],

  targetAudiences: [
    { value: "operator", label: "Operator / Warfighter" },
    { value: "analyst", label: "Analyst" },
    { value: "supervisor", label: "Supervisor" },
    { value: "product_owner", label: "Product Owner" },
    { value: "lead_product_owner", label: "Lead Product Owner" },
    { value: "developer", label: "Developer" },
    { value: "external_partner", label: "External Partner / Contractor" },
    { value: "other", label: "Other" },
  ],

  // DoW keeps the DoD Impact Levels — same list as USPTO's default.
  dataClassifications: [
    { value: "unclassified", label: "Unclassified / public (IL2)" },
    { value: "cui", label: "CUI (IL4)" },
    { value: "il5", label: "CUI, higher sensitivity / NSS (IL5)" },
    { value: "il6", label: "Classified up to Secret (IL6 / SIPRNet)" },
  ],

  riskFramework: {
    label: "DoD AI Ethical Principles + CDAO Responsible AI",
    description: "Responsible-AI posture: data classification and Impact Level (Unclassified, CUI, IL4, IL5, IL6), data readiness, American-built model sourcing inside the accredited boundary, mandatory human judgment, bias mitigation, and a test-and-evaluation/assurance plan.",
  },

  okrsLabel: "Department of War OKRs",

  dataMaturityFraming:
    "In the DoD AI Hierarchy of Needs, AI-ready data is the foundation and maturity drives funding.",
  modelSourcingGuidance:
    "DoD prefers American-built or U.S.-hosted models running inside the accredited boundary (e.g., Amazon Bedrock in GovCloud, authorized at IL4/IL5). Foreign/unknown sourcing requires additional review.",
  trlSystemName: "Tradewinds",
  srgCaveat: "FedRAMP authorization alone does not satisfy the DoD SRG.",
  humanReviewCitation: "Governable / DoDD 3000.09",

  theme: { primary: "#355E93", primaryForeground: "#ffffff" },
  features: { decisionCenter: true, rallyExport: false, scout: true },
}
