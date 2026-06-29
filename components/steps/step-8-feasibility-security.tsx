"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { ChevronDown, ChevronRight } from "lucide-react"

const resourceOptions = [
  { value: "dev_staff", label: "Development staff" },
  { value: "data_access", label: "Data access" },
  { value: "vendor_support", label: "Vendor support" },
  { value: "other", label: "Other" },
]
const accessOptions = [
  { value: "role_based", label: "Role-based access" },
  { value: "mfa", label: "MFA" },
  { value: "fedramp", label: "FedRAMP compliance" },
  { value: "other", label: "Other" },
]

export function Step8FeasibilitySecurity() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const [showOptional, setShowOptional] = usePersistentDisclosure("feasibility")

  // Scout on this step coaches the free-text "dependencies" draft into the
  // feasibility summary. If either the input field (dependencies) or the output
  // field (feasibilitySummary) is turned off in Form Config, Scout has nothing
  // to work on — so hide the panel and let the form use the full width instead
  // of showing a permanently-disabled Scout box. (This step is otherwise just
  // the mandated AI-risk selections, none of which need Scout.)
  const showScout = isVisible("dependencies") && isVisible("feasibilitySummary")

  const handleToggle = (field: "resourcesNeeded" | "accessControlRequirements", item: string) => {
    const currentItems = formData[field] || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, [field]: newItems }))
  }

  return (
    <div className={showScout ? "grid lg:grid-cols-12 gap-10" : ""}>
      <div className={showScout ? "lg:col-span-7" : ""}>
        <div className="space-y-8">
          {isVisible("dependencies") && (
            <div className="space-y-2">
              <Label htmlFor="dependencies">Key dependencies or constraints</Label>
              <Textarea
                id="dependencies"
                value={formData.dependencies}
                onChange={(e) => setFormData((prev) => ({ ...prev, dependencies: e.target.value }))}
                placeholder="e.g., API access to legacy systems, vendor contracts..."
                rows={3}
              />
            </div>
          )}
          {isVisible("resourcesNeeded") && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOptional((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-uspto-blue-primary hover:underline"
                aria-expanded={showOptional}
              >
                {showOptional ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {showOptional ? "Hide optional detail" : "Add optional detail"}
              </button>
              {showOptional && (
                <div className="mt-5 space-y-2">
                  <Label>What resources are needed?</Label>
                  <div className="flex flex-wrap gap-2">
                    {resourceOptions.map((option) => (
                      <Toggle
                        key={option.value}
                        pressed={formData.resourcesNeeded.includes(option.value)}
                        onPressedChange={() => handleToggle("resourcesNeeded", option.value)}
                        variant="outline"
                        className="rounded-full px-3 py-1 text-sm h-auto"
                      >
                        {option.label}
                      </Toggle>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* ─── AI Risk Management (DoC-mandated + Executive Order) ─── */}
          <div className="pt-6 mt-6 border-t space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-uspto-gray-text">AI Risk Management</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Mandatory disclosure questions required by the Department of Commerce and
                current Executive Order on federal AI sourcing.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Does this involve PII or other sensitive data?</Label>
              <RadioGroup
                value={formData.involvesSensitiveData}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, involvesSensitiveData: value as any }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="data-yes" />
                  <Label htmlFor="data-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="data-no" />
                  <Label htmlFor="data-no">No</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>
                Does the AI make or materially influence a decision that affects an applicant or employee?
              </Label>
              <RadioGroup
                value={formData.aiDecisionalImpact}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, aiDecisionalImpact: value as any }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="dec-yes" />
                  <Label htmlFor="dec-yes">Yes, output drives a decision</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="dec-no" />
                  <Label htmlFor="dec-no">No, output is informational only</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="aiModelSourcing">Underlying AI model sourcing</Label>
              <Select
                value={formData.aiModelSourcing}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, aiModelSourcing: value as any }))
                }
              >
                <SelectTrigger id="aiModelSourcing">
                  <SelectValue placeholder="Select sourcing..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="american_built">American-built (commercial)</SelectItem>
                  <SelectItem value="open_source_us">Open-source, U.S.-hosted</SelectItem>
                  <SelectItem value="foreign">Foreign-built or foreign-hosted</SelectItem>
                  <SelectItem value="unknown">Unknown / TBD</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Per the current executive order, federal AI procurements should prefer
                American-built or U.S.-hosted open-source models. Foreign/unknown sourcing requires
                additional review.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Is human review mandatory before the AI output drives action?</Label>
              <RadioGroup
                value={formData.aiHumanReview}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, aiHumanReview: value as any }))
                }
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="hr-yes" />
                  <Label htmlFor="hr-yes">Yes, human-in-the-loop</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="hr-no" />
                  <Label htmlFor="hr-no">No, AI acts directly</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {formData.involvesSensitiveData === "yes" && (
            <>
              {isVisible("securityClassification") && (
                <div className="space-y-2">
                  <Label htmlFor="securityClassification">Security classification</Label>
                  <Select
                    value={formData.securityClassification}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, securityClassification: value as any }))}
                  >
                    <SelectTrigger id="securityClassification">
                      <SelectValue placeholder="Select classification..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal only</SelectItem>
                      <SelectItem value="external">External shareable</SelectItem>
                      <SelectItem value="controlled">Controlled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {isVisible("accessControlRequirements") && (
                <div className="space-y-2">
                  <Label>Access control requirements</Label>
                  <div className="flex flex-wrap gap-2">
                    {accessOptions.map((option) => (
                      <Toggle
                        key={option.value}
                        pressed={formData.accessControlRequirements.includes(option.value)}
                        onPressedChange={() => handleToggle("accessControlRequirements", option.value)}
                        variant="outline"
                        className="rounded-full px-3 py-1 text-sm h-auto"
                      >
                        {option.label}
                      </Toggle>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {isVisible("feasibilitySummary") && (
            <div className="pt-6 mt-6 border-t space-y-2">
              <Label htmlFor="feasibilitySummary" className="text-base font-semibold">
                Feasibility & Security Summary
              </Label>
              <p className="text-sm text-muted-foreground">
                This field is for the AI-generated refined summary of implementation feasibility and security
                considerations.
              </p>
              <TextareaAutosize
                id="feasibilitySummary"
                value={formData.feasibilitySummary || ""}
                onChange={(e) => setFormData((prev) => ({ ...prev, feasibilitySummary: e.target.value }))}
                placeholder="AI-generated summary will appear here..."
                minRows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              />
            </div>
          )}
        </div>
      </div>
      {showScout && (
        <div className="lg:col-span-5 flex flex-col">
          <AIdChatPanel
            step={6}
            onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, feasibilitySummary: suggestion }))}
          />
        </div>
      )}
    </div>
  )
}
