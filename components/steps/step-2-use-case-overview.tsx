"use client"
import { useState } from "react"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Wand2, Loader2 } from "lucide-react"
import { useFieldVisibility } from "@/lib/formConfig"
import { suggestUseCaseTitle } from "@/app/actions"
import { useToast } from "@/components/ui/use-toast"

export function Step2UseCaseOverview() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const { toast } = useToast()
  const [suggesting, setSuggesting] = useState(false)

  // This step now comes AFTER the problem step, so Scout can draft a working
  // title from the problem the submitter already described plus whatever rough
  // idea text they have typed here. The result is always editable.
  const canSuggest =
    Boolean((formData.coreProblem || "").trim()) ||
    Boolean((formData.useCaseDescription || "").trim())

  const handleSuggestTitle = async () => {
    setSuggesting(true)
    try {
      const result = await suggestUseCaseTitle(formData)
      if (result.title) {
        setFormData((prev) => ({ ...prev, useCaseTitle: result.title }))
        toast({
          title: "Title suggested",
          description: result.error || "Scout drafted a title — edit it to fit your idea.",
        })
      } else {
        toast({
          variant: "destructive",
          title: "Couldn't suggest a title",
          description: result.error || "Add a bit more detail and try again.",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Couldn't suggest a title",
        description: error instanceof Error ? error.message : "Unexpected error.",
      })
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="useCaseTitle">Idea Title</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={handleSuggestTitle}
            disabled={suggesting || !canSuggest}
          >
            {suggesting ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Wand2 className="mr-1 h-3 w-3" />
            )}
            {suggesting ? "Thinking…" : "Suggest a title"}
          </Button>
        </div>
        <Input
          id="useCaseTitle"
          value={formData.useCaseTitle}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseTitle: e.target.value }))}
          placeholder="Give it a working title — e.g., Smarter Prior Art Search"
        />
        <p className="text-xs text-muted-foreground">
          {canSuggest
            ? "Scout can draft a title from the problem you described — you can always edit it."
            : "Add a rough description below (or a problem on the previous step) and Scout can suggest a title."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="useCaseDescription">Describe Your Idea</Label>
        <Textarea
          id="useCaseDescription"
          value={formData.useCaseDescription}
          onChange={(e) => setFormData((prev) => ({ ...prev, useCaseDescription: e.target.value }))}
          placeholder="What's the idea? Describe it in your own words — rough is fine..."
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
                <span className="font-medium">Excluded</span> - This information must stay internal to USPTO
              </Label>
            </div>
          </RadioGroup>
        </div>
      )}
    </div>
  )
}
