import type { TenantConfig } from "./types"

// Department of Commerce tenant. A department-level instance spanning the
// operating units (bureaus). The org taxonomy here is the BUREAU; a handful
// of bureaus also declare `offices` (their sub-level), giving a third tier:
// Department -> Bureau -> Office. Strategic context and risk framing are
// anchored to the federal AI framework (OMB M-25-21, M-25-22, EO 14179), not
// to any single bureau's strategic plan.
//
// Register in lib/tenant/index.ts:  const TENANTS = { uspto, dow, doc }.
// Deploy with NEXT_PUBLIC_TENANT=doc.
//
// NOTE: confirm the exact list of Commerce operating units/bureaus before the
// demo; this reflects the commonly listed ~13 plus the Office of the Secretary.
export const doc: TenantConfig = {
  id: "doc",
  shortName: "DOC",
  productName: "LaunchPad",
  logoSubtitle: "Commerce AI Use Case Platform",
  heroHeadline: "The governable front door for AI across Commerce",
  heroSubtitle:
    "One place for every bureau to turn AI ideas into vetted, decision-ready, OMB-ready use cases, so the Department can govern, fund, and report across the enterprise.",
  loginEmailPlaceholder: "you@doc.gov",

  strategicContext: `
The Department of Commerce governs AI across its operating units (bureaus) under the federal AI framework. Every AI idea should clearly advance the Department's mission while meeting federal governance and reporting requirements.

**Federal AI governance (the rules every bureau must meet):**
- OMB Memorandum M-25-21, "Accelerating Federal Use of AI through Innovation, Governance, and Public Trust" (Apr 3, 2025): responsible AI use, minimum risk-management practices for high-impact AI, and the annual AI use case inventory.
- OMB Memorandum M-25-22 ("Driving Efficient Acquisition of AI in Government") and Executive Order 14179 ("Removing Barriers to American Leadership in AI"): prefer American-built / U.S.-hosted models and document sourcing.
- The annual OMB AI use case inventory (companion guidance to M-25-21): every bureau reports its AI use cases in the prescribed fields and formats; high-impact use cases carry additional risk-management reporting.

**Commerce priorities:**
- A consistent, accountable AI governance posture across all bureaus ("one Commerce").
- Better customer and employee experience and digital service delivery (21st Century IDEA Act, Section 508).
- Rationalize duplicate efforts across bureaus and fund the highest-impact, lowest-risk use cases.

A serious AI idea names the federal priority and the Department mission it advances, states its risk posture (PII, decisional impact, model sourcing, human review), and is honest about what it does not address. Buzzwords like "modernization" or "efficiency" are not alignment.
`,
  leadershipPriorities:
    "responsible adoption, enterprise governance and reporting, and cost-effective, rationalized investment across the bureaus",

  focusAreas: [
    // OMB M-25-21 pillars
    { id: "omb_innovation", label: "Accelerate responsible AI innovation", category: "OMB M-25-21" },
    { id: "omb_governance", label: "Strengthen AI governance & risk management", category: "OMB M-25-21" },
    { id: "omb_public_trust", label: "Build public trust (transparency, oversight)", category: "OMB M-25-21" },
    // Federal AI directives
    { id: "american_ai", label: "American-built / U.S.-hosted model sourcing (EO 14179)", category: "Federal AI Directives" },
    { id: "high_impact_mgmt", label: "Meet high-impact AI risk-management practices", category: "Federal AI Directives" },
    // Commerce priorities
    { id: "one_commerce", label: "Enterprise (“one Commerce”) governance & reporting", category: "Commerce Priorities" },
    { id: "customer_experience", label: "Customer & employee experience / digital delivery", category: "Commerce Priorities" },
    { id: "rationalization", label: "Rationalize duplicate efforts across bureaus", category: "Commerce Priorities" },
  ],

  landingObjectives: [
    {
      title: "Federal AI governance",
      subtitle: "OMB M-25-21 & EO 14179",
      items: [
        { title: "Accelerate responsible AI innovation", description: "Adopt AI quickly where it helps the mission, with governance built in." },
        { title: "Strengthen governance and risk management", description: "Apply minimum risk-management practices to high-impact AI use cases." },
        { title: "Build public trust", description: "Transparency, human oversight, and the public AI use case inventory." },
        { title: "Prefer American-built models", description: "Document model sourcing per EO 14179 and OMB acquisition guidance." },
      ],
    },
    {
      title: "Commerce priorities",
      subtitle: "One Commerce",
      items: [
        { title: "Enterprise governance and reporting", description: "Consistent intake and roll-up across every bureau, ready for OMB reporting and the AI Hub." },
        { title: "Customer and employee experience", description: "Improve digital service delivery and accessibility (21st Century IDEA, Section 508)." },
        { title: "Rationalize and fund the best", description: "Surface duplicate efforts across bureaus and fund the highest-impact, lowest-risk use cases." },
      ],
    },
  ],

  unit: {
    label: "Bureau",
    options: [
      { value: "os", label: "Office of the Secretary" },
      { value: "bea", label: "Bureau of Economic Analysis (BEA)" },
      { value: "bis", label: "Bureau of Industry and Security (BIS)" },
      {
        value: "census",
        label: "U.S. Census Bureau",
        offices: [
          { value: "decennial", label: "Decennial Census Programs" },
          { value: "economic", label: "Economic Programs" },
          { value: "demographic", label: "Demographic Programs" },
        ],
      },
      { value: "eda", label: "Economic Development Administration (EDA)" },
      {
        value: "ita",
        label: "International Trade Administration (ITA)",
        offices: [
          { value: "industry_analysis", label: "Industry & Analysis" },
          { value: "global_markets", label: "Global Markets" },
          { value: "enforcement_compliance", label: "Enforcement & Compliance" },
        ],
      },
      { value: "mbda", label: "Minority Business Development Agency (MBDA)" },
      { value: "nist", label: "National Institute of Standards and Technology (NIST)" },
      {
        value: "noaa",
        label: "National Oceanic and Atmospheric Administration (NOAA)",
        offices: [
          { value: "nws", label: "National Weather Service (NWS)" },
          { value: "nmfs", label: "National Marine Fisheries Service (NMFS)" },
          { value: "nesdis", label: "National Environmental Satellite, Data, and Information Service (NESDIS)" },
        ],
      },
      { value: "ntia", label: "National Telecommunications and Information Administration (NTIA)" },
      { value: "ntis", label: "National Technical Information Service (NTIS)" },
      { value: "uspto", label: "U.S. Patent and Trademark Office (USPTO)" },
      { value: "firstnet", label: "First Responder Network Authority (FirstNet)" },
      { value: "other", label: "Other" },
    ],
  },

  riskFramework: {
    label: "OMB / EO AI risk management",
    description:
      "Per OMB M-25-21 and Executive Order 14179: PII/sensitive data, decisional impact on individuals, American-built/U.S.-hosted model sourcing, mandatory human review, and high-impact AI determinations.",
  },

  okrsLabel: "OMB / Strategic Priorities",

  theme: { primary: "#003366", primaryForeground: "#ffffff" },
  features: { decisionCenter: true, rallyExport: false, scout: true, aiHubExport: true },
}
