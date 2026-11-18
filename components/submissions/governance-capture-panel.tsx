"use client"

// Reviewer-side "complete the use case" capture (issue #161) — the vetting
// stage's place to complete the OMB 34-field inventory, the M-25-21
// minimum-practice block, and the RMF inputs that issue #160 gated out of
// idea intake (lib/submissionReadiness.ts's `governanceMissing`). Mirrors
// lib/rmfProfileReview.ts's propose-then-confirm UX: Scout drafts a proposed
// value + rationale for each applicable field
// (app/actions.ts's `draftGovernanceFields`), the reviewer edits inline, and
// Save records which fields were confirmed as-drafted vs. overridden
// (lib/governanceCapture.ts's `buildGovernanceCapturePatch`).
//
// Field visibility here reuses the exact same `showWhen` gating the wizard
// uses (`isFieldVisible`), recomputed against the reviewer's in-progress
// edits (not just the saved submission) so, e.g., setting Stage of
// Development to "Deployed" immediately reveals the ATO/vendor/training-data
// fields without a save round-trip first.

import { useEffect, useRef, useState } from "react"
import type { FormData } from "@/lib/steps"
import type { Submission } from "@/lib/submissions"
import { patchSubmissionFormData } from "@/lib/submissions"
import { FIELD_REGISTRY_BY_KEY } from "@/lib/fieldRegistry"
import { isFieldVisible } from "@/lib/formConfig"
import { formatKeystoneDate } from "@/lib/dateFormat"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import { reviewerDecidesEnabled } from "@/lib/reviewerDecision"
import {
  GOVERNANCE_FIELD_KEYS,
  getGovernanceCaptureReview,
  buildGovernanceCapturePatch,
  buildReviewerChosenPatch,
  countEmptyGovernanceFields,
  governanceCaptureCounts,
  governanceFieldValueLabel,
  type GovernanceFieldDraft,
  type GovernanceFieldValue,
} from "@/lib/governanceCapture"
import { draftGovernanceFields } from "@/app/actions"
import {
  YES_NO_OPTIONS,
  STAGE_OF_DEVELOPMENT_OPTIONS,
  HIGH_IMPACT_OPTIONS,
  TOPIC_AREA_OPTIONS,
  AI_CLASSIFICATION_OPTIONS,
  HAS_ATO_OPTIONS,
  SYSTEM_SOURCE_OPTIONS,
  DEMOGRAPHIC_FEATURE_OPTIONS,
  MIN_PRACTICE_STATUS_OPTIONS,
  INDEPENDENT_REVIEW_OPTIONS,
  FAILSAFE_OPTIONS,
  APPEAL_OPTIONS,
  PUBLIC_CONSULTATION_OPTIONS,
  type FieldOption,
} from "@/lib/governanceFieldOptions"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Toggle } from "@/components/ui/toggle"
import { Button } from "@/components/ui/button"
import { StatusPill } from "@/components/ui/status-pill"
import { PlumbMark } from "@/components/branding/plumb-mark"
import { Check, ShieldCheck } from "lucide-react"

type FieldKind = "text" | "textarea" | "date" | "select" | "radio" | "multiselect"

// Structural section key, not a heading. The heading itself is the tenant's
// vocabulary (`inventoryLabel` / `minimumPracticesLabel`) — this panel is the
// vetting-side surface that carries the two-stage lifecycle story, and its
// headers named the wrong authority on a tenant that doesn't report to OMB.
type CaptureSection = "inventory" | "minimum_practices"

type CaptureFieldSpec = {
  key: keyof FormData
  kind: FieldKind
  options?: FieldOption[]
  section: CaptureSection
}

/** Display heading for a section, for one tenant. */
function sectionHeading(section: CaptureSection, tenant: TenantConfig): string {
  return section === "inventory" ? tenant.inventoryLabel : tenant.minimumPracticesLabel
}

// Order matches lib/submissionReadiness.ts's GOVERNANCE_FIELD_KEYS.
const CAPTURE_FIELD_SPECS: CaptureFieldSpec[] = [
  { key: "stageOfDevelopment", kind: "select", options: STAGE_OF_DEVELOPMENT_OPTIONS, section: "inventory" },
  { key: "highImpact", kind: "radio", options: HIGH_IMPACT_OPTIONS, section: "inventory" },
  { key: "highImpactJustification", kind: "textarea", section: "inventory" },
  { key: "topicArea", kind: "select", options: TOPIC_AREA_OPTIONS, section: "inventory" },
  { key: "aiClassification", kind: "select", options: AI_CLASSIFICATION_OPTIONS, section: "inventory" },
  { key: "disseminatesToPublic", kind: "radio", options: YES_NO_OPTIONS, section: "inventory" },
  { key: "scalable", kind: "radio", options: YES_NO_OPTIONS, section: "inventory" },
  { key: "hasATO", kind: "radio", options: HAS_ATO_OPTIONS, section: "inventory" },
  { key: "atoSystemName", kind: "text", section: "inventory" },
  { key: "systemSource", kind: "select", options: SYSTEM_SOURCE_OPTIONS, section: "inventory" },
  { key: "systemSourceVendorName", kind: "text", section: "inventory" },
  { key: "operationalDate", kind: "date", section: "inventory" },
  { key: "trainingDataDescription", kind: "textarea", section: "inventory" },
  { key: "hasPii", kind: "radio", options: YES_NO_OPTIONS, section: "inventory" },
  { key: "demographicFeatures", kind: "multiselect", options: DEMOGRAPHIC_FEATURE_OPTIONS, section: "inventory" },
  { key: "customCode", kind: "radio", options: YES_NO_OPTIONS, section: "inventory" },
  { key: "preDeploymentTesting", kind: "radio", options: MIN_PRACTICE_STATUS_OPTIONS, section: "minimum_practices" },
  { key: "aiImpactAssessmentCompleted", kind: "radio", options: MIN_PRACTICE_STATUS_OPTIONS, section: "minimum_practices" },
  { key: "aiImpactAssessment", kind: "textarea", section: "minimum_practices" },
  { key: "independentReviewConducted", kind: "radio", options: INDEPENDENT_REVIEW_OPTIONS, section: "minimum_practices" },
  { key: "ongoingMonitoringPlan", kind: "radio", options: MIN_PRACTICE_STATUS_OPTIONS, section: "minimum_practices" },
  { key: "operatorTrainingEstablished", kind: "radio", options: MIN_PRACTICE_STATUS_OPTIONS, section: "minimum_practices" },
  { key: "failSafeMechanism", kind: "radio", options: FAILSAFE_OPTIONS, section: "minimum_practices" },
  { key: "humanOversightAppeal", kind: "radio", options: APPEAL_OPTIONS, section: "minimum_practices" },
  { key: "publicConsultationSteps", kind: "multiselect", options: PUBLIC_CONSULTATION_OPTIONS, section: "minimum_practices" },
]
const CAPTURE_FIELD_SPECS_BY_KEY: Record<string, CaptureFieldSpec> = Object.fromEntries(
  CAPTURE_FIELD_SPECS.map((s) => [s.key as string, s]),
)

function emptyValueFor(kind: FieldKind): GovernanceFieldValue {
  return kind === "multiselect" ? [] : ""
}

function toggleArrayValue(current: GovernanceFieldValue, item: string): string[] {
  const arr = Array.isArray(current) ? current : []
  return arr.includes(item) ? arr.filter((v) => v !== item) : [...arr, item]
}

export function GovernanceCapturePanel({
  submission,
  assistantName,
  byName,
  byEmail,
  busy,
  setBusy,
  onSaved,
  initialDraft,
  saveRef,
}: {
  submission: Submission
  assistantName: string
  byName: string
  byEmail: string
  busy: boolean
  setBusy: (b: boolean) => void
  onSaved: () => Promise<void>
  /**
   * The page's draft for this open (FIX-2, #338), so the panel does not ask
   * again. A draft: used as is. `null`: the page is still drafting, so wait for
   * it. `undefined`: the page did not draft (decided record), so draft here.
   */
  initialDraft?: GovernanceFieldDraft | null
  /**
   * F7-3 (#346): lets the step screen's "Save and go to step N" save what the
   * reviewer chose here. Holds the save while something is chosen, null otherwise.
   */
  saveRef?: { current: (() => Promise<void>) | null }
}) {
  const tenant = getTenant()
  const copy = tenantCopy(tenant)
  const fd = submission.formData
  const review = getGovernanceCaptureReview(submission)
  // F7-2 (#345): where the reviewer decides, the draft is only a suggestion
  // beside each field, and Save writes only what the reviewer set or accepted.
  const decides = reviewerDecidesEnabled(tenant)

  const [draft, setDraft] = useState<GovernanceFieldDraft | null>(null)
  const [drafting, setDrafting] = useState(false)
  const [values, setValues] = useState<Partial<Record<string, GovernanceFieldValue>>>(() => {
    if (!decides) return {}
    // Saved values show at once, without waiting for a draft.
    const saved: Partial<Record<string, GovernanceFieldValue>> = {}
    for (const key of GOVERNANCE_FIELD_KEYS) {
      const existing = fd[key] as GovernanceFieldValue | undefined
      if (Array.isArray(existing) ? existing.length > 0 : !!existing) saved[key as string] = existing
    }
    return saved
  })
  // Fields the reviewer set or pressed "Use" on in this session.
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const ranRef = useRef(false)

  const seedValues = (d: GovernanceFieldDraft) => {
    setValues((prev) => {
      const next = { ...prev }
      for (const key of GOVERNANCE_FIELD_KEYS) {
        if (next[key] !== undefined) continue
        const existing = fd[key] as GovernanceFieldValue | undefined
        const hasExisting = Array.isArray(existing) ? existing.length > 0 : !!existing
        const kind = CAPTURE_FIELD_SPECS_BY_KEY[key as string]?.kind || "text"
        next[key] = hasExisting ? (existing as GovernanceFieldValue) : d[key]?.value ?? emptyValueFor(kind)
      }
      return next
    })
  }

  const runDraft = async () => {
    setDrafting(true)
    try {
      const d = await draftGovernanceFields(fd)
      setDraft(d)
      if (!decides) seedValues(d)
    } catch (e) {
      // A failed draft leaves the panel usable with no suggestions.
      if (!decides) throw e
      setDraft({})
    } finally {
      setDrafting(false)
    }
  }

  // One draft request per open: use the page's draft when it has one (or is
  // about to), and only ask here when the page did not.
  useEffect(() => {
    if (decides) {
      // The panel does not wait for the draft: it takes it when it arrives.
      if (initialDraft) setDraft(initialDraft)
      else if (initialDraft === undefined && !ranRef.current) {
        ranRef.current = true
        runDraft()
      }
      return
    }
    if (ranRef.current) return
    if (initialDraft === null) return
    ranRef.current = true
    if (initialDraft) {
      setDraft(initialDraft)
      seedValues(initialDraft)
    } else {
      runDraft()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submission.id, initialDraft])

  const mergedFd: FormData = { ...fd, ...(values as Partial<FormData>) }
  // highImpact is answered on its own step where the reviewer decides.
  const applicable = GOVERNANCE_FIELD_KEYS.filter((k) => isFieldVisible(k, mergedFd) && !(decides && k === "highImpact"))

  const setValue = (key: keyof FormData, v: GovernanceFieldValue) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    if (decides) setChosen((prev) => new Set(prev).add(key as string))
  }

  const emptyCount = countEmptyGovernanceFields(mergedFd)

  const saveChosen = async () => {
    setBusy(true)
    try {
      const picked: Partial<Record<string, GovernanceFieldValue>> = {}
      for (const key of applicable) {
        const v = values[key as string]
        const filled = Array.isArray(v) ? v.length > 0 : !!v
        if (chosen.has(key as string) && filled) picked[key as string] = v
      }
      await patchSubmissionFormData(
        submission.id,
        buildReviewerChosenPatch(draft ?? {}, picked, review, { byName, byEmail, at: new Date().toISOString() }),
      )
      setChosen(new Set())
      await onSaved()
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!saveRef) return
    saveRef.current = decides && chosen.size > 0 ? saveChosen : null
    return () => {
      saveRef.current = null
    }
  })

  const save = async () => {
    if (decides) return saveChosen()
    if (!draft) return
    setBusy(true)
    const finalValues: Partial<Record<string, GovernanceFieldValue>> = {}
    for (const key of applicable) {
      finalValues[key as string] = values[key as string] ?? emptyValueFor(CAPTURE_FIELD_SPECS_BY_KEY[key as string]?.kind || "text")
    }
    await patchSubmissionFormData(
      submission.id,
      buildGovernanceCapturePatch(draft, finalValues, { byName, byEmail, at: new Date().toISOString() }),
    )
    await onSaved()
    setBusy(false)
  }

  const { draftedByPlumb: confirmedCount, confirmedByReviewer: overriddenCount } = governanceCaptureCounts(review)

  const bySection = new Map<CaptureSection, CaptureFieldSpec[]>()
  for (const key of applicable) {
    const spec = CAPTURE_FIELD_SPECS_BY_KEY[key as string]
    if (!spec) continue
    const list = bySection.get(spec.section) || []
    list.push(spec)
    bySection.set(spec.section, list)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {assistantName} drafts each field from the idea&apos;s problem, solution, expected benefits, and
          constraints — edit any value to override it.
        </p>
        <Button size="sm" variant="outline" disabled={busy || drafting} onClick={runDraft}>
          <PlumbMark className="w-3.5 h-3.5 mr-1.5" />
          {drafting ? "Drafting…" : draft ? `Redraft with ${assistantName}` : `Draft with ${assistantName}`}
        </Button>
      </div>

      {review && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          Last saved by {review.byName} on {formatKeystoneDate(review.at)} — {confirmedCount} confirmed as
          drafted, {overriddenCount} overridden.
        </p>
      )}

      {Array.from(bySection.entries()).map(([section, specs]) => (
        <div key={section} className="space-y-4 border-t pt-4 first:border-t-0 first:pt-0">
          <h4 className="text-sm font-semibold text-uspto-gray-text">{sectionHeading(section, tenant)}</h4>
          {specs.map((spec) => {
            const def = FIELD_REGISTRY_BY_KEY[spec.key as string]
            const label = def?.label || (spec.key as string)
            const value = values[spec.key as string] ?? emptyValueFor(spec.kind)
            const proposal = draft?.[spec.key as string]
            const isOverride = !decides && proposal !== undefined && JSON.stringify(proposal.value) !== JSON.stringify(value)
            return (
              <div key={spec.key as string} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`gov-${spec.key}`}>{label}</Label>
                  {proposal && !decides && (
                    <StatusPill status={isOverride ? "attention" : "neutral"}>
                      {isOverride ? "overridden" : `${assistantName} proposed`}
                    </StatusPill>
                  )}
                </div>

                {spec.kind === "text" && (
                  <Input
                    id={`gov-${spec.key}`}
                    value={(value as string) || ""}
                    onChange={(e) => setValue(spec.key, e.target.value)}
                  />
                )}
                {spec.kind === "date" && (
                  <Input
                    id={`gov-${spec.key}`}
                    type="date"
                    value={(value as string) || ""}
                    onChange={(e) => setValue(spec.key, e.target.value)}
                  />
                )}
                {spec.kind === "textarea" && (
                  <Textarea
                    id={`gov-${spec.key}`}
                    value={(value as string) || ""}
                    onChange={(e) => setValue(spec.key, e.target.value)}
                    rows={3}
                  />
                )}
                {spec.kind === "select" && (
                  <Select value={(value as string) || ""} onValueChange={(v) => setValue(spec.key, v)}>
                    <SelectTrigger id={`gov-${spec.key}`}>
                      <SelectValue placeholder="Select…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(spec.options || []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {spec.kind === "radio" && (
                  <RadioGroup
                    value={(value as string) || ""}
                    onValueChange={(v) => setValue(spec.key, v)}
                    className="flex flex-col gap-2"
                  >
                    {(spec.options || []).map((o) => (
                      <div key={o.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={o.value} id={`gov-${spec.key}-${o.value}`} />
                        <Label htmlFor={`gov-${spec.key}-${o.value}`}>{o.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
                {spec.kind === "multiselect" && (
                  <div className="flex flex-wrap gap-2">
                    {(spec.options || []).map((o) => (
                      <Toggle
                        key={o.value}
                        pressed={Array.isArray(value) && value.includes(o.value)}
                        onPressedChange={() => setValue(spec.key, toggleArrayValue(value, o.value))}
                        variant="outline"
                        className="rounded-full px-3 py-1 text-sm h-auto"
                      >
                        {o.label}
                      </Toggle>
                    ))}
                  </div>
                )}

                {proposal && decides && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {copy.fieldsSuggests} {governanceFieldValueLabel(spec.key as string, proposal.value)} — {proposal.rationale}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy || JSON.stringify(proposal.value) === JSON.stringify(value)}
                      onClick={() => setValue(spec.key, proposal.value)}
                    >
                      {copy.fieldsUse}
                    </Button>
                  </div>
                )}
                {proposal && !decides && (
                  <p className="text-xs text-muted-foreground">
                    {assistantName} proposes: {governanceFieldValueLabel(spec.key as string, proposal.value)} — {proposal.rationale}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="pt-2 border-t">
        {decides && (
          <p className="mb-2 text-xs text-muted-foreground">{copy.fieldsLeftEmpty.replace("{count}", String(emptyCount))}</p>
        )}
        <Button size="sm" disabled={busy || (decides ? false : drafting || !draft)} onClick={save}>
          <Check className="w-3.5 h-3.5 mr-1.5" />
          Save governance fields
        </Button>
      </div>
    </div>
  )
}
