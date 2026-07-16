"use client"
import { useState } from "react"
import { useForm } from "@/context/form-context"
import { getFormSteps, SUBMITTER_ROLE_LABELS, type FormData } from "@/lib/steps"
import { saveSubmission } from "@/lib/submissions"
import { useToast } from "@/components/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "../ui/label"
import { Toggle } from "../ui/toggle"
import { Textarea } from "../ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ShieldCheck, Loader2, ChevronDown, CheckCircle, AlertTriangle, AlertCircle, Send } from "lucide-react"
import { assessReadiness } from "@/app/actions"
import { SubmissionGate } from "@/components/steps/submission-gate"
import { isFieldVisible, getFormConfig } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"

const routeOptions = [
  { value: "rally", label: "Export to Rally" },
  { value: "governance", label: "Submit for Governance Vetting" },
  { value: "draft", label: "Save as Draft (continue later)" },
]

// Explicit per-step field map for the review cards. Replaces an older
// crude "filter formData keys by first word of step name" that silently
// dropped entire steps (e.g. Step 2's fields don't contain the word "idea").
const STEP_FIELDS: Record<number, Array<{ label: string; key: keyof FormData }>> = {
  1: [
    { label: "Name", key: "submitterName" },
    { label: "Email", key: "submitterEmail" },
    { label: "Role", key: "submitterRole" },
    { label: "Business Unit", key: "submitterOffice" },
  ],
  2: [
    { label: "Idea Title", key: "useCaseTitle" },
    { label: "Idea Description", key: "useCaseDescription" },
    { label: "Withhold from Public Reporting?", key: "isWithheld" },
  ],
  // Step 3: merged Problem & Target Users
  3: [
    { label: "Core Problem", key: "coreProblem" },
    { label: "Problem Impact", key: "problemImpact" },
    { label: "Affected System", key: "affectedSystem" },
    { label: "Problem Type Tags", key: "problemType" },
    { label: "Severity", key: "severity" },
    { label: "Target Audience", key: "targetAudience" },
    { label: "Users Impacted", key: "impactedUsersCount" },
    { label: "Pain Points", key: "painPoints" },
    { label: "User Profile / Context", key: "targetUserContext" },
    { label: "Refined Problem & Users Summary", key: "problemDefinition" },
  ],
  4: [
    { label: "Proposed Solution", key: "proposedSolution" },
    { label: "Key Functionality", key: "keyFunctionality" },
    { label: "Refined Summary", key: "solutionSummary" },
  ],
  // Step 5: merged Value (user + business)
  5: [
    { label: "User Value", key: "userValue" },
    { label: "Time Savings Range", key: "userTimeSavings" },
    { label: "Other Improvements", key: "otherUserImprovements" },
    { label: "Refined User Value Summary", key: "userValueSummary" },
    { label: "Business Value", key: "businessValue" },
    { label: "Cost Savings Range", key: "costSavings" },
    { label: "Strategic Benefits", key: "strategicBenefit" },
    { label: "Refined Business Value Summary", key: "businessValueSummary" },
  ],
  6: [
    { label: "Strategic focus areas", key: "usptoFocusArea" },
    { label: "Relevant OKRs / Alignment", key: "relevantOkrs" },
    { label: "Refined Summary", key: "alignmentSummary" },
  ],
  7: [
    { label: "Implementation Complexity", key: "implementationComplexity" },
    { label: "Resources Needed", key: "resourcesNeeded" },
    { label: "Dependencies / Feasibility", key: "dependencies" },
    { label: "Involves PII / Sensitive Data", key: "involvesSensitiveData" },
    { label: "Security Classification", key: "securityClassification" },
    { label: "Access Control Requirements", key: "accessControlRequirements" },
    { label: "AI Decisional Impact", key: "aiDecisionalImpact" },
    { label: "AI Model Sourcing", key: "aiModelSourcing" },
    { label: "Mandatory Human Review", key: "aiHumanReview" },
    { label: "Data Classification / Impact Level", key: "impactLevel" },
    { label: "Data Readiness", key: "dataReadiness" },
    { label: "Technology Readiness Level", key: "trl" },
    { label: "Refined Summary", key: "feasibilitySummary" },
  ],
  8: [
    { label: "Success Metrics", key: "successMetrics" },
    { label: "Key Metrics Tags", key: "keyMetrics" },
    { label: "Timeline for Results", key: "timelineForResults" },
    { label: "Refined Summary", key: "metricsSummary" },
  ],
}

export function Step10ReviewSubmit() {
  const { formData, setCurrentStep, setFormData } = useForm()
  const [isAssessing, setIsAssessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExecutiveSummary, setShowExecutiveSummary] = useState(false)
  const { toast } = useToast()

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
      await saveSubmission(formData)
      toast({
        title: "Submitted for vetting",
        description: "Your idea has been saved and routed for review.",
      })
      // Brief delay so the toast registers before the page transitions
      setTimeout(() => {
        setCurrentStep(10)
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

  const handleAssessReadiness = async () => {
    setIsAssessing(true)
    try {
      const result = await assessReadiness(formData, getFormConfig().enabled)
      setFormData((prev) => ({
        ...prev,
        readinessScore: result.readinessScore,
        readinessSummary: result.readinessSummary,
        executiveSummary: result.executiveSummary,
      }))
    } catch (error) {
      console.error("Error assessing readiness:", error)
    } finally {
      setIsAssessing(false)
    }
  }

  const getReadinessBadge = () => {
    switch (formData.readinessScore) {
      case "ready":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-300 text-sm px-3 py-1">
            <CheckCircle className="w-4 h-4 mr-1.5" />
            Ready for Review
          </Badge>
        )
      case "needs_work":
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-sm px-3 py-1">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Needs Work
          </Badge>
        )
      case "early_stage":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300 text-sm px-3 py-1">
            <AlertCircle className="w-4 h-4 mr-1.5" />
            Early stage: keep refining
          </Badge>
        )
      default:
        return null
    }
  }

  // Human-readable labels for enum fields. Same map as decision-center /
  // comparison-view — keep in lockstep with the Select options in step-3/5/6/9.
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
    unclassified: "Unclassified / public (IL2)",
    cui: "CUI (IL4)",
    il5: "CUI, higher sensitivity (IL5)",
    il6: "Classified up to Secret (IL6)",
    ai_ready: "AI-ready data exists",
    partial: "Partial — needs labeling/cleanup",
    needs_build: "Must be built / relabeled",
    "1": "TRL 1", "2": "TRL 2", "3": "TRL 3", "4": "TRL 4", "5": "TRL 5", "6": "TRL 6", "7": "TRL 7", "8": "TRL 8", "9": "TRL 9",
    patents: "Patents",
    trademarks: "Trademarks",
    forscom: "Forces Command (FORSCOM)",
    amc: "Army Materiel Command (AMC)",
    tradoc: "Training & Doctrine Command (TRADOC)",
    afc: "Army Futures Command (AFC)",
    medcom: "Army Medical Command (MEDCOM)",
    arcyber: "Army Cyber Command",
    sustainment: "Sustainment / Logistics",
    ocio: "OCIO",
    ocfo: "OCFO",
    ogc: "OGC",
    opia: "OPIA",
    hr: "Human Resources",
    other: "Other",
    ...SUBMITTER_ROLE_LABELS,
    supervisory_examiner: "Supervisory Examiner",
    applicant: "Applicant",
    it_systems: "IT Systems",
    cross_functional: "Cross-Functional",
    // Tenant's own org taxonomy (bureau/command codes), so the Business Unit
    // recap shows the right label instead of a raw value like "bea" or
    // "forscom" on tenants whose codes aren't in the static list above.
    ...Object.fromEntries(getTenant().unit.options.map((o) => [o.value, o.label])),
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Readiness Assessment Section */}
      <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Vetting Readiness Check
          </CardTitle>
          <CardDescription>
            Before submitting, get an AI assessment of whether your idea is ready for leadership review.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!formData.readinessScore ? (
            <Button 
              onClick={handleAssessReadiness} 
              disabled={isAssessing}
              className="w-full sm:w-auto"
            >
              {isAssessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating your idea...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Assess Vetting Readiness
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {getReadinessBadge()}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {formData.readinessSummary}
              </p>
              <Collapsible open={showExecutiveSummary} onOpenChange={setShowExecutiveSummary}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Executive Summary (Preview)
                    <ChevronDown className={`w-4 h-4 transition-transform ${showExecutiveSummary ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="bg-muted/50 rounded-lg p-4 text-sm leading-relaxed border">
                    {formData.executiveSummary}
                  </div>
                </CollapsibleContent>
              </Collapsible>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAssessReadiness}
                disabled={isAssessing}
              >
                {isAssessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Re-evaluating...
                  </>
                ) : (
                  "Re-assess Readiness"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {getFormSteps(formData.submitterOffice).slice(0, 8).map((step) => {
        // Filter STEP_FIELDS to only the fields currently enabled in the
        // admin Form Configuration. If a step has zero enabled fields, hide
        // its review card entirely.
        const fields = (STEP_FIELDS[step.step] || []).filter(({ key }) => isFieldVisible(key, formData))
        if (fields.length === 0) return null
        return (
          <Card key={step.step}>
            <CardHeader className="bg-muted/50 flex-row items-center justify-between py-3 px-4">
              <CardTitle className="text-base">
                Step {step.step}: {step.title}
              </CardTitle>
              <Button variant="link" size="sm" onClick={() => setCurrentStep(step.step)}>
                Edit
              </Button>
            </CardHeader>
            <CardContent className="p-4 text-sm">
              <dl className="space-y-2">
                {fields.map(({ label, key }) => (
                  <div key={key} className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-1 md:gap-3">
                    <dt className="font-medium text-muted-foreground">{label}</dt>
                    <dd className="whitespace-pre-wrap break-words">{renderValue(formData[key])}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        )
      })}
      <Card>
        <CardHeader>
          <CardTitle>Submit for Vetting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Route to</Label>
            <div className="flex flex-wrap gap-2">
              {routeOptions.map((option) => (
                <Toggle
                  key={option.value}
                  pressed={formData.routeTo.includes(option.value)}
                  onPressedChange={() => handleRouteToggle(option.value)}
                  variant="outline"
                  className="rounded-full px-3 py-1 text-sm h-auto"
                >
                  {option.label}
                </Toggle>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reviewerNotes">Anything the vetting team should know?</Label>
            <Textarea
              id="reviewerNotes"
              value={formData.reviewerNotes}
              onChange={(e) => setFormData((prev) => ({ ...prev, reviewerNotes: e.target.value }))}
              rows={3}
            />
          </div>
          <SubmissionGate
            formData={formData}
            onJumpToStep={(s) => setCurrentStep(s)}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmitForVetting}
          />
        </CardContent>
      </Card>
    </div>
  )
}
