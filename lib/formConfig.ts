// Form configuration store — which fields are turned on/off in the wizard.
// Backed by localStorage so admin toggles persist across reloads. Defaults
// to all-fields-enabled so the wizard works out of the box without setup.
//
// Per the design choice locked in with Matt:
//   - Locked fields are always enabled regardless of stored config.
//   - Toggle changes apply on next page load (no live re-render needed).
//   - Existing draft data is preserved when a field is toggled off, in case
//     the admin re-enables it later.

import { useEffect, useState, useCallback } from "react"
import { FIELD_REGISTRY, FIELD_REGISTRY_BY_KEY } from "@/lib/fieldRegistry"
import type { FormData } from "@/lib/steps"

const STORAGE_KEY = "launchpad-form-config"

export type FormConfig = {
  // Map from FormData key → enabled flag. Missing keys default to enabled.
  enabled: Record<string, boolean>
  updatedAt: string
  updatedBy?: string
}

function defaultConfig(): FormConfig {
  const enabled: Record<string, boolean> = {}
  for (const f of FIELD_REGISTRY) enabled[f.fieldKey] = true
  return { enabled, updatedAt: new Date().toISOString() }
}

export function getFormConfig(): FormConfig {
  if (typeof window === "undefined") return defaultConfig()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultConfig()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || !parsed.enabled) return defaultConfig()
    // Merge with defaults so any newly-added registry fields get an "enabled"
    // default rather than being undefined.
    const merged = defaultConfig()
    for (const key of Object.keys(parsed.enabled)) {
      if (key in merged.enabled) merged.enabled[key] = Boolean(parsed.enabled[key])
    }
    return {
      enabled: merged.enabled,
      updatedAt: parsed.updatedAt || merged.updatedAt,
      updatedBy: parsed.updatedBy,
    }
  } catch (error) {
    console.error("Failed to read form config from localStorage:", error)
    return defaultConfig()
  }
}

/**
 * Check whether a field should appear in the wizard. Locked fields always
 * return true regardless of the stored toggle state.
 */
export function isFieldEnabled(fieldKey: keyof FormData | string): boolean {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  // Fields not in the registry default to enabled (e.g., the AI-output fields
  // like readinessScore, executiveSummary that aren't user-toggleable).
  if (!def) return true
  if (def.locked) return true
  const config = getFormConfig()
  // Missing in config also defaults to enabled.
  return config.enabled[fieldKey] !== false
}

/**
 * Set a field's enabled state. No-op for locked fields.
 */
export function setFieldEnabled(
  fieldKey: keyof FormData | string,
  enabled: boolean,
  updatedBy?: string,
): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: false, error: "Server-side" }
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return { ok: false, error: "Unknown field" }
  if (def.locked) return { ok: false, error: "Field is locked" }
  try {
    const config = getFormConfig()
    config.enabled[fieldKey] = enabled
    config.updatedAt = new Date().toISOString()
    if (updatedBy) config.updatedBy = updatedBy
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    return { ok: true }
  } catch (error) {
    console.error("Failed to write form config:", error)
    return { ok: false, error: String(error) }
  }
}

/**
 * Reset all toggleable fields to enabled.
 */
export function resetFormConfig(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultConfig()))
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
  if (stepFields.length === 0) return true // step 9 (review) and 10 (confirmation) have no registry fields
  return stepFields.some((f) => isFieldEnabled(f.fieldKey))
}

/**
 * Client hook for field visibility. Reads the form config on mount and returns
 * a stable predicate function. Use this in step components to gate field
 * rendering — keeps SSR/hydration clean and avoids re-reading localStorage on
 * every render.
 *
 * Usage:
 *   const isVisible = useFieldVisibility()
 *   {isVisible("painPoints") && <Field ... />}
 */
export function useFieldVisibility(): (fieldKey: keyof FormData | string) => boolean {
  const [config, setConfig] = useState<FormConfig | null>(null)

  useEffect(() => {
    setConfig(getFormConfig())
  }, [])

  return useCallback(
    (fieldKey: keyof FormData | string) => {
      const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
      // Unregistered fields default to visible.
      if (!def) return true
      // Locked fields are always visible regardless of config.
      if (def.locked) return true
      // Before config loads (SSR / first paint), default to visible so we
      // don't briefly flash a hidden field, then hide if needed on client.
      if (!config) return true
      return config.enabled[fieldKey as string] !== false
    },
    [config],
  )
}
