"use client"

import { useEffect, useState } from "react"
import { getSession } from "@/lib/auth"
import { scopedDraftKey } from "@/lib/draftStorage"

export type IntakeMode = "guided" | "form"

const INTAKE_MODE_KEY_BASE = "aid-intake-mode"

function storageKey(): string {
  return scopedDraftKey(INTAKE_MODE_KEY_BASE, getSession()?.userId)
}

// Guided-vs-Form intake mode preference (issue #170), remembered per
// signed-in user the same way the wizard draft is scoped (lib/draftStorage.ts)
// so one account's choice never leaks to the next person who signs in on the
// same browser. SSR-safe: renders "guided" (the default for a submitter with
// no stored choice yet) until mounted, then syncs from localStorage.
export function useIntakeModePreference(): {
  mode: IntakeMode
  hasStoredPreference: boolean
  setMode: (mode: IntakeMode) => void
} {
  const [mode, setModeState] = useState<IntakeMode>("guided")
  const [hasStoredPreference, setHasStoredPreference] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey())
      if (stored === "guided" || stored === "form") {
        setModeState(stored)
        setHasStoredPreference(true)
      }
    } catch {
      /* ignore */
    }
  }, [])

  const setMode = (next: IntakeMode) => {
    setModeState(next)
    setHasStoredPreference(true)
    try {
      if (typeof window !== "undefined") localStorage.setItem(storageKey(), next)
    } catch {
      /* ignore */
    }
  }

  return { mode, hasStoredPreference, setMode }
}
