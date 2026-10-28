// Server-side read/write of the "Reset Demo Data" stamp (demo_state table,
// db/migrations/0007_demo_reset_stamp.sql). Both never throw: an unmigrated
// tenant just behaves as if no reset was ever stamped.

import { getSupabaseAdmin } from "@/lib/supabaseClient"

export async function readLastDemoReset(): Promise<string | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("demo_state")
      .select("last_reset_at")
      .eq("id", 1)
      .maybeSingle()
    if (error) {
      console.warn("[demoResetStamp] read skipped:", error.message)
      return null
    }
    return (data?.last_reset_at as string | null | undefined) ?? null
  } catch (error) {
    console.warn("[demoResetStamp] read skipped:", error instanceof Error ? error.message : error)
    return null
  }
}

/** Stamp a reset at `at` and return the stored value, or null if it couldn't be stored. */
export async function stampDemoReset(at: Date = new Date()): Promise<string | null> {
  const iso = at.toISOString()
  try {
    const { error } = await getSupabaseAdmin()
      .from("demo_state")
      .upsert({ id: 1, last_reset_at: iso }, { onConflict: "id" })
    if (error) {
      console.warn("[demoResetStamp] write skipped:", error.message)
      return null
    }
    return iso
  } catch (error) {
    console.warn("[demoResetStamp] write skipped:", error instanceof Error ? error.message : error)
    return null
  }
}
