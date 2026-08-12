// Form configuration — now backed by Supabase via /api/form-config.
//
// Read side stays sync (reads from the DataProvider cache) so the existing
// isFieldEnabled / useFieldVisibility consumers don't need to become async.
// Write side is async (POSTs to API, caller refetches via DataProvider).

import { useEffect, useState, useCallback } from "react"
import {
  FIELD_REGISTRY,
  FIELD_REGISTRY_BY_KEY,
  fieldsForBureau,
  fieldLevel,
  canToggleField,
  canMarkFieldMandatory,
  type FieldViewer,
} from "@/lib/fieldRegistry"
import { tenantHasBureauTier } from "@/lib/rationalization"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import type { FormData } from "@/lib/steps"
import {
  getCachedFormConfig,
  setCachedFormConfig,
  subscribeToCache,
} from "@/lib/dataCache"

export type FormConfig = {
  enabled: Record<string, boolean>
  // OS/department admin-promoted "mandatory for every bureau" overrides for
  // otherwise-optional `level: "bureau"` fields (see `canMarkFieldMandatory`
  // / `setFieldMandatory`). Empty for USPTO/DoW — no bureau tier, so nothing
  // ever sets it.
  mandatory: Record<string, boolean>
  updatedAt: string
  updatedBy?: string
}

function defaultConfig(): FormConfig {
  const enabled: Record<string, boolean> = {}
  for (const f of FIELD_REGISTRY) enabled[f.fieldKey] = true
  return { enabled, mandatory: {}, updatedAt: new Date().toISOString() }
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
  const cachedMandatory = cached.mandatory ?? {}
  const mandatory: Record<string, boolean> = {}
  for (const key of Object.keys(cachedMandatory)) {
    if (key in FIELD_REGISTRY_BY_KEY && cachedMandatory[key]) mandatory[key] = true
  }
  return {
    enabled: merged.enabled,
    mandatory,
    updatedAt: cached.updatedAt || merged.updatedAt,
    updatedBy: cached.updatedBy || undefined,
  }
}

/**
 * True when `fieldKey` is mandatory for every bureau — OMB/department level
 * (bureau-tier tenants only, see `canToggleField`), or admin-promoted via
 * `setFieldMandatory`.
 */
export function isFieldMandatory(
  fieldKey: keyof FormData | string,
  config: FormConfig = getFormConfig(),
  tenant: TenantConfig = getTenant(),
): boolean {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return false
  if (tenantHasBureauTier(tenant)) {
    const level = fieldLevel(def)
    if (level === "omb" || level === "department") return true
  }
  return !!config.mandatory[fieldKey as string]
}

/**
 * Check whether a field should appear in the wizard. Locked and mandatory
 * fields always return true regardless of the stored enabled map. Pass
 * `businessUnit` (the submitter's bureau, `formData.submitterOffice`) to also
 * apply the cascade's bureau-scoping (`fieldsForBureau`) — a field scoped to
 * another bureau never appears, even if `enabled` says true. Omit it for
 * call sites with no submitter bureau in scope; the cascade scoping is then
 * skipped (matches the pre-cascade behavior — locked/enabled checks still apply).
 */
export function isFieldEnabled(fieldKey: keyof FormData | string, businessUnit?: string | null): boolean {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return true
  if (def.locked) return true
  if (businessUnit !== undefined) {
    const inScope = fieldsForBureau(businessUnit).some((f) => f.fieldKey === def.fieldKey)
    if (!inScope) return false
  }
  const config = getFormConfig()
  if (isFieldMandatory(fieldKey, config)) return true
  return config.enabled[fieldKey as string] !== false
}

/**
 * Async write — PUTs the new enabled map to the server, then optimistically
 * updates the cache so the UI reflects the change without waiting for a
 * full refetch. Pass `viewer` (the acting admin's role/businessUnit) to
 * enforce the cascade — `canToggleField` rejects locked/mandatory fields and
 * another bureau's scoped optional field. Omitting `viewer` skips that check
 * (server-side enforcement is a follow-up, same posture as the rest of the
 * app's admin surfaces — see docs/ARCHITECTURE.md's RLS posture note).
 */
export async function setFieldEnabled(
  fieldKey: keyof FormData | string,
  enabled: boolean,
  updatedBy?: string,
  viewer?: FieldViewer,
): Promise<{ ok: boolean; error?: string }> {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return { ok: false, error: "Unknown field" }
  if (def.locked) return { ok: false, error: "Field is locked" }
  const current = getFormConfig()
  if (viewer && !canToggleField(def, viewer, { mandatory: current.mandatory[fieldKey as string] })) {
    return { ok: false, error: "You don't have permission to toggle this field" }
  }
  // Snapshot current state so we can revert if the save fails.
  const prevEnabled = current.enabled
  const next = { ...prevEnabled, [fieldKey as string]: enabled }
  // Optimistic update — flip the cache BEFORE the network round-trip so the
  // toggle responds instantly. Subscribers (the admin panel, open wizard tabs)
  // re-render now instead of waiting on the fetch. Revert below if it fails.
  setCachedFormConfig({
    enabled: next,
    mandatory: current.mandatory,
    updatedAt: new Date().toISOString(),
    updatedBy,
  })
  const revert = () =>
    setCachedFormConfig({
      enabled: prevEnabled,
      mandatory: current.mandatory,
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

/**
 * Async write — promotes (or demotes) a bureau-level field to "mandatory for
 * all bureaus" (`FormConfig.mandatory`). Restricted to a department-level
 * viewer on an ordinary, unlocked bureau field (`canMarkFieldMandatory`).
 * Same optimistic-update/revert shape as `setFieldEnabled`.
 */
export async function setFieldMandatory(
  fieldKey: keyof FormData | string,
  mandatory: boolean,
  updatedBy?: string,
  viewer?: FieldViewer,
  tenant: TenantConfig = getTenant(),
): Promise<{ ok: boolean; error?: string }> {
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (!def) return { ok: false, error: "Unknown field" }
  if (viewer && !canMarkFieldMandatory(def, viewer)) {
    const { department, unitPlural } = tenant.tierLabels
    return {
      ok: false,
      error: `Only a ${department.toLowerCase()}-level admin can mark a field mandatory for all ${unitPlural.toLowerCase()}`,
    }
  }
  const current = getFormConfig()
  const prevMandatory = current.mandatory
  const next = { ...prevMandatory, [fieldKey as string]: mandatory }
  setCachedFormConfig({
    enabled: current.enabled,
    mandatory: next,
    updatedAt: new Date().toISOString(),
    updatedBy,
  })
  const revert = () =>
    setCachedFormConfig({
      enabled: current.enabled,
      mandatory: prevMandatory,
      updatedAt: current.updatedAt,
      updatedBy: current.updatedBy ?? null,
    })
  try {
    const res = await fetch("/api/form-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mandatory: next, updatedBy }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      revert()
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

/** Reset all togglable fields to enabled and clear every mandatory override. */
export async function resetFormConfig(): Promise<void> {
  try {
    const reset: Record<string, boolean> = {}
    for (const f of FIELD_REGISTRY) reset[f.fieldKey] = true
    await fetch("/api/form-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: reset, mandatory: {} }),
    })
    setCachedFormConfig({ enabled: reset, mandatory: {}, updatedAt: new Date().toISOString() })
  } catch (error) {
    console.error("Failed to reset form config:", error)
  }
}

/**
 * Returns true if the given step has at least one enabled field. Used by the
 * wizard to auto-skip steps that have been entirely disabled. Pass
 * `businessUnit` to also apply the cascade's bureau-scoping.
 */
export function isStepEnabled(step: number, businessUnit?: string | null): boolean {
  const stepFields = FIELD_REGISTRY.filter((f) => f.step === step)
  if (stepFields.length === 0) return true
  return stepFields.some((f) => isFieldEnabled(f.fieldKey, businessUnit))
}

/**
 * The single shared visibility resolver (issue #60): a field renders only
 * when it's in the bureau's cascade set AND admin-enabled (`isFieldEnabled`)
 * AND its own `showWhen(formData)` predicate passes (default: always show —
 * most fields have no predicate). Both the wizard (`useFieldVisibility`
 * below) and `lib/submissionReadiness.ts`'s required-at-submit check call
 * through this one function, so a field whose prerequisite isn't met yet is
 * never demanded at submit time — "still needed" and "currently rendered"
 * can never drift apart.
 */
export function isFieldVisible(fieldKey: keyof FormData | string, formData: FormData): boolean {
  if (!isFieldEnabled(fieldKey, formData.submitterOffice)) return false
  const def = FIELD_REGISTRY_BY_KEY[fieldKey as string]
  if (def?.showWhen && !def.showWhen(formData)) return false
  return true
}

/**
 * Client hook for field visibility. Subscribes to cache changes so toggle
 * edits in the admin panel propagate to open wizard tabs without a reload.
 * Pass the wizard's live `formData` so the returned checker applies the
 * cascade's bureau-scoping (via `formData.submitterOffice`) and each field's
 * `showWhen` predicate (via `isFieldVisible`) together.
 */
export function useFieldVisibility(formData: FormData): (fieldKey: keyof FormData | string) => boolean {
  const [, force] = useState(0)
  useEffect(() => subscribeToCache(() => force((n) => n + 1)), [])
  return useCallback(
    (fieldKey: keyof FormData | string) => {
      return isFieldVisible(fieldKey, formData)
    },
    [formData],
  )
}
