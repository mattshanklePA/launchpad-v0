// Database side of saved Plumb reads (issue #272): the `plumb_reads` table
// (db/migrations/0009_plumb_reads.sql). Both functions swallow errors: until
// the migration has run on a site the table is missing, and the record must
// behave exactly as before (read on open, nothing saved).

import { getSupabaseAdmin } from "@/lib/supabaseClient"
import type { PlumbRead, SavedPlumbRead } from "@/lib/plumbRead"

export async function loadSavedPlumbRead(submissionId: string): Promise<SavedPlumbRead | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("plumb_reads")
      .select("read, fingerprint, saved_at")
      .eq("submission_id", submissionId)
      .maybeSingle()
    if (error) {
      console.warn("[plumbRead] load skipped:", error.message)
      return null
    }
    if (!data || !data.read || !data.fingerprint) return null
    return { read: data.read as PlumbRead, fingerprint: String(data.fingerprint), savedAt: new Date(data.saved_at).toISOString() }
  } catch (error) {
    console.warn("[plumbRead] load skipped:", error instanceof Error ? error.message : error)
    return null
  }
}

export async function savePlumbRead(submissionId: string, saved: SavedPlumbRead): Promise<void> {
  try {
    const { error } = await getSupabaseAdmin()
      .from("plumb_reads")
      .upsert({ submission_id: submissionId, read: saved.read, fingerprint: saved.fingerprint, saved_at: saved.savedAt }, { onConflict: "submission_id" })
    if (error) console.warn("[plumbRead] save skipped:", error.message)
  } catch (error) {
    console.warn("[plumbRead] save skipped:", error instanceof Error ? error.message : error)
  }
}
