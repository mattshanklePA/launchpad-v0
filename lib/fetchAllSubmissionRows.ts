// SEC-4: read every submission row, newest first, without a silent cut.
//
// PostgREST (Supabase) silently truncates a single read at its max-rows
// setting (1000 by default), so one unranged select is not "all rows". This
// pages with .range() until a short page comes back. A high safety ceiling
// stops a runaway table from exhausting memory; hitting it logs a warning and
// reports `truncated: true` so callers can tell the user instead of hiding it.

import type { DbSubmissionRow } from "@/lib/supabaseClient"

export const SUBMISSIONS_PAGE_SIZE = 1000
export const SUBMISSIONS_CEILING = 5000

type PageQuery = {
  select: (cols: string) => {
    order: (col: string, opts: { ascending: boolean }) => {
      range: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>
    }
  }
}

export async function fetchAllSubmissionRows(
  supabase: { from: (table: string) => unknown },
  ceiling: number = SUBMISSIONS_CEILING,
): Promise<{ rows: DbSubmissionRow[]; truncated: boolean }> {
  const rows: DbSubmissionRow[] = []
  while (rows.length < ceiling) {
    const from = rows.length
    const size = Math.min(SUBMISSIONS_PAGE_SIZE, ceiling - from)
    const { data, error } = await (supabase.from("submissions") as PageQuery)
      .select("*")
      // id as a tiebreak is not available through this chain; submitted_at plus
      // stable page boundaries is sufficient for a read-only listing.
      .order("submitted_at", { ascending: false })
      .range(from, from + size - 1)
    if (error) throw error
    const page = (data || []) as DbSubmissionRow[]
    rows.push(...page)
    if (page.length < size) return { rows, truncated: false }
  }
  // Ceiling reached with a full last page: there may be more rows behind it.
  console.warn(
    `submissions list reached the safety ceiling of ${ceiling} rows; older records are not included`,
  )
  return { rows, truncated: true }
}
