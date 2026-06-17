"use client"
import { useEffect, useRef, useState } from "react"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Wand2, Loader2, Sparkles } from "lucide-react"
import { useFieldVisibility } from "@/lib/formConfig"
import { suggestIdeaOverview } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"

export function Step2UseCaseOverview() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const { toast } = useToast()
  const [drafting, setDrafting] = useState(false)
  const autoTried = useRef(false)

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
            description: result.error || "Scout re-drafted your title and summary. Edit as needed.",
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
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 rounded-lg border bg-blue-50/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          {drafting ? (
            <span className="flex items-center gap-2 text-uspto-blue-primary">
              <Sparkles className="h-4 w-4 animate-pulse" /> Scout is drafting your title and summary…
            </span>
          ) : (
            "Scout drafted these from everything you entered. Review and edit before submitting."
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
          Re-draft with Scout
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="useCaseTitle" className="text-base font-semibold text-uspto-gray-text">
          Idea Title
        </Label>
        <Input
          id="useCaseTitle"
          value={formData.useCaseTitle}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseTitle: e.target.value }))}
          placeholder="A short, specific name, like AI-Assisted Prior Art Search"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="useCaseDescription" className="text-base font-semibold text-uspto-gray-text">
          Idea Summary
        </Label>
        <Textarea
          id="useCaseDescription"
          value={formData.useCaseDescription}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseDescription: e.target.value }))}
          placeholder="A 2-3 sentence summary of what the idea is, who it helps, and the outcome."
          rows={6}
        />
      </div>

      {isVisible("publicIndicator") && (
        <div className="space-y-3">
          <Label>Information Classification</Label>
          <RadioGroup
            value={formData.publicIndicator}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, publicIndicator: value as any }))}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="public" id="public" />
              <Label htmlFor="public" className="font-normal">
                <span className="font-medium">Public</span> - This information can be released publicly
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="excluded" id="excluded" />
              <Label htmlFor="excluded" className="font-normal">
                <span className="font-medium">Excluded</span> - This information must stay internal to the Department of War
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  )
}
