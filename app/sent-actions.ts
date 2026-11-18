"use server"

// F6-3 (#343): the number on the "sent" page. A submitter's session can read only
// their own ideas, so the office's typical time to a decision is worked out here.
// The idea is loaded by its id, the caller must be allowed to see it, and the
// answer is one number or one marker. Nothing else about anyone's ideas leaves.

import { requireActionSession } from "@/lib/session/guard"
import { getSupabaseAdmin, type DbSubmissionRow } from "@/lib/supabaseClient"
import { submissionFromRow } from "@/lib/submissionFromRow"
import { visibleToSession } from "@/lib/serverAccess"
import { fetchAllSubmissionRows } from "@/lib/fetchAllSubmissionRows"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import { officeDecisionTime, type OfficeDecisionTime } from "@/lib/officeDecisionTime"

export type SentDecisionTime = OfficeDecisionTime | { status: "refused" }

const REFUSED: SentDecisionTime = { status: "refused" }

export async function getOfficeDecisionTime(submissionId: string): Promise<SentDecisionTime> {
  const session = requireActionSession()
  if (typeof submissionId !== "string" || !submissionId) return REFUSED

  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.from("submissions").select("*").eq("id", submissionId).limit(1)
    if (error) throw error
    const row = (data || [])[0] as DbSubmissionRow | undefined
    const idea = row ? submissionFromRow(row) : null
    // The same answer for an unknown id and an idea the caller may not see.
    if (!idea || visibleToSession([idea], session).length === 0) return REFUSED

    const { rows } = await fetchAllSubmissionRows(supabase)
    return officeDecisionTime(rows.map(submissionFromRow), getBusinessUnit(idea), Date.now())
  } catch (error) {
    console.error("getOfficeDecisionTime: could not work out the time:", error)
    return { status: "not-enough" }
  }
}
