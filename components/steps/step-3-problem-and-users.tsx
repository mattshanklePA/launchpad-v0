"use client"

// MERGED STEP — combines what used to be Step 3 (Target User) and Step 4
// (Problem Statement). Per Jonathan's feedback, leadership wants the problem
// stated first, then the affected users described. Same fields as before, in
// one screen, with the Scout panel coaching on the merged frame.

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

  // Section visibility — hide the section header entirely if every child
  // field has been turned off in the admin Form Configuration.
  const usersSectionVisible =
    isVisible("targetAudience") ||
    isVisible("impactedUsersCount") ||
    isVisible("painPoints") ||
    isVisible("targetUserContext")

  const handleProblemTypeToggle = (type: string) => {
    const currentTypes = formData.problemType || []
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type]
    setFormData((prev) => ({ ...prev, problemType: newTypes }))
  }

  // Scout's "Use as Starting Point" should land in the Problem Definition
  // summary field (the primary AI-refined output for this merged step).
  const handleSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, problemDefinition: suggestion }))
  }

  return (
    <TooltipProvider>
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <div className="rounded-lg border bg-white p-6 shadow-sm space-y-10 h-full">
            {/* ─── PROBLEM FIRST (Jonathan's framing for Ramesh) ─── */}
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-uspto-gray-text">The Problem</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Start with the problem before describing who's affected. Leadership wants
                  the pain stated up front.
                </p>
              </div>

              {isVisible("coreProblem") && (
                <div className="space-y-2">
                  <Label htmlFor="coreProblem">What is the core problem or opportunity?</Label>
                  <Textarea
                    id="coreProblem"
                    value={formData.coreProblem}
                    onChange={(e) => setFormData((prev) => ({ ...prev, coreProblem: e.target.value }))}
                    placeholder="Summarize the main issue."
                    rows={3}
                  />
                </div>
              )}

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

              {(isVisible("affectedSystem") || isVisible("severity")) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {isVisible("affectedSystem") && (
                    <div className="space-y-2">
                      <Label htmlFor="affectedSystem">Which process, system, or group does this affect?</Label>
                      <Select
                        value={formData.affectedSystem}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, affectedSystem: value as any }))
                        }
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
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, severity: value as any }))
                        }
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
            </div>

            {/* ─── TARGET USERS (the lens for the problem) ─── */}
            {usersSectionVisible && (
              <div className="space-y-6 pt-6 border-t">
                <div>
                  <h3 className="font-semibold text-lg text-uspto-gray-text">Who's Affected</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Describe the people on the receiving end of the problem above.
                  </p>
                </div>

                {(isVisible("targetAudience") || isVisible("impactedUsersCount")) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isVisible("targetAudience") && (
                      <div className="space-y-2">
                        <Label htmlFor="targetAudience">Primary audience</Label>
                        <Select
                          value={formData.targetAudience}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, targetAudience: value as any }))
                          }
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
                        <Select
                          value={formData.impactedUsersCount}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, impactedUsersCount: value as any }))
                          }
                        >
                          <SelectTrigger id="impactedUsersCount">
                            <SelectValue placeholder="Select a range..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lt_10">{"<10"}</SelectItem>
                            <SelectItem value="10_50">10–50</SelectItem>
                            <SelectItem value="50_500">50–500</SelectItem>
                            <SelectItem value="gt_500">500+</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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

                {isVisible("targetUserContext") && (
                  <div className="space-y-2">
                    <Label htmlFor="targetUserContext">User profile / additional context</Label>
                    <TextareaAutosize
                      id="targetUserContext"
                      value={formData.targetUserContext}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, targetUserContext: e.target.value }))
                      }
                      placeholder="Anything else about the users — workflow context, environment, edge cases."
                      minRows={3}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                    />
                  </div>
                )}
              </div>
            )}

            {/* ─── AI-REFINED SUMMARY ─── */}
            {isVisible("problemDefinition") && (
              <div className="pt-6 border-t space-y-2">
                <Label htmlFor="problemDefinition" className="text-base font-semibold">
                  Refined Problem & Users Summary
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI-generated summary tying the problem to its affected users. Open Scout from the
                  right panel to draft or refine.
                </p>
                <TextareaAutosize
                  id="problemDefinition"
                  value={formData.problemDefinition || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, problemDefinition: e.target.value }))
                  }
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
