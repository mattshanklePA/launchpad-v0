// F3-6 item 2: the only data the signed-out landing page may show — two
// numbers. Kept as a pure function over rows so the "nothing but two counts"
// guarantee is the function's return type, not a convention.

export type PublicSummary = { submitted: number; deployed: number }

type SummaryRow = { status?: string | null; form_data?: unknown }

export function publicSummary(rows: SummaryRow[]): PublicSummary {
  const statusOf = (r: SummaryRow) => r.status || (r.form_data as { reviewStatus?: string } | null | undefined)?.reviewStatus
  return { submitted: rows.length, deployed: rows.filter((r) => statusOf(r) === "approved").length }
}
