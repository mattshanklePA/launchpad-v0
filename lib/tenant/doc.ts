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
      {
        value: "os",
        label: "Office of the Secretary",
        focusAreas: [
          { id: "os_department_plan", label: "Steward the Department-wide plan", category: "OS", description: "Sets and stewards Commerce's department-wide strategic plan across all bureaus." },
          { id: "os_enterprise_management", label: "Enterprise management & modern capabilities", category: "OS", description: "Modernizes enterprise IT, data, and management capabilities Department-wide." },
          { id: "os_coordinate_bureaus", label: "Coordinate bureaus toward shared mission", category: "OS", description: "Aligns the Department's operating units toward Commerce's shared economic mission." },
          { id: "os_allocate_resources", label: "Allocate resources to strategic goals", category: "OS", description: "Directs budget and staffing toward the Department's highest-priority strategic goals." },
        ],
      },
      {
        value: "bea",
        label: "Bureau of Economic Analysis (BEA)",
        focusAreas: [
          { id: "bea_accurate_accounts", label: "Timely, relevant, accurate accounts", category: "BEA", description: "Produces the nation's GDP and other core economic accounts accurately and on schedule." },
          { id: "bea_ai_economy", label: "Measure the American AI economy", category: "BEA", description: "Develops new statistics to measure the size and growth of the U.S. AI economy." },
          { id: "bea_accelerate_releases", label: "Accelerate statistics releases", category: "BEA", description: "Shortens the lag between data collection and public release of economic statistics." },
          { id: "bea_innovate_methods", label: "Innovate new statistics & methods", category: "BEA", description: "Researches new methodologies and data sources to improve economic measurement." },
          { id: "bea_modernize_access", label: "Modernize data access & infrastructure", category: "BEA", description: "Modernizes IT infrastructure and self-service access to BEA data." },
          { id: "bea_nonpartisan_integrity", label: "Nonpartisan, high-integrity statistics", category: "BEA", description: "Maintains BEA's reputation for objective, nonpartisan statistical integrity." },
        ],
      },
      {
        value: "bis",
        label: "Bureau of Industry and Security (BIS)",
        focusAreas: [
          { id: "bis_national_security", label: "Protect U.S. national security", category: "BIS", description: "Administers export controls that protect U.S. national security interests." },
          { id: "bis_tech_leadership", label: "Preserve strategic tech leadership", category: "BIS", description: "Safeguards U.S. leadership in critical and emerging technologies." },
          { id: "bis_balance_competitiveness", label: "Balance security with competitiveness", category: "BIS", description: "Balances export controls with the competitiveness of U.S. industry." },
          { id: "bis_private_sector", label: "Partner with the private sector", category: "BIS", description: "Partners with industry to keep controls practical and effective." },
          { id: "bis_adapt_controls", label: "Adapt controls to a changing world", category: "BIS", description: "Updates export control policy for a changing geopolitical and technology landscape." },
          { id: "bis_international_cooperation", label: "Advance international cooperation", category: "BIS", description: "Works with allies to harmonize export control regimes internationally." },
        ],
      },
      {
        value: "census",
        label: "U.S. Census Bureau",
        offices: [
          { value: "decennial", label: "Decennial Census Programs" },
          { value: "economic", label: "Economic Programs" },
          { value: "demographic", label: "Demographic Programs" },
        ],
        focusAreas: [
          { id: "census_quality_data", label: "Quality data on people & economy", category: "Census", description: "Delivers high-quality statistics on the nation's people, places, and economy." },
          { id: "census_data_ecosystem", label: "Data-centric business ecosystem", category: "Census", description: "Builds an integrated, data-centric ecosystem across Census programs." },
          { id: "census_frames_modernization", label: "Enterprise Frames modernization", category: "Census", description: "Modernizes the enterprise address and business frames that underpin all surveys." },
          { id: "census_ml_data_science", label: "Machine learning & data science", category: "Census", description: "Applies machine learning and data science to improve statistical products." },
          { id: "census_2030_it", label: "2030 Census IT modernization", category: "Census", description: "Modernizes IT systems and operations ahead of the 2030 Census." },
          { id: "census_ai_adoption", label: "Measure AI adoption in the economy", category: "Census", description: "Develops new survey measures of AI adoption across U.S. businesses." },
        ],
      },
      {
        value: "eda",
        label: "Economic Development Administration (EDA)",
        focusAreas: [
          { id: "eda_equity", label: "Equity in economic development", category: "EDA", description: "Ensures underserved communities share in federal economic development investment." },
          { id: "eda_recovery_resilience", label: "Recovery & resilience", category: "EDA", description: "Helps regions recover from and build resilience to economic shocks." },
          { id: "eda_workforce_development", label: "Workforce development", category: "EDA", description: "Funds workforce development tied to regional economic growth." },
          { id: "eda_manufacturing", label: "Manufacturing competitiveness", category: "EDA", description: "Strengthens U.S. manufacturing competitiveness through regional investment." },
          { id: "eda_tech_economic_dev", label: "Technology-based economic development", category: "EDA", description: "Funds technology-based and innovation-driven regional economic development." },
          { id: "eda_exports_fdi", label: "Exports & foreign direct investment", category: "EDA", description: "Supports regional strategies to grow exports and attract foreign direct investment." },
        ],
      },
      {
        value: "ita",
        label: "International Trade Administration (ITA)",
        offices: [
          { value: "industry_analysis", label: "Industry & Analysis" },
          { value: "global_markets", label: "Global Markets" },
          { value: "enforcement_compliance", label: "Enforcement & Compliance" },
        ],
        focusAreas: [
          { id: "ita_industry_competitiveness", label: "Strengthen U.S. industry competitiveness", category: "ITA", description: "Strengthens the global competitiveness of U.S. industry." },
          { id: "ita_exports_expansion", label: "Promote exports & global expansion", category: "ITA", description: "Helps U.S. companies promote exports and expand into global markets." },
          { id: "ita_policy_analysis", label: "Trade & investment policy analysis", category: "ITA", description: "Provides industry and trade policy analysis to inform trade negotiations." },
          { id: "ita_enforce_trade_laws", label: "Enforce trade laws & compliance", category: "ITA", description: "Enforces U.S. trade laws, including antidumping and countervailing duties." },
          { id: "ita_supply_chains", label: "Strengthen critical supply chains", category: "ITA", description: "Works to strengthen and diversify critical U.S. supply chains." },
          { id: "ita_attract_fdi", label: "Attract foreign direct investment", category: "ITA", description: "Attracts and facilitates foreign direct investment into the United States." },
        ],
      },
      {
        value: "mbda",
        label: "Minority Business Development Agency (MBDA)",
        focusAreas: [
          { id: "mbda_growth_competitiveness", label: "Growth & global competitiveness of MBEs", category: "MBDA", description: "Grows the size, scale, and global competitiveness of minority business enterprises." },
          { id: "mbda_capital_access", label: "Greater access to capital", category: "MBDA", description: "Expands minority business access to capital and financing." },
          { id: "mbda_contracting", label: "Expand contracting opportunities", category: "MBDA", description: "Expands minority business access to public and private contracting opportunities." },
          { id: "mbda_new_markets", label: "Enter new domestic & global markets", category: "MBDA", description: "Helps MBEs enter new domestic and global markets." },
          { id: "mbda_rural_underserved", label: "Rural & underserved MBE support", category: "MBDA", description: "Expands support for minority businesses in rural and underserved communities." },
          { id: "mbda_entrepreneurship_ed", label: "Entrepreneurship education & innovation", category: "MBDA", description: "Advances entrepreneurship education and innovation for minority business owners." },
        ],
      },
      {
        value: "nist",
        label: "National Institute of Standards and Technology (NIST)",
        focusAreas: [
          { id: "nist_critical_tech", label: "Accelerate critical & emerging tech", category: "NIST", description: "Accelerates U.S. leadership in critical and emerging technologies." },
          { id: "nist_ai_dominance", label: "Solidify American AI dominance", category: "NIST", description: "Solidifies American dominance in artificial intelligence." },
          { id: "nist_measure_ai", label: "Measure & evaluate AI systems", category: "NIST", description: "Develops measurement science and evaluations for AI system performance and safety." },
          { id: "nist_caisi", label: "CAISI: AI standards & security", category: "NIST", description: "Advances AI standards and security through the Center for AI Standards and Innovation (CAISI)." },
          { id: "nist_international_standards", label: "Lead international standards", category: "NIST", description: "Leads development of international standards that reflect U.S. innovation." },
          { id: "nist_commercialize_labs", label: "Commercialize innovation & modernize labs", category: "NIST", description: "Commercializes lab innovation and modernizes NIST's research facilities." },
        ],
      },
      {
        value: "noaa",
        label: "National Oceanic and Atmospheric Administration (NOAA)",
        offices: [
          { value: "nws", label: "National Weather Service (NWS)" },
          { value: "nmfs", label: "National Marine Fisheries Service (NMFS)" },
          { value: "nesdis", label: "National Environmental Satellite, Data, and Information Service (NESDIS)" },
        ],
        focusAreas: [
          { id: "noaa_climate_ready", label: "Build a Climate Ready Nation", category: "NOAA", description: "Builds a Climate Ready Nation through data, forecasts, and services." },
          { id: "noaa_environmental_predictions", label: "Improve environmental predictions", category: "NOAA", description: "Improves the accuracy and timeliness of weather and environmental predictions." },
          { id: "noaa_blue_economy", label: "Grow the New Blue Economy", category: "NOAA", description: "Grows the \"Blue Economy,\" the ocean- and coastal-based economy." },
          { id: "noaa_marine_ecosystems", label: "Steward marine & coastal ecosystems", category: "NOAA", description: "Stewards healthy marine and coastal ecosystems and resources." },
          { id: "noaa_ai_mission", label: "Expand AI across every mission", category: "NOAA", description: "Expands the use of AI across NOAA's weather, ocean, and satellite missions." },
          { id: "noaa_equity_services", label: "Advance equity in services", category: "NOAA", description: "Advances equity in access to NOAA's weather and climate services." },
        ],
      },
      {
        value: "ntia",
        label: "National Telecommunications and Information Administration (NTIA)",
        focusAreas: [
          { id: "ntia_next_gen_tech", label: "Next-gen tech dominance", category: "NTIA", description: "Promotes U.S. dominance in next-generation communications technology." },
          { id: "ntia_broadband_bead", label: "Universal broadband (BEAD)", category: "NTIA", description: "Delivers universal, affordable broadband access through the BEAD program." },
          { id: "ntia_spectrum", label: "Efficient spectrum use", category: "NTIA", description: "Manages federal spectrum for efficient, innovative use." },
          { id: "ntia_ai_accountability", label: "AI innovation & accountability", category: "NTIA", description: "Advances AI innovation while promoting accountability in AI systems." },
          { id: "ntia_public_safety_comms", label: "Public safety communications", category: "NTIA", description: "Supports public safety communications and interoperability." },
          { id: "ntia_evidence_based_research", label: "Evidence-based tech research", category: "NTIA", description: "Conducts research to inform evidence-based telecommunications policy." },
        ],
      },
      {
        value: "ntis",
        label: "National Technical Information Service (NTIS)",
        focusAreas: [
          { id: "ntis_data_asset", label: "Data as a strategic asset", category: "NTIS", description: "Treats government data as a strategic asset that can be shared and put to work responsibly." },
          { id: "ntis_jvp_authority", label: "Joint Venture Partnership authority", category: "NTIS", description: "Uses its unique Joint Venture Partnership authority to fund agency data/IT projects." },
          { id: "ntis_fed_advisor", label: "Trusted Fed-to-Fed advisor", category: "NTIS", description: "Serves as a trusted advisor and service provider to other federal agencies." },
          { id: "ntis_applied_ai", label: "Applied AI & data science", category: "NTIS", description: "Applies AI and data science to federal data and information products." },
          { id: "ntis_agile_capacity", label: "Agile capacity to scale", category: "NTIS", description: "Provides agile capacity that lets partner agencies scale projects quickly." },
        ],
      },
      {
        value: "uspto",
        label: "U.S. Patent and Trademark Office (USPTO)",
        focusAreas: [
          { id: "uspto_inclusive_innovation", label: "Inclusive innovation & competitiveness", category: "USPTO", description: "Promotes inclusive innovation and U.S. global competitiveness." },
          { id: "uspto_reliable_ip_rights", label: "Reliable, efficient IP rights", category: "USPTO", description: "Issues reliable, efficient patent and trademark rights." },
          { id: "uspto_protect_ip", label: "Protect IP against threats", category: "USPTO", description: "Protects intellectual property against new and persistent threats." },
          { id: "uspto_public_good", label: "Innovation for public good", category: "USPTO", description: "Applies innovation and IP policy to national priorities and the public good." },
          { id: "uspto_responsible_ai", label: "Responsible AI adoption", category: "USPTO", description: "Adopts AI responsibly across USPTO operations." },
          { id: "uspto_ai_ready_policy", label: "AI-ready IP policy & workforce", category: "USPTO", description: "Prepares IP policy and the USPTO workforce for an AI-driven innovation landscape." },
        ],
      },
      {
        value: "firstnet",
        label: "First Responder Network Authority (FirstNet)",
        focusAreas: [
          { id: "firstnet_dependable_network", label: "Dependable Network", category: "FirstNet", description: "Delivers a dependable, dedicated public safety broadband network." },
          { id: "firstnet_connected_responders", label: "Connected Responders", category: "FirstNet", description: "Keeps first responders connected with reliable priority and preemption." },
          { id: "firstnet_advanced_tech", label: "Operationalizing advanced technologies", category: "FirstNet", description: "Brings advanced technologies like AI and drones into public safety operations." },
          { id: "firstnet_public_safety_priorities", label: "Public-safety-driven priorities", category: "FirstNet", description: "Sets network priorities driven by public safety user needs." },
          { id: "firstnet_beyond_buildout", label: "Growing capabilities beyond buildout", category: "FirstNet", description: "Grows network capabilities and coverage beyond the initial nationwide buildout." },
        ],
      },
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
