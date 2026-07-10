"use client"

// MERGED STEP — Problem first, then who's affected (per Jonathan's framing,
// reinforced by the problem-first reorder). Non-required enrichment fields are
// tucked behind an "Add optional detail" disclosure so the screen leads with
// the core question instead of overwhelming the submitter with ~10 inputs.

import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import TextareaAutosize from "react-textarea-autosize"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useFieldVisibility } from "@/lib/formConfig"
import { OptionRadioGroup } from "@/components/launchpad/option-radio-group"
import { getTenant } from "@/lib/tenant"
import { ChevronDown, ChevronRight } from "lucide-react"

const problemTypeOptions = [
  { value: "process_inefficiency", label: "Process inefficiency" },
  { value: "technical_debt", label: "Technical debt" },
  { value: "policy_gap", label: "Policy gap" },
  { value: "user_experience", label: "User experience" },
  { value: "other", label: "Other" },
]

export function Step3ProblemAndUsers() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const tenant = getTenant()
  const [showOptional, setShowOptional] = usePersistentDisclosure("problem")

  const usersSectionVisible =
    isVisible("targetAudience") || isVisible("impactedUsersCount") || isVisible("targetUserContext")

  // Non-required enrichment fields — hidden behind the disclosure by default.
  const optionalVisible =
    isVisible("problemImpact") || isVisible("problemType") || isVisible("painPoints")

  const handleProblemTypeToggle = (type: string) => {
    const currentTypes = formData.problemType || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type]
    setFormData((prev) => ({ ...prev, problemType: newTypes }))
  }

  const handleSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, problemDefinition: suggestion }))
  }

  return (
    <TooltipProvider>
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7">
          <div className="space-y-10">
            {/* ─── THE PROBLEM (primary) ─── */}
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  The problem
                </h3>
              </div>

              {isVisible("coreProblem") && (
                <div className="space-y-2">
                  <Label htmlFor="coreProblem" className="text-base font-semibold text-uspto-gray-text">
                    What is the core problem or opportunity?
                  </Label>
                  <Textarea
                    id="coreProblem"
                    value={formData.coreProblem}
                    onChange={(e) => setFormData((prev) => ({ ...prev, coreProblem: e.target.value }))}
                    placeholder="Summarize the main issue in a sentence or two."
                    rows={4}
                    className="text-base"
                  />
                </div>
              )}

              {(isVisible("affectedSystem") || isVisible("severity")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isVisible("affectedSystem") && (
                    <div className="space-y-2">
                      <Label htmlFor="affectedSystem">Which process, system, or group does this affect?</Label>
                      <Select
                        value={formData.affectedSystem}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, affectedSystem: value as any }))}
                      >
                        <SelectTrigger id="affectedSystem">
                          <SelectValue placeholder="Select an area..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="patents">Patents</SelectItem>
                          <SelectItem value="trademarks">Trademarks</SelectItem>
                          <SelectItem value="it_systems">IT systems</SelectItem>
                          <SelectItem value="cross_functional">Cross-functional</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {isVisible("severity") && (
                    <div className="space-y-2">
                      <Label>Severity</Label>
                      <RadioGroup
                        value={formData.severity}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, severity: value as any }))}
                        className="flex gap-4 pt-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="low" id="sev-low" />
                          <Label htmlFor="sev-low">Low</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="sev-medium" />
                          <Label htmlFor="sev-medium">Medium</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="high" id="sev-high" />
                          <Label htmlFor="sev-high">High</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ─── WHO'S AFFECTED (secondary section) ─── */}
            {usersSectionVisible && (
              <div className="space-y-6 border-t pt-8">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Who's affected
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    The people on the receiving end of the problem above.
                  </p>
                </div>

                {(isVisible("targetAudience") || isVisible("impactedUsersCount")) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isVisible("targetAudience") && (
                      <div className="space-y-2">
                        <Label htmlFor="targetAudience">Primary audience</Label>
                        <Select
                          value={formData.targetAudience}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, targetAudience: value as any }))}
                        >
                          <SelectTrigger id="targetAudience">
                            <SelectValue placeholder="Select an audience..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="patent_examiner">Patent Examiner</SelectItem>
                            <SelectItem value="trademark_examiner">Trademark Examiner</SelectItem>
                            <SelectItem value="supervisory_examiner">Supervisory Examiner</SelectItem>
                            <SelectItem value="product_owner">Product Owner</SelectItem>
                            <SelectItem value="lead_product_owner">Lead Product Owner</SelectItem>
                            <SelectItem value="developer">Developer</SelectItem>
                            <SelectItem value="applicant">Applicant/External User</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {isVisible("impactedUsersCount") && (
                      <div className="space-y-2">
                        <Label htmlFor="impactedUsersCount">How many users are impacted?</Label>
                        <OptionRadioGroup
                          ariaLabel="How many users are impacted?"
                          value={formData.impactedUsersCount}
                          onChange={(value) => setFormData((prev) => ({ ...prev, impactedUsersCount: value as any }))}
                          options={[
                            { value: "lt_10", label: "<10" },
                            { value: "10_50", label: "10–50" },
                            { value: "50_500", label: "50–500" },
                            { value: "gt_500", label: "500+" },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}

                {isVisible("targetUserContext") && (
                  <div className="space-y-2">
                    <Label htmlFor="targetUserContext">User profile / additional context</Label>
                    <TextareaAutosize
                      id="targetUserContext"
                      value={formData.targetUserContext}
                      onChange={(e) => setFormData((prev) => ({ ...prev, targetUserContext: e.target.value }))}
                      placeholder="Anything else about the users: workflow context, environment, edge cases."
                      minRows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ─── OPTIONAL DETAIL (progressive disclosure) ─── */}
            {optionalVisible && (
              <div className="border-t pt-6">
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
                  <div className="mt-5 space-y-6">
                    {isVisible("problemImpact") && (
                      <div className="space-y-2">
                        <Label htmlFor="problemImpact">Why does this problem matter?</Label>
                        <Textarea
                          id="problemImpact"
                          value={formData.problemImpact}
                          onChange={(e) => setFormData((prev) => ({ ...prev, problemImpact: e.target.value }))}
                          placeholder="Describe the impact on users, the agency, or the mission."
                          rows={3}
                        />
                      </div>
                    )}

                    {isVisible("problemType") && (
                      <div className="space-y-2">
                        <Label>Problem type</Label>
                        <div className="flex flex-wrap gap-2">
                          {problemTypeOptions.map((option) => (
                            <Toggle
                              key={option.value}
                              pressed={formData.problemType.includes(option.value)}
                              onPressedChange={() => handleProblemTypeToggle(option.value)}
                              variant="outline"
                              className="rounded-full px-3 py-1 text-sm h-auto"
                            >
                              {option.label}
                            </Toggle>
                          ))}
                        </div>
                      </div>
                    )}

                    {isVisible("painPoints") && (
                      <div className="space-y-2">
                        <Label htmlFor="painPoints">Key pain points</Label>
                        <TextareaAutosize
                          id="painPoints"
                          value={formData.painPoints}
                          onChange={(e) => setFormData((prev) => ({ ...prev, painPoints: e.target.value }))}
                          placeholder="What are users dealing with today that this would fix?"
                          minRows={3}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── AI-REFINED SUMMARY ─── */}
            {isVisible("problemDefinition") && (
              <div className="border-t pt-8 space-y-2">
                <Label htmlFor="problemDefinition" className="text-base font-semibold text-uspto-gray-text">
                  Refined Problem & Users Summary
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI-generated summary tying the problem to its affected users. Open {tenant.assistantName} from the right
                  panel to draft or refine.
                </p>
                <TextareaAutosize
                  id="problemDefinition"
                  value={formData.problemDefinition || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, problemDefinition: e.target.value }))}
                  placeholder="AI-generated summary will appear here..."
                  minRows={4}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                />
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col">
          <AIdChatPanel step={2} onApplySuggestion={handleSuggestion} />
        </div>
      </div>
    </TooltipProvider>
  )
}
