// Shared plain-language glossary for compliance terms shown across the
// wizard, reviewer detail view, and dashboard. Decision: keep the formal
// term on screen and explain it in place — a term is never renamed, just
// annotated (see components/launchpad/glossary-term.tsx).
//
// Tenant-neutral: definitions describe LaunchPad's own OMB/NIST/rationalization
// concepts, not any tenant's org names or copy, so the same entry reads
// correctly for USPTO, DoW, and DoC alike.

export type GlossaryTermKey =
  | "crossBureauRationalization"
  | "ombReportability"
  | "consolidatedIndividualReporting"
  | "highImpactDetermination"
  | "nistAiRmf"
  | "coveredPartialGap"
  | "tokenOverlapMatch"
  | "awaitingBureauSignOff"
  | "advisory"

export type GlossaryEntry = {
  /** The formal term as it appears on screen. Never rewritten by the tooltip. */
  term: string
  /** One or two plain-language sentences explaining what the term means. */
  definition: string
}

export const GLOSSARY: Record<GlossaryTermKey, GlossaryEntry> = {
  crossBureauRationalization: {
    term: "Cross-bureau rationalization",
    definition:
      "A check for AI use cases that look like the same effort being built more than once across different bureaus, so a reviewer can decide whether to consolidate them or keep them separate before approving.",
  },
  ombReportability: {
    term: "OMB reportability",
    definition:
      "Whether federal guidance requires this AI use case to appear in the government-wide AI use case inventory OMB collects each year.",
  },
  consolidatedIndividualReporting: {
    term: "Consolidated / individual reporting",
    definition:
      "How a use case is counted in the OMB inventory: \"Consolidated\" means it matches a common, widely-used AI category and is reported once for the whole department instead of once per bureau; \"Individual\" means it's reported on its own.",
  },
  highImpactDetermination: {
    term: "High-impact determination",
    definition:
      "A recommendation on whether an AI use case meets OMB's definition of \"high-impact\" — meaning its output could meaningfully affect people's rights, safety, access to benefits, resource allocation, or enforcement outcomes. A reviewer makes the final call.",
  },
  nistAiRmf: {
    term: "NIST AI RMF",
    definition:
      "The NIST AI Risk Management Framework, a four-part lens (Govern, Map, Measure, Manage) used to check how well a use case's existing information covers AI governance and risk practices.",
  },
  coveredPartialGap: {
    term: "Covered / partial / gap",
    definition:
      "The status of a single NIST AI RMF function for a use case: \"Covered\" means the expected information is fully in place, \"Partial\" means some is missing, and \"Gap\" means none of it is.",
  },
  tokenOverlapMatch: {
    term: "Token-overlap match",
    definition:
      "A plain word-overlap comparison between two submissions' descriptions, used to flag ones that look like the same idea. It's a simple heuristic for a human to confirm, not a semantic or AI-based match.",
  },
  awaitingBureauSignOff: {
    term: "Awaiting bureau sign-off",
    definition:
      "This use case has been approved or rejected, but no record yet shows which bureau official signed off on that decision or when.",
  },
  advisory: {
    term: "Advisory",
    definition:
      "This is a recommendation for a human reviewer to confirm or override — it never sets the final answer by itself.",
  },
}

export const GLOSSARY_TERM_KEYS = Object.keys(GLOSSARY) as GlossaryTermKey[]
