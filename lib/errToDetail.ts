// Serialize an unknown error (often a Supabase PostgrestError object) into a
// readable string. Plain String(error) on these objects yields "[object Object]",
// which hides the real cause. Pull out message/code/details/hint when present.
export function errToDetail(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>
    const parts = [
      e.message,
      e.code ? `[${e.code}]` : "",
      e.details,
      e.hint ? `hint: ${e.hint}` : "",
    ]
      .filter(Boolean)
      .map(String)
    if (parts.length) return parts.join(" ")
    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
  return String(error)
}
