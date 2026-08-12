"use client"

// Admin Form Configuration panel. Shows every field in scope for the current
// viewer's bureau (`fieldsForBureau` — the DoC field-config cascade, issue
// #57), grouped by phase, with a Switch to enable/disable each one.
//
// Level-aware: an OMB/department-mandated field, a locked system field, or a
// field an OS/department admin has marked mandatory for all bureaus all
// render as on and disabled with a hint explaining why. A bureau-scoped
// optional field (`level: "bureau"` + `businessUnit`) only appears for, and
// is only togglable by, that bureau's own admin (or a department-level
// viewer). Everything else — the general optional field pool — behaves
// exactly as before: togglable by any admin. USPTO/DoW have no bureau tier,
// so `fieldsForBureau`/`canToggleField` no-op the whole cascade for them and
// this panel renders exactly as it did before issue #57.

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Lock, RotateCcw, SlidersHorizontal, Eye, EyeOff, Landmark, Building2 } from "lucide-react"
import {
  fieldsForBureau,
  fieldLevel,
  canToggleField,
  canMarkFieldMandatory,
  type FieldDefinition,
  type FieldViewer,
} from "@/lib/fieldRegistry"
import {
  getFormConfig,
  setFieldEnabled,
  setFieldMandatory,
  isFieldMandatory,
  resetFormConfig,
  type FormConfig,
} from "@/lib/formConfig"
import { adminFieldGroups } from "@/lib/steps"
import { getSession } from "@/lib/auth"
import { businessUnitLabel } from "@/lib/reviewWorkflow"
import { getTenant } from "@/lib/tenant"
import { subscribeToCache } from "@/lib/dataCache"

export function FormConfigPanel() {
  const [config, setConfig] = useState<FormConfig | null>(null)
  const { toast } = useToast()
  const tiers = getTenant().tierLabels
  const unitLower = tiers.unit.toLowerCase()
  const unitPluralLower = tiers.unitPlural.toLowerCase()
  const inventoryShort = getTenant().inventoryShortLabel

  // Re-derive config from the shared cache on mount AND whenever the cache
  // changes (e.g., when the DataProvider's initial fetch lands after this
  // panel has already mounted). Without this subscription the panel would
  // snapshot an empty cache on first render and never refresh.
  useEffect(() => {
    const sync = () => setConfig(getFormConfig())
    sync()
    return subscribeToCache(sync)
  }, [])

  const session = getSession()
  const viewer: FieldViewer = session ? { role: session.role, businessUnit: session.businessUnit } : null
  const fields = fieldsForBureau(session?.businessUnit)

  const handleToggle = async (field: FieldDefinition, next: boolean) => {
    if (!config) return
    if (!canToggleField(field, viewer, { mandatory: !!config.mandatory[field.fieldKey] })) return
    const result = await setFieldEnabled(field.fieldKey, next, session?.email, viewer)
    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Couldn't update field",
        description: result.error || "Unknown error",
      })
      return
    }
    setConfig(getFormConfig())
    toast({
      title: next ? "Field enabled" : "Field disabled",
      description: `"${field.label}" will ${next ? "appear in" : "be hidden from"} the wizard for every visitor on next load.`,
    })
  }

  const handleToggleMandatory = async (field: FieldDefinition, next: boolean) => {
    const result = await setFieldMandatory(field.fieldKey, next, session?.email, viewer)
    if (!result.ok) {
      toast({
        variant: "destructive",
        title: "Couldn't update field",
        description: result.error || "Unknown error",
      })
      return
    }
    setConfig(getFormConfig())
    toast({
      title: next ? `Marked mandatory for all ${unitPluralLower}` : "No longer mandatory",
      description: `"${field.label}" ${next ? `now appears for, and can't be turned off by, every ${unitLower}.` : `is back to an optional field ${unitPluralLower} can toggle.`}`,
    })
  }

  const handleReset = async () => {
    if (!confirm("Reset every field to enabled? This affects the wizard for all visitors.")) return
    await resetFormConfig()
    setConfig(getFormConfig())
    toast({
      title: "Form configuration reset",
      description: "All fields are now enabled.",
    })
  }

  if (!config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Form Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 animate-pulse bg-muted/50 rounded" />
        </CardContent>
      </Card>
    )
  }

  // Compute counts for the header summary — scoped to `fields` (this
  // viewer's bureau) rather than the full registry, so a bureau admin's
  // counts reflect what they can actually see.
  const totalToggleable = fields.filter((f) => !f.locked && !isFieldMandatory(f.fieldKey, config)).length
  const totalEnabled = fields.filter(
    (f) => f.locked || isFieldMandatory(f.fieldKey, config) || config.enabled[f.fieldKey] !== false,
  ).length
  const totalDisabled = fields.length - totalEnabled

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5" />
              Form Configuration
            </CardTitle>
            <CardDescription>
              Customize which fields appear in the submission wizard. Hidden fields are also
              excluded from the readiness check at the end. Changes take effect on next page load.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            Reset all to on
          </Button>
        </div>
        <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <span>
            <Eye className="h-3 w-3 inline mr-1 text-green-600" />
            {totalEnabled} enabled
          </span>
          <span>
            <EyeOff className="h-3 w-3 inline mr-1 text-muted-foreground" />
            {totalDisabled} hidden
          </span>
          <span>
            <Lock className="h-3 w-3 inline mr-1 text-uspto-blue-primary" />
            {fields.length - totalToggleable} locked / mandatory
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {adminFieldGroups.map((phase) => {
          const phaseFields = fields.filter((f) => f.phase === phase.phase)
          if (phaseFields.length === 0) return null

          const enabledInPhase = phaseFields.filter(
            (f) => f.locked || isFieldMandatory(f.fieldKey, config) || config.enabled[f.fieldKey] !== false,
          ).length

          return (
            <div key={phase.phase} className="space-y-3">
              <div className="flex items-baseline justify-between border-b pb-2">
                <div>
                  <h3 className="font-semibold text-base">
                    Phase {phase.phase} · {phase.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{phase.description}</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {enabledInPhase} of {phaseFields.length} on
                </span>
              </div>

              <div className="space-y-2">
                {phaseFields.map((field) => {
                  const level = fieldLevel(field)
                  const mandatoryOverride = !!config.mandatory[field.fieldKey]
                  const mandatory = isFieldMandatory(field.fieldKey, config)
                  const enabled = field.locked || mandatory || config.enabled[field.fieldKey] !== false
                  const toggleAllowed = canToggleField(field, viewer, { mandatory: mandatoryOverride })
                  const promoteAllowed = canMarkFieldMandatory(field, viewer)
                  const owningBureauLabel = field.businessUnit ? businessUnitLabel(field.businessUnit) : null

                  let levelHint: string | null = null
                  if (level === "omb" && !toggleAllowed) {
                    levelHint = `Required by ${inventoryShort} — mandatory for every ${unitLower}, cannot be turned off.`
                  } else if (level === "department" && !toggleAllowed) {
                    levelHint = `Required by the ${tiers.department} — mandatory for every ${unitLower}, cannot be turned off.`
                  } else if (mandatoryOverride) {
                    levelHint = `Marked mandatory for all ${unitPluralLower} by a ${tiers.department.toLowerCase()} admin.`
                  } else if (owningBureauLabel) {
                    levelHint = `${owningBureauLabel} optional field — only that ${unitLower} can toggle it.`
                  }

                  return (
                    <div
                      key={field.fieldKey}
                      className={`rounded-lg border p-3 transition-colors ${
                        field.locked || (level !== "bureau" && !toggleAllowed) || mandatoryOverride
                          ? "bg-uspto-blue-primary/5 border-uspto-blue-primary/20"
                          : enabled
                            ? "bg-white"
                            : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{field.label}</span>
                            {field.locked && (
                              <Badge
                                variant="outline"
                                className="text-[10px] bg-uspto-blue-primary/10 border-uspto-blue-primary/30 text-uspto-blue-primary"
                              >
                                <Lock className="h-2.5 w-2.5 mr-1" />
                                Locked
                              </Badge>
                            )}
                            {level === "omb" && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-800">
                                <Landmark className="h-2.5 w-2.5 mr-1" />
                                {inventoryShort}
                              </Badge>
                            )}
                            {level === "department" && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-800">
                                <Building2 className="h-2.5 w-2.5 mr-1" />
                                {tiers.department}
                              </Badge>
                            )}
                            {mandatoryOverride && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 border-amber-300 text-amber-800">
                                <Lock className="h-2.5 w-2.5 mr-1" />
                                Mandatory (all {unitPluralLower})
                              </Badge>
                            )}
                            {owningBureauLabel && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {owningBureauLabel} only
                              </Badge>
                            )}
                            {!field.locked && !mandatory && !enabled && (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                Hidden from wizard
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                          <p className="text-xs text-foreground/80">
                            <span className="font-semibold">Why include: </span>
                            {field.reasonToInclude}
                          </p>
                          {field.locked && field.lockedReason && (
                            <p className="text-xs text-uspto-blue-primary italic">
                              {field.lockedReason}
                            </p>
                          )}
                          {levelHint && (
                            <p className="text-xs text-uspto-blue-primary italic">{levelHint}</p>
                          )}
                        </div>
                        <div className="flex-shrink-0 pt-1 flex flex-col items-end gap-2">
                          <Switch
                            checked={enabled}
                            disabled={!toggleAllowed}
                            onCheckedChange={(next) => handleToggle(field, next)}
                            aria-label={`${field.label}: ${enabled ? "on" : "off"}`}
                          />
                          {promoteAllowed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] text-muted-foreground"
                              onClick={() => handleToggleMandatory(field, !mandatoryOverride)}
                            >
                              {mandatoryOverride ? "Unmark mandatory" : `Mark mandatory for all ${unitPluralLower}`}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
