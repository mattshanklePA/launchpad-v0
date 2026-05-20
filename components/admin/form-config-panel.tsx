"use client"

// Admin Form Configuration panel. Shows every toggleable field in the wizard,
// grouped by phase, with a Switch to enable/disable each one. Locked fields
// (system-critical and DoC-mandated AI risk questions) render as disabled
// with a lock icon and an explanation. Toggle clicks persist immediately.

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Lock, RotateCcw, SlidersHorizontal, Eye, EyeOff } from "lucide-react"
import {
  FIELD_REGISTRY,
  type FieldDefinition,
} from "@/lib/fieldRegistry"
import {
  getFormConfig,
  setFieldEnabled,
  resetFormConfig,
  type FormConfig,
} from "@/lib/formConfig"
import { formPhases } from "@/lib/steps"
import { getSession } from "@/lib/auth"

export function FormConfigPanel() {
  const [config, setConfig] = useState<FormConfig | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    setConfig(getFormConfig())
  }, [])

  const handleToggle = (field: FieldDefinition, next: boolean) => {
    if (field.locked) return
    const session = getSession()
    const result = setFieldEnabled(field.fieldKey, next, session?.email)
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
      description: `"${field.label}" will ${next ? "appear in" : "be hidden from"} the wizard on next load.`,
    })
  }

  const handleReset = () => {
    if (!confirm("Reset every field to enabled? This affects the wizard for all submitters.")) return
    resetFormConfig()
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

  // Compute counts for the header summary
  const totalToggleable = FIELD_REGISTRY.filter((f) => !f.locked).length
  const totalEnabled = FIELD_REGISTRY.filter(
    (f) => f.locked || config.enabled[f.fieldKey] !== false,
  ).length
  const totalDisabled = FIELD_REGISTRY.length - totalEnabled

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
            {FIELD_REGISTRY.length - totalToggleable} locked (system / compliance)
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {formPhases.map((phase) => {
          const phaseFields = FIELD_REGISTRY.filter((f) => f.phase === phase.phase)
          if (phaseFields.length === 0) return null

          const enabledInPhase = phaseFields.filter(
            (f) => f.locked || config.enabled[f.fieldKey] !== false,
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
                  const enabled = field.locked || config.enabled[field.fieldKey] !== false
                  return (
                    <div
                      key={field.fieldKey}
                      className={`rounded-lg border p-3 transition-colors ${
                        field.locked
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
                            {!field.locked && !enabled && (
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
                        </div>
                        <div className="flex-shrink-0 pt-1">
                          <Switch
                            checked={enabled}
                            disabled={field.locked}
                            onCheckedChange={(next) => handleToggle(field, next)}
                            aria-label={`${field.label} — ${enabled ? "on" : "off"}`}
                          />
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
