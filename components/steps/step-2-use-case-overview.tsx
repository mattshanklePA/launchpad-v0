"use client"
import { useEffect, useRef, useState } from "react"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Wand2, Loader2, Sparkles } from "lucide-react"
import { useFieldVisibility } from "@/lib/formConfig"
import { suggestIdeaOverview } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"
import { getTenant } from "@/lib/tenant"
import { proposeIsWithheld } from "@/lib/ombAutofill"
import { useAiPropose } from "@/hooks/use-ai-propose"
import { AiProposedHint } from "@/components/launchpad/ai-proposed-hint"
import { Field, StepCard } from "./step-frame"

export function Step2UseCaseOverview() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)
  const { toast } = useToast()
  const tenant = getTenant()
  const [drafting, setDrafting] = useState(false)
  const autoTried = useRef(false)

  // AI-proposed, submitter-confirmed: OMB's four-way "should this be withheld
  // from public reporting?" (field #5) — defaults to "No" unless a security
  // signal already on the form says otherwise (issue #61; four-way values
  // added in issue #116).
  const isWithheldProposal = proposeIsWithheld(formData)
  useAiPropose("isWithheld", formData.isWithheld, setFormData, isWithheldProposal)

  // Scout can synthesize a title + description from everything captured earlier
  // (problem, solution, value, alignment, feasibility, metrics).
  const hasContext =
    Boolean((formData.coreProblem || "").trim()) || Boolean((formData.proposedSolution || "").trim())

  const draft = async (mode: "auto" | "manual") => {
    setDrafting(true)
    try {
      const result = await suggestIdeaOverview(formData)
      if (result.title || result.description) {
        setFormData((prev) => ({
          ...prev,
          useCaseTitle: result.title || prev.useCaseTitle,
          useCaseDescription: result.description || prev.useCaseDescription,
        }))
        if (mode === "manual") {
          toast({
            title: "Draft updated",
            description: result.error || `${tenant.assistantName} re-drafted your title and summary. Edit as needed.`,
          })
        }
      } else if (mode === "manual") {
        toast({
          variant: "destructive",
          title: "Couldn't draft yet",
          description: result.error || "Add more detail on the earlier steps and try again.",
        })
      }
    } catch (error) {
      if (mode === "manual") {
        toast({
          variant: "destructive",
          title: "Couldn't draft",
          description: error instanceof Error ? error.message : "Unexpected error.",
        })
      }
    } finally {
      setDrafting(false)
    }
  }

  // Auto-draft once on arrival, but only if the submitter hasn't already
  // written (or previously generated) a title/description — never clobber edits.
  useEffect(() => {
    if (autoTried.current) return
    autoTried.current = true
    const titleEmpty = !(formData.useCaseTitle || "").trim()
    const descEmpty = !(formData.useCaseDescription || "").trim()
    if (hasContext && titleEmpty && descEmpty) {
      void draft("auto")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <StepCard>
      <div className="flex items-start justify-between gap-3 rounded-md border border-border-subtle bg-background px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {drafting ? (
            <span className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4 animate-pulse" /> {tenant.assistantName} is drafting your title and summary…
            </span>
          ) : (
            `${tenant.assistantName} drafted these from everything you entered. Review and edit before submitting.`
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs flex-shrink-0"
          onClick={() => draft("manual")}
          disabled={drafting || !hasContext}
        >
          {drafting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Wand2 className="mr-1 h-3 w-3" />}
          Re-draft with {tenant.assistantName}
        </Button>
      </div>

      <Field label="Idea Title" htmlFor="useCaseTitle" required>
        <Input
          id="useCaseTitle"
          value={formData.useCaseTitle}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseTitle: e.target.value }))}
          placeholder="A short, specific name, like AI-Assisted Prior Art Search"
        />
      </Field>

      <Field label="Idea Summary" htmlFor="useCaseDescription" required>
        <Textarea
          id="useCaseDescription"
          value={formData.useCaseDescription}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseDescription: e.target.value }))}
          placeholder="A 2-3 sentence summary of what the idea is, who it helps, and the outcome."
          rows={6}
        />
      </Field>

      {isVisible("isWithheld") && (
        <Field label="Should this AI use case be withheld from public reporting?" required>
          <RadioGroup
            value={formData.isWithheld}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, isWithheld: value as any }))}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="is-withheld-no" />
              <Label htmlFor="is-withheld-no" className="font-normal">
                <span className="font-medium">No</span> - This information can be released publicly
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes_risk_to_disclosure" id="is-withheld-risk" />
              <Label htmlFor="is-withheld-risk" className="font-normal">
                <span className="font-medium">Yes - risk to disclosure</span> (FOIA-protected interest)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes_disclosure_prohibited" id="is-withheld-prohibited" />
              <Label htmlFor="is-withheld-prohibited" className="font-normal">
                <span className="font-medium">Yes - disclosure prohibited by law</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="other" id="is-withheld-other" />
              <Label htmlFor="is-withheld-other" className="font-normal">
                <span className="font-medium">Other</span> - Must stay internal to the {tenant.orgName} for another reason
              </Label>
            </div>
          </RadioGroup>
          <AiProposedHint proposal={isWithheldProposal} />
        </Field>
      )}
    </StepCard>
  )
}
