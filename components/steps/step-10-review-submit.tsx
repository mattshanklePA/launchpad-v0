"use client"
import { useState } from "react"
import { useForm } from "@/context/form-context"
import { getFormSteps, getSubmitterRoleLabels, type FormData } from "@/lib/steps"
import { saveSubmission } from "@/lib/submissions"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Textarea } from "@/components/ui/textarea"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { StatusPill } from "@/components/ui/status-pill"
import { ShieldCheck, Loader2, Check, AlertCircle, ChevronRight } from "lucide-react"
import { assessReadiness } from "@/app/actions"
import { ReadinessResult } from "@/components/steps/readiness-result"
import { getSubmissionReadiness } from "@/lib/submissionReadiness"
import { readinessVerdictSentence } from "@/lib/readinessPresentation"
import { isFieldVisible, getFormConfig } from "@/lib/formConfig"
import { getTenant, type TenantConfig } from "@/lib/tenant"
import { Field, StepCard, StepFooterShell, pillToggleClass } from "@/components/steps/step-frame"
import { STATUS_BORDER_L_CLASS, type KeystoneStatus } from "@/lib/statusTokens"
import { hasFieldContent, NO_REQUIRED_FIELDS_STEPS } from "@/lib/wizardRecap"

// "Export to Rally" only applies to tenants with a Rally integration
// (`TenantConfig.features.rallyExport` — on for USPTO, off for DoW/DoC).
const ALL_ROUTE_OPTIONS = [
  { value: "rally", label: "Export to Rally" },
  { value: "governance", label: "Submit for Governance Vetting" },
  { value: "draft", label: "Save as Draft (continue later)" },
]

// Explicit per-step field map for the review recap. Replaces an older
// crude "filter formData keys by first word of step name" that silently
// dropped entire steps (e.g. Step 2's fields don't contain the word "idea").
//
// Issue #162 slimmed the idea intake wizard to 5 steps (2-6 below, ahead of
// Submitter Info) — Strategic Alignment, Feasibility & Security (OMB/M-25-21),
// and Success Metrics are no longer collected here, so they have no card.
// Those fields stay in FormData and get filled in during vetting instead.
//
// Takes the tenant because the org-unit rows are the tenant's own tier
// vocabulary, not fixed wizard copy — Step 1's `tierLabels.unit` and Step 2's
// `Affected ${tierLabels.unitPlural}` (ES2-11; the latter was hardcoded to
// USPTO's "Affected Business Units"). See docs/ARCHITECTURE.md. Everything
// else here is wording that reads the same for every org.
const STEP_FIELDS = (tenant: TenantConfig): Record<number, Array<{ label: string; key: keyof FormData }>> => ({
  1: [
    { label: "Name", key: "submitterName" },
    { label: "Email", key: "submitterEmail" },
    { label: "Role", key: "submitterRole" },
    { label: tenant.tierLabels.unit, key: "submitterOffice" },
    { label: "Client Sponsor Name", key: "sponsorName" },
    { label: "Client Sponsor Role", key: "sponsorRole" },
    { label: "Client Sponsor Email", key: "sponsorEmail" },
  ],
  // Step 2: Business Problem & Opportunity
  2: [
    { label: "Core Problem", key: "coreProblem" },
    { label: "Problem Impact", key: "problemImpact" },
    { label: `Affected ${tenant.tierLabels.unitPlural}`, key: "affectedBusinessUnits" },
    { label: "Problem Type Tags", key: "problemType" },
    { label: "Target Audience", key: "targetAudience" },
    { label: "Users Impacted", key: "impactedUsersCount" },
    { label: "Pain Points", key: "painPoints" },
    { label: "User Profile / Context", key: "targetUserContext" },
    { label: "Refined Problem & Users Summary", key: "problemDefinition" },
  ],
  // Step 3: merged Proposed Solution & Expected Benefits
  3: [
    { label: "Proposed Solution", key: "proposedSolution" },
    { label: "Key Functionality", key: "keyFunctionality" },
    { label: "Refined Solution Summary", key: "solutionSummary" },
    { label: "Internal or External?", key: "deliveryAudience" },
    { label: "Expected User Benefit", key: "userValue" },
    { label: "Other Improvements", key: "otherUserImprovements" },
    { label: "Expected Business Benefit", key: "businessValue" },
    { label: "Strategic Benefits", key: "strategicBenefit" },
  ],
  // Step 4: Technical Constraints
  4: [
    { label: "Technical Constraints / Dependencies", key: "dependencies" },
  ],
  // Step 5: Idea Overview
  5: [
    { label: "Idea Title", key: "useCaseTitle" },
    { label: "Idea Description", key: "useCaseDescription" },
    { label: "Withhold from Public Reporting?", key: "isWithheld" },
  ],
})

function recapStatus(
  step: number,
  formData: FormData,
  missingCountForStep: number,
  fields: Array<{ label: string; key: keyof FormData }>,
): { label: string; status: KeystoneStatus } {
  const anyContent = fields.some(({ key }) => hasFieldContent(formData[key]))
  if (NO_REQUIRED_FIELDS_STEPS.has(step)) {
    // Nothing here is required, so a blank optional step is not a gap — it
    // reads "Optional" (issue #218), not "Not started" under a warning icon.
    return anyContent ? { label: "Noted", status: "healthy" } : { label: "Optional", status: "neutral" }
  }
  if (missingCountForStep === 0) return { label: "Complete", status: "healthy" }
  if (!anyContent) return { label: "Not started", status: "attention" }
  return { label: `${missingCountForStep} answer${missingCountForStep === 1 ? "" : "s"} short`, status: "attention" }
}

export function Step10ReviewSubmit() {
  const { formData, setCurrentStep, setFormData } = useForm()
  const [isAssessing, setIsAssessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const tenant = getTenant()
  const routeOptions = ALL_ROUTE_OPTIONS.filter((o) => o.value !== "rally" || tenant.features.rallyExport)
  const readiness = getSubmissionReadiness(formData)
  const passedChecks = readiness.totalChecks - readiness.missing.length

  const handleRouteToggle = (item: string) => {
    const currentItems = formData.routeTo || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, routeTo: newItems }))
  }

  const handleSubmitForVetting = async () => {
    setIsSubmitting(true)
    try {
      // Persist to Supabase via the API. Every visitor will see this on
      // their next page load (or on refetch).
      await saveSubmission({ ...formData, intakeMode: "form" })
      toast({
        title: "Submitted for vetting",
        description: "Your idea has been saved and routed for review.",
      })
      // Brief delay so the toast registers before the page transitions
      setTimeout(() => {
        setCurrentStep(7)
      }, 400)
    } catch (error) {
      console.error("Submission failed:", error)
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: "Something went wrong. Please try again.",
      })
      setIsSubmitting(false)
    }
  }

  // The draft already autosaves continuously (context/form-context.tsx
  // persists to localStorage on every change) — this button just confirms
  // that to the submitter and sends them back rather than through Submit.
  const handleSaveDraft = () => {
    toast({ title: "Draft saved", description: "Pick up where you left off any time from this browser." })
  }

  const handleAssessReadiness = async () => {
    setIsAssessing(true)
    try {
      const result = await assessReadiness(formData, getFormConfig().enabled)
      setFormData((prev) => ({
        ...prev,
        readinessScore: result.readinessScore,
        readinessSummary: result.readinessSummary,
        executiveSummary: result.executiveSummary,
        readinessFindings: result.findings,
      }))
    } catch (error) {
      console.error("Error assessing readiness:", error)
    } finally {
      setIsAssessing(false)
    }
  }

  // Human-readable labels for enum fields. Same map as decision-center /
  // comparison-view — keep in lockstep with the Select options across the
  // wizard steps and the vetting-side governance capture surface.
  const ENUM_LABELS: Record<string, string> = {
    lt_10: "<10 users",
    "10_50": "10–50 users",
    "50_500": "50–500 users",
    gt_500: "500+ users",
    lt_1: "<1 hr/week",
    "1_5": "1–5 hrs/week",
    "5_10": "5–10 hrs/week",
    gt_10: "10+ hrs/week",
    lt_50k: "<$50K",
    "50k_250k": "$50K–$250K",
    "250k_1m": "$250K–$1M",
    gt_1m: "$1M+",
    low: "Low",
    medium: "Medium",
    high: "High",
    lt_3: "<3 months",
    "3_6": "3–6 months",
    "6_12": "6–12 months",
    gt_12: "12+ months",
    yes: "Yes",
    no: "No",
    internal: "Internal",
    external: "External",
    controlled: "Controlled",
    yes_risk_to_disclosure: "Yes - risk to disclosure (FOIA-protected interest)",
    yes_disclosure_prohibited: "Yes - disclosure prohibited by law",
    american_built: "American-built",
    open_source_us: "Open-source (U.S.)",
    foreign: "Foreign-built",
    unknown: "Unknown / TBD",
    ai_ready: "AI-ready data exists",
    partial: "Partial — needs labeling/cleanup",
    needs_build: "Must be built / relabeled",
    "1": "TRL 1", "2": "TRL 2", "3": "TRL 3", "4": "TRL 4", "5": "TRL 5", "6": "TRL 6", "7": "TRL 7", "8": "TRL 8", "9": "TRL 9",
    other: "Other",
    // Tenant-driven dropdown options (issue #147) — submitter role, affected
    // system, target audience, data classification, and org taxonomy
    // (bureau/command) all resolve their labels from the active tenant
    // instead of a static USPTO/DoW-shaped list, so the recap shows the
    // right label instead of a raw value like "bea" or "forscom" on tenants
    // whose codes aren't in the static list above.
    ...getSubmitterRoleLabels(),
    ...Object.fromEntries(tenant.affectedSystems.map((o) => [o.value, o.label])),
    ...Object.fromEntries(tenant.targetAudiences.map((o) => [o.value, o.label])),
    ...Object.fromEntries(tenant.dataClassifications.map((o) => [o.value, o.label])),
    ...Object.fromEntries(tenant.unit.options.map((o) => [o.value, o.label])),
  }
  const prettify = (s: string) => ENUM_LABELS[s] || s

  const renderValue = (value: any) => {
    if (Array.isArray(value)) {
      return value.length > 0
        ? value.map(prettify).join(", ")
        : <span className="text-muted-foreground">Not provided</span>
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No"
    }
    return value ? prettify(value) : <span className="text-muted-foreground">Not provided</span>
  }

  // Deterministic gate findings — grouped by whether the step has any
  // content yet, same source (`getSubmissionReadiness`) the wizard footer's
  // "still needed" hint and the old SubmissionGate card used.
  const deterministicMissing = readiness.missing.filter((m) => m.step >= 1 && m.step <= 6)

  const verdictStatus: KeystoneStatus | null =
    formData.readinessScore === "ready"
      ? "healthy"
      : formData.readinessScore === "needs_work"
        ? "attention"
        : formData.readinessScore === "early_stage"
          ? "alert"
          : null
  const verdictLabel =
    formData.readinessScore === "ready"
      ? "Ready"
      : formData.readinessScore === "needs_work"
        ? "Needs work"
        : formData.readinessScore === "early_stage"
          ? "Early stage"
          : null

  const showSubmitNowHint = readiness.canSubmit && formData.readinessScore === "needs_work"

  // "Close the items below, then submit." names the deterministic gate's own
  // bullet list — showing it once that list is empty falsely implies
  // something is still blocking submission (issue #218). Plumb's quality
  // read can still say "needs_work" (it grades quality, not completeness),
  // so once nothing required is missing the heading and its suggestion count
  // read as advisory instead of blocking.
  const gateClear = deterministicMissing.length === 0
  const suggestionCount = (formData.readinessFindings || []).length
  const verdictHeading =
    formData.readinessScore === "needs_work" && gateClear
      ? "Nothing is blocking submission."
      : readinessVerdictSentence(formData.readinessScore)

  return (
    <>
      <StepCard className={`border-l-[3px] ${STATUS_BORDER_L_CLASS[verdictStatus || "attention"]}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
              Vetting readiness
            </span>
            {verdictStatus && verdictLabel && <StatusPill status={verdictStatus}>{verdictLabel}</StatusPill>}
          </div>
          {formData.readinessScore ? (
            <Button variant="link" size="sm" className="h-auto p-0" onClick={handleAssessReadiness} disabled={isAssessing}>
              {isAssessing ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              Re-assess
            </Button>
          ) : (
            <Button size="sm" onClick={handleAssessReadiness} disabled={isAssessing}>
              {isAssessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Evaluating…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" /> Assess
                </>
              )}
            </Button>
          )}
        </div>

        {formData.readinessScore && (
          <>
            <p className="ks-section-head text-foreground">{verdictHeading}</p>
            {formData.readinessScore === "needs_work" && gateClear && (
              <p className="text-[13px] text-muted-foreground">
                {tenant.assistantName} has {suggestionCount} suggestion{suggestionCount === 1 ? "" : "s"}. You can act
                on {suggestionCount === 1 ? "it" : "them"} or submit as-is.
              </p>
            )}
          </>
        )}

        <p className="text-[13px] text-muted-foreground">
          {passedChecks} of {readiness.totalChecks} required fields complete
        </p>

        {deterministicMissing.length > 0 && (
          <ul className="space-y-2">
            {deterministicMissing.map((item, i) => (
              <li key={`${item.step}-${item.field}-${i}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                <span
                  className="mt-[7px] h-[5px] w-[5px] flex-shrink-0 self-start rounded-full bg-attention"
                  aria-hidden="true"
                />
                <span>{item.message}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-foreground-faint">required</span>
                {item.step >= 1 && item.step <= 5 && (
                  <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setCurrentStep(item.step)}>
                    Fix in step {item.step}: {item.stepName}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {formData.readinessScore ? (
          <ReadinessResult
            readinessScore={formData.readinessScore}
            readinessSummary={formData.readinessSummary}
            readinessFindings={formData.readinessFindings}
            executiveSummary={formData.executiveSummary}
            submitterOffice={formData.submitterOffice}
            isAssessing={isAssessing}
            onJumpToStep={(s) => setCurrentStep(s)}
            onReassess={handleAssessReadiness}
            chrome={false}
          />
        ) : deterministicMissing.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing is blocking this — assess it for a quality read too.</p>
        ) : null}
      </StepCard>

      <div className="flex flex-col gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Everything you entered</p>
        <div className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-card">
          {getFormSteps(formData.submitterOffice)
            .slice(0, 5)
            .map((step) => {
              const fields = (STEP_FIELDS(tenant)[step.step] || []).filter(({ key }) => isFieldVisible(key, formData))
              if (fields.length === 0) return null
              const missingCountForStep = readiness.missing.filter((m) => m.step === step.step).length
              const { label, status } = recapStatus(step.step, formData, missingCountForStep, fields)
              return (
                <Collapsible key={step.step}>
                  <div className="flex items-center gap-3.5 px-[18px] py-3.5">
                    {status === "healthy" ? (
                      <Check className="h-3.5 w-3.5 flex-shrink-0 text-healthy" strokeWidth={2.4} />
                    ) : status === "neutral" ? (
                      <span className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 text-attention" strokeWidth={1.9} />
                    )}
                    <span className="min-w-0 flex-1 text-[13.5px] text-foreground">
                      Step {step.step} · {step.name}
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">{label}</span>
                    <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setCurrentStep(step.step)}>
                      Edit
                    </Button>
                    <CollapsibleTrigger asChild>
                      <button type="button" aria-label={`Expand Step ${step.step} details`} className="text-muted-foreground">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <dl className="space-y-2 px-[18px] pb-4 pt-1 text-sm">
                      {fields.map(({ label: fieldLabel, key }) => (
                        <div key={key} className="grid grid-cols-1 gap-1 md:grid-cols-[200px_1fr] md:gap-3">
                          <dt className="font-medium text-muted-foreground">{fieldLabel}</dt>
                          <dd className="whitespace-pre-wrap break-words">{renderValue(formData[key])}</dd>
                        </div>
                      ))}
                    </dl>
                  </CollapsibleContent>
                </Collapsible>
              )
            })}
        </div>
      </div>

      <StepCard>
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Submit for vetting</p>
        <Field label="Route to">
          <div className="flex flex-wrap gap-2">
            {routeOptions.map((option) => (
              <Toggle
                key={option.value}
                pressed={formData.routeTo.includes(option.value)}
                onPressedChange={() => handleRouteToggle(option.value)}
                className={pillToggleClass}
              >
                {option.label}
              </Toggle>
            ))}
          </div>
        </Field>
        <Field label="Anything the vetting team should know?" htmlFor="reviewerNotes">
          <Textarea
            id="reviewerNotes"
            value={formData.reviewerNotes}
            onChange={(e) => setFormData((prev) => ({ ...prev, reviewerNotes: e.target.value }))}
            rows={3}
          />
        </Field>
      </StepCard>

      <StepFooterShell>
        <Button variant="ghost" onClick={handleSaveDraft}>
          Save as draft
        </Button>
        <div className="flex items-center gap-3.5">
          {!readiness.canSubmit ? (
            <span className="text-[12px] text-foreground-faint">
              Complete {readiness.missing.length} {readiness.missing.length === 1 ? "item" : "items"} before submitting
            </span>
          ) : showSubmitNowHint ? (
            <span className="text-[12px] text-foreground-faint">
              You can submit now. Expect a request for the missing answers.
            </span>
          ) : null}
          <Button size="lg" variant="secondary" onClick={handleSubmitForVetting} disabled={isSubmitting || !readiness.canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
              </>
            ) : (
              "Submit for Vetting"
            )}
          </Button>
        </div>
      </StepFooterShell>
    </>
  )
}
