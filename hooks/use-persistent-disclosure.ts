"use client"

import { useEffect, useState } from "react"

// Disclosure (e.g. "Add optional detail") open/closed state that survives
// step navigation and page refresh. Backed by localStorage under a per-key
// namespace. SSR-safe: starts from `initial`, then syncs from storage on mount.
export function usePersistentDisclosure(
  key: string,
  initial = false,
): [boolean, (value: boolean | ((prev: boolean) => boolean)) => void] {
  const storageKey = `aid-disclosure-${key}`
  const [open, setOpenState] = useState(initial)

  useEffect(() => {
    if (typeof window === "undefined") return
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) setOpenState(stored === "1")
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setOpen = (value: boolean | ((prev: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof value === "function" ? (value as (p: boolean) => boolean)(prev) : value
      try {
        if (typeof window !== "undefined") localStorage.setItem(storageKey, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  return [open, setOpen]
}
