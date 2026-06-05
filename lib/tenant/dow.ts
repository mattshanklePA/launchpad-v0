// DoW tenant configuration (Department of War instance)
import type { TenantConfig } from "./types"

export const dow: TenantConfig = {
  id: "dow",
  shortName: "DoW",
  productName: "LaunchPad",
  logoSubtitle: "Department of War AI Use Case Platform",
  heroHeadline: "The governable front door for AI across the Department of War",
  heroSubtitle:
    "One place to turn AI ideas into vetted, decision-ready use cases, so leaders can fund the strongest ones and catch responsible-AI risks early.",

  strategicContext: `
The Department of War pursues AI under published strategy and responsible-AI guidance. Every AI idea should clearly advance at least one priority and respect the ethical principles below:

**Department of War Data, Analytics, and AI Adoption Strategy goals:**
- Invest in interoperable, federated infrastructure
- Advance the data, analytics, and AI ecosystem
- Expand digital talent management
- Improve foundational data management
- Deliver capabilities for enduring decision advantage

**Department of War AI Ethical Principles (every AI use must be):**
- Responsible: appropriate judgment and care, with humans accountable
- Equitable: deliberate steps to minimize unintended bias
- Traceable: transparent, auditable methods, data, and design
- Reliable: explicit, well-defined uses tested for safety and security across the lifecycle
- Governable: designed to fulfill intended functions with the ability to detect and avoid unintended behavior, including human disengagement of unintended action

**Mission outcomes that matter:** readiness, decision advantage, sustainment and logistics, force protection, and responsible speed.

A serious AI idea names the specific priority it advances and the mechanism, states its data classification and human-oversight posture, and acknowledges what it does not prioritize. Vague gestures like "modernization" or "efficiency" are not alignment.
`,
  leadershipPriorities: "readiness, decision advantage, cost, and risk reduction",

  focusAreas: [
    { id: "adopt_infrastructure", label: "Invest in interoperable, federated infrastructure", category: "DoW AI Adoption Strategy" },
    { id: "adopt_ecosystem", label: "Advance the data, analytics & AI ecosystem", category: "DoW AI Adoption Strategy" },
    { id: "adopt_talent", label: "Expand digital talent management", category: "DoW AI Adoption Strategy" },
    { id: "adopt_data", label: "Improve foundational data management", category: "DoW AI Adoption Strategy" },
    { id: "adopt_advantage", label: "Deliver capabilities for enduring decision advantage", category: "DoW AI Adoption Strategy" },
    { id: "rai_responsible", label: "Responsible (judgment, care, accountability)", category: "DoW AI Ethical Principles" },
    { id: "rai_equitable", label: "Equitable (minimize unintended bias)", category: "DoW AI Ethical Principles" },
    { id: "rai_traceable", label: "Traceable (transparent, auditable)", category: "DoW AI Ethical Principles" },
    { id: "rai_reliable", label: "Reliable (tested for safety and security)", category: "DoW AI Ethical Principles" },
    { id: "rai_governable", label: "Governable (detect and avoid unintended behavior)", category: "DoW AI Ethical Principles" },
  ],

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

  riskFramework: {
    label: "DoW AI Ethical Principles + CDAO Responsible AI",
    description: "Responsible-AI posture plus data classification / Impact Level (Unclassified, CUI, IL4, IL5), American-built model sourcing, and mandatory human review.",
  },

  theme: { primary: "#355E93", primaryForeground: "#ffffff" },
  features: { decisionCenter: true, rallyExport: false, scout: true },
}
