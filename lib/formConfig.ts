// Form configuration — now backed by Supabase via /api/form-config.
//
// Read side stays sync (reads from the DataProvider cache) so the existing
// isFieldEnabled / useFieldVisibility consumers don't need to become async.
// Write side is async (POSTs to API, caller refetches via DataProvider).

import { useEffect, useState, useCallback } from "react"
import { FIELD_REGISTRY, FIELD_REGISTRY_BY_KEY } from "@/lib/fieldRegistry"
import type { FormData } from "@/lib/steps"
import {
  getCachedFormConfig,
  setCachedFormConfig,
  subscribeToCache,
} from "@/lib/dataCache"

export type FormConfig = {
  enabled: Record<string, boolean>
  updatedAt: string
  updatedBy?: string
}

function defaultConfig(): FormConfig {
  const enabled: Record<string, boolean> = {}
  for (const f of FIELD_REGISTRY) enabled[f.fieldKey] = true
  return { enabled, updatedAt: new Date().toISOString() }
}

/** Synchronous read of the current form config from the cache. */
export function getFormConfig(): FormConfig {
  const cached = getCachedFormConfig()
  // Merge with defaults so new registry fields appear enabled by default
  // when admin hasn't explicitly toggled them.
  const merged = defaultConfig()
  for (const key of Object.keys(cached.enabled || {})) {
    if (key in merged.enabled) merged.enabled[key] = Boolean(cached.enabled[key])
  }
  return {
    enabled: merged.enabled,
    updatedAt: cached.updatedAt || merged.updatedAt,
    updatedBy: cached.updatedBy || undefined,
  }
}

/**
 * Check whether a field should appear in the wizard. Locked fields always
 * return true regardless of stored config.
 */
export function isFieldEnabled(fieldKey: keyof FormData | string): boolean {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return true
  if (def.locked) return true
  const config = getFormConfig()
  return config.enabled[fieldKey as string] !== false
}

/**
 * Async write — PUTs the new enabled map to the server, then optimistically
 * updates the cache so the UI reflects the change without waiting for a
 * full refetch.
 */
export async function setFieldEnabled(
  fieldKey: keyof FormData | string,
  enabled: boolean,
  updatedBy?: string,
): Promise<{ ok: boolean; error?: string }> {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return { ok: false, error: "Unknown field" }
  if (def.locked) return { ok: false, error: "Field is locked" }
  // Snapshot current state so we can revert if the save fails.
  const current = getFormConfig()
  const prevEnabled = current.enabled
  const next = { ...prevEnabled, [fieldKey as string]: enabled }
  // Optimistic update — flip the cache BEFORE the network round-trip so the
  // toggle responds instantly. Subscribers (the admin panel, open wizard tabs)
  // re-render now instead of waiting on the fetch. Revert below if it fails.
  setCachedFormConfig({
    enabled: next,
    updatedAt: new Date().toISOString(),
    updatedBy,
  })
  const revert = () =>
    setCachedFormConfig({
      enabled: prevEnabled,
      updatedAt: current.updatedAt,
      updatedBy: current.updatedBy ?? null,
    })
  try {
    const res = await fetch("/api/form-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next, updatedBy }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      revert()
      // Prefer the server's `detail` (the actual Postgres/Supabase error) over
      // the generic `error` so the toast tells us exactly why the write failed.
      const detail =
        body.detail && body.error
          ? `${body.error}: ${body.detail}`
          : body.detail || body.error || "Failed to save form config"
      return { ok: false, error: detail }
    }
    return { ok: true }
  } catch (error) {
    revert()
    return { ok: false, error: String(error) }
  }
}

/** Reset all togglable fields to enabled. */
export async function resetFormConfig(): Promise<void> {
  try {
    const reset: Record<string, boolean> = {}
    for (const f of FIELD_REGISTRY) reset[f.fieldKey] = true
    await fetch("/api/form-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: reset }),
    })
    setCachedFormConfig({ enabled: reset, updatedAt: new Date().toISOString() })
  } catch (error) {
    console.error("Failed to reset form config:", error)
  }
}

/**
 * Returns true if the given step has at least one enabled field. Used by the
 * wizard to auto-skip steps that have been entirely disabled.
 */
export function isStepEnabled(step: number): boolean {
  const stepFields = FIELD_REGISTRY.filter((f) => f.step === step)
  if (stepFields.length === 0) return true
  return stepFields.some((f) => isFieldEnabled(f.fieldKey))
}

/**
 * Client hook for field visibility. Subscribes to cache changes so toggle
 * edits in the admin panel propagate to open wizard tabs without a reload.
 */
export function useFieldVisibility(): (fieldKey: keyof FormData | string) => boolean {
  const [, force] = useState(0)
  useEffect(() => subscribeToCache(() => force((n) => n + 1)), [])
  return useCallback((fieldKey: keyof FormData | string) => {
    return isFieldEnabled(fieldKey)
  }, [])
}
