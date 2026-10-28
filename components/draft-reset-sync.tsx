"use client"

// Mounted once in the root layout. On each full page load, asks the server
// when "Reset Demo Data" last ran and, if this browser hasn't acted on that
// reset yet, clears its leftover unsubmitted drafts (lib/demoReset.ts). If
// anything was cleared, reloads once so a page that already read a draft
// (the wizard, the Recent Drafts card) shows the clean state. The second load
// finds the reset already acted on, so it cannot loop. Renders nothing.

import { useEffect } from "react"
import { syncDraftsWithDemoReset } from "@/lib/demoReset"

export function DraftResetSync() {
  useEffect(() => {
    let cancelled = false
    fetch("/api/demo-reset", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { lastResetAt?: string | null } | null) => {
        if (cancelled || !json) return
        const { cleared } = syncDraftsWithDemoReset(json.lastResetAt ?? null, window.localStorage)
        if (cleared > 0) window.location.reload()
      })
      .catch(() => {
        /* best-effort: a failed check just leaves drafts as they were */
      })
    return () => {
      cancelled = true
    }
  }, [])
  return null
}
