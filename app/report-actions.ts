"use server"

// F5-5 (#322): Plumb's read of the portfolio, for /report (ES2 only).
// Guarded like compareSubmissions (reviewer or admin). Takes no ideas from the
// browser: it loads what the signed-in person may see, builds the report, and
// asks the assistant about that report. Nothing is stored. Any failure after
// the guard comes back as { status: "unavailable" } and never throws to the screen.

import { z } from "zod"
import { generateObjectResilient } from "@/lib/aiResilience"
import { fetchAllSubmissionRows } from "@/lib/fetchAllSubmissionRows"
import { getModel } from "@/lib/modelProvider"
import { composePortfolioNote, type PortfolioNoteResult } from "@/lib/portfolioNote"
import { REVIEWER_UP, requireActionSession } from "@/lib/session/guard"
import { submissionFromRow } from "@/lib/submissionFromRow"
import { getSupabaseAdmin } from "@/lib/supabaseClient"
import { getTenant } from "@/lib/tenant"

export async function writePortfolioNote(office?: string): Promise<PortfolioNoteResult> {
  const session = requireActionSession({ role: REVIEWER_UP })
  const tenant = getTenant()
  if (!tenant.features.portfolioReport) return { status: "unavailable" }
  try {
    const { rows } = await fetchAllSubmissionRows(getSupabaseAdmin())
    return await composePortfolioNote({
      all: rows.map(submissionFromRow),
      session,
      tenant,
      office: typeof office === "string" && office ? office : null,
      now: Date.now(),
      ask: async ({ system, user }) => {
        const result = await generateObjectResilient("writePortfolioNote", {
          model: getModel(),
          schema: z.object({
            note: z.string().describe("Two or three plain sentences about the portfolio report. Advice only."),
          }),
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        })
        return result?.object?.note
      },
    })
  } catch (error) {
    console.error("writePortfolioNote failed:", error)
    return { status: "unavailable" }
  }
}
