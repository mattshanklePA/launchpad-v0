import type { TenantConfig } from "./types"

export const uspto: TenantConfig = {
  id: "uspto",
  shortName: "USPTO",
  orgName: "USPTO",
  productName: "LaunchPad",
  logoSubtitle: "USPTO AI Use Case Platform",
  heroHeadline: "The governable front door for AI at USPTO",
  heroSubtitle:
    "One place to turn AI ideas into vetted, decision-ready use cases, so leadership can fund the strong ones and catch risky ones early.",
  loginEmailPlaceholder: "you@uspto.gov",

  strategicContext: `
USPTO operates under two published strategic frameworks. Every AI idea pursued by USPTO should clearly advance at least one priority from these:

**USPTO 2022-2026 Strategic Plan goals:**
- Drive inclusive U.S. innovation and global competitiveness
- Promote the efficient delivery of reliable IP rights
- Promote the protection of IP against new and persistent threats
- Bring innovation to impact for the public good
- Generate impactful employee and customer experiences by maximizing agency operations

**USPTO AI Strategy (January 2025) priorities:**
- Advance IP policies for inclusive AI innovation
- Enhance AI capabilities through infrastructure and resources
- Promote responsible AI use (bias mitigation, explainability, human oversight)
- Develop AI expertise within the workforce
- Collaborate with governmental and international partners on AI

A serious AI idea names the specific priorities it advances, describes the mechanism by which it does so, and acknowledges what it does not prioritize. Vague gestures like "modernization," "efficiency," or "improving outcomes" are not alignment — they are buzzwords.
`,
  leadershipPriorities: "reduced pendency, improved quality, and reduced costs",

  focusAreas: [
    { id: "goal_innovation", label: "Drive U.S. innovation & global competitiveness", category: "USPTO Strategic Plan" },
    { id: "goal_pendency_quality", label: "Efficient delivery of reliable IP rights (pendency + quality)", category: "USPTO Strategic Plan" },
    { id: "goal_ip_protection", label: "Protect IP against new and persistent threats", category: "USPTO Strategic Plan" },
    { id: "goal_public_good", label: "Bring innovation to impact for the public good", category: "USPTO Strategic Plan" },
    { id: "goal_employee_experience", label: "Impactful employee & customer experiences via operations", category: "USPTO Strategic Plan" },
    { id: "ai_inclusive_policy", label: "Advance IP policies for inclusive AI innovation", category: "AI Strategy" },
    { id: "ai_infrastructure", label: "Enhance AI capabilities through infrastructure & resources", category: "AI Strategy" },
    { id: "ai_responsible_use", label: "Promote responsible AI use (bias, explainability, oversight)", category: "AI Strategy" },
    { id: "ai_workforce", label: "Develop AI expertise within the workforce", category: "AI Strategy" },
    { id: "ai_partnerships", label: "Collaborate with governmental & international AI partners", category: "AI Strategy" },
  ],

  landingObjectives: [
    {
      title: "USPTO strategic objectives",
      subtitle: "2022\u20132026 Strategic Plan",
      items: [
        { title: "Drive U.S. innovation and global competitiveness", description: "Expand access to the IP system and strengthen U.S. leadership in emerging technology." },
        { title: "Promote the efficient delivery of reliable IP rights", description: "Reduce pendency and improve quality across patents and trademarks." },
        { title: "Promote IP protection against new and persistent threats", description: "Strengthen enforcement and defend the integrity of issued IP rights." },
        { title: "Bring innovation to impact for the public good", description: "Apply the IP and innovation system to national priorities like health, climate, and equity." },
        { title: "Generate impactful employee and customer experiences", description: "Create rewarding experiences for the USPTO workforce and the public it serves." },
      ],
    },
    {
      title: "USPTO AI strategy",
      subtitle: "January 2025 AI Strategy priorities",
      items: [
        { title: "Advance IP policies for inclusive AI innovation", description: "Shape policy that supports U.S. AI leadership and stays inclusive of all innovators." },
        { title: "Build AI capabilities through infrastructure and resources", description: "Invest in the compute, data, and tooling to deploy AI responsibly." },
        { title: "Promote responsible AI use", description: "Ensure bias mitigation, explainability, and human oversight across AI systems." },
        { title: "Develop AI expertise within the workforce", description: "Train USPTO staff to evaluate, deploy, and oversee AI in their work." },
        { title: "Collaborate with government and international partners on AI", description: "Coordinate with peer agencies, OMB, and international IP offices on AI." },
      ],
    },
  ],

  unit: {
    label: "Business unit",
    options: [
      { value: "patents", label: "Patents" },
      { value: "trademarks", label: "Trademarks" },
      { value: "ocio", label: "OCIO" },
      { value: "ocfo", label: "OCFO" },
      { value: "ogc", label: "OGC" },
      { value: "opia", label: "OPIA" },
      { value: "hr", label: "Human Resources" },
      { value: "other", label: "Other" },
    ],
  },

  riskFramework: {
    label: "DoC / OMB AI risk management",
    description: "Department of Commerce and Executive Order requirements: PII use, decisional impact, American-built model sourcing, and mandatory human review.",
  },

  okrsLabel: "OKRs",

  dataMaturityFraming:
    "AI-ready, well-labeled data is the foundation of a credible use case; technology maturity should drive funding priority.",
  modelSourcingGuidance:
    "Prefer American-built or U.S.-hosted models where possible. Foreign or unknown sourcing requires additional review.",

  theme: { primary: "#1f4e79", primaryForeground: "#ffffff" },
  features: { decisionCenter: true, rallyExport: true, scout: true },
}
