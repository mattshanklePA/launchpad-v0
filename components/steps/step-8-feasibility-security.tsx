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
import { OmbBadge } from "../launchpad/omb-badge"

const resourceOptions = [
  { value: "dev_staff", label: "Development staff" },
  { value: "data_access", label: "Data access" },
  { value: "vendor_support", label: "Vendor support" },
  { value: "other", label: "Other" },
]
const accessOptions = [
  { value: "role_based", label: "Role-based access" },
  { value: "mfa", label: "MFA / CAC" },
  { value: "il_boundary", label: "Runs inside accredited boundary (IL4/5)" },
  { value: "other", label: "Other" },
]

export function Step8FeasibilitySecurity() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()
  const [showOptional, setShowOptional] = usePersistentDisclosure("feasibility")

  const handleToggle = (field: "resourcesNeeded" | "accessControlRequirements", item: string) => {
    const currentItems = formData[field] || []
    const newItems = currentItems.includes(item) ? currentItems.filter((i) => i !== item) : [...currentItems, item]
    setFormData((prev) => ({ ...prev, [field]: newItems }))
  }

  return (
    <div className="grid lg:grid-cols-12 gap-10">
      <div className="lg:col-span-7">
        <div className="space-y-8">
          {isVisible("dependencies") && (
            <div className="space-y-2">
              <Label htmlFor="dependencies">Key dependencies or constraints</Label>
              <Textarea
                id="dependencies"
                value={formData.dependencies}
                onChange={(e) => setFormData((prev) => ({ ...prev, dependencies: e.target.value }))}
                placeholder="e.g., access to authoritative data, integration with existing systems, ATO timeline..."
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

          {/* === Data readiness & maturity === */}
          <div className="pt-6 mt-6 border-t space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-uspto-gray-text">Data readiness &amp; maturity</h3>
              <p className="text-sm text-muted-foreground mt-1">
                In the DoD AI Hierarchy of Needs, AI-ready data is the foundation and maturity drives funding.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Is AI-ready data available today?</Label>
              <RadioGroup
                value={formData.dataReadiness}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, dataReadiness: value as any }))}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="ai_ready" id="dr-ready" />
                  <Label htmlFor="dr-ready">Yes — labeled, accessible, AI-ready data exists</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="partial" id="dr-partial" />
                  <Label htmlFor="dr-partial">Partial — some data exists but needs cleanup or labeling</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="needs_build" id="dr-build" />
                  <Label htmlFor="dr-build">No — data must be collected, labeled, or relabeled first</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="trl">Technology Readiness Level (TRL)</Label>
              <Select
                value={formData.trl}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, trl: value as any }))}
              >
                <SelectTrigger id="trl">
                  <SelectValue placeholder="Select TRL..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">TRL 1 — basic principles observed</SelectItem>
                  <SelectItem value="2">TRL 2 — technology concept formulated</SelectItem>
                  <SelectItem value="3">TRL 3 — proof of concept</SelectItem>
                  <SelectItem value="4">TRL 4 — validated in lab</SelectItem>
                  <SelectItem value="5">TRL 5 — validated in relevant environment</SelectItem>
                  <SelectItem value="6">TRL 6 — demonstrated in relevant environment</SelectItem>
                  <SelectItem value="7">TRL 7 — prototype in operational environment</SelectItem>
                  <SelectItem value="8">TRL 8 — system complete and qualified</SelectItem>
                  <SelectItem value="9">TRL 9 — proven in mission operations</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                A required Tradewinds field; lower TRL is fine but should come with a maturation plan.
              </p>
            </div>
          </div>

          {/* === Responsible AI gate (DoD AI Ethical Principles) === */}
          <div className="pt-6 mt-6 border-t space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-uspto-gray-text">Responsible AI &amp; security</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Disclosures aligned to the DoD AI Ethical Principles (Responsible, Equitable, Traceable,
                Reliable, Governable) and CDAO Responsible AI guidance.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="impactLevel">Data classification / required Impact Level</Label>
              <Select
                value={formData.impactLevel}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, impactLevel: value as any }))}
              >
                <SelectTrigger id="impactLevel">
                  <SelectValue placeholder="Select classification..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unclassified">Unclassified / public (IL2)</SelectItem>
                  <SelectItem value="cui">CUI (IL4)</SelectItem>
                  <SelectItem value="il5">CUI, higher sensitivity / NSS (IL5)</SelectItem>
                  <SelectItem value="il6">Classified up to Secret (IL6 / SIPRNet)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Classification gates where the AI can run. CUI requires IL4/IL5; FedRAMP authorization alone
                does not satisfy the DoD SRG.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Does this use PII or other sensitive personal data? <OmbBadge /></Label>
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
                Does the AI make or materially influence a decision about people (personnel, targeting, benefits)?
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
                DoD prefers American-built or U.S.-hosted models running inside the accredited boundary
                (e.g., Amazon Bedrock in GovCloud, authorized at IL4/IL5). Foreign/unknown sourcing requires
                additional review.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Is human judgment required before the AI output drives action? (Governable / DoDD 3000.09)</Label>
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

          {/* === OMB federal AI use case inventory === */}
          {isVisible("stageOfDevelopment") && (
            <div className="pt-6 mt-6 border-t space-y-5">
              <div>
                <h3 className="font-semibold text-lg text-uspto-gray-text">
                  Federal AI use case inventory <OmbBadge />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Fields required for the OMB AI use case inventory (M-25-21 companion guidance). Each OMB-required
                  field is marked with an <OmbBadge /> tag.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stageOfDevelopment">
                  Stage of development <OmbBadge />
                </Label>
                <Select
                  value={formData.stageOfDevelopment}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, stageOfDevelopment: value as any }))}
                >
                  <SelectTrigger id="stageOfDevelopment">
                    <SelectValue placeholder="Select stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_deployment">Pre-deployment (development or acquisition)</SelectItem>
                    <SelectItem value="pilot">Pilot (limited test)</SelectItem>
                    <SelectItem value="deployed">Deployed / operational</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>
                  Is this a high-impact AI use case? <OmbBadge />
                </Label>
                <RadioGroup
                  value={formData.highImpact}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, highImpact: value as any }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="hi-yes" />
                    <Label htmlFor="hi-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="hi-no" />
                    <Label htmlFor="hi-no">No</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  High-impact use cases carry additional OMB risk-management reporting.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Associated Authorization to Operate (ATO)? <OmbBadge />
                </Label>
                <RadioGroup
                  value={formData.hasATO}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, hasATO: value as any }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="ato-yes" />
                    <Label htmlFor="ato-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="in_progress" id="ato-prog" />
                    <Label htmlFor="ato-prog">In progress</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="ato-no" />
                    <Label htmlFor="ato-no">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label htmlFor="systemSource">
                  Built in-house, under contract, or purchased? <OmbBadge />
                </Label>
                <Select
                  value={formData.systemSource}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, systemSource: value as any }))}
                >
                  <SelectTrigger id="systemSource">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_house">Developed in-house</SelectItem>
                    <SelectItem value="contract">Developed under contract</SelectItem>
                    <SelectItem value="vendor">Purchased from a vendor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formData.involvesSensitiveData === "yes" && isVisible("accessControlRequirements") && (
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

          {isVisible("feasibilitySummary") && (
            <div className="pt-6 mt-6 border-t space-y-2">
              <Label htmlFor="feasibilitySummary" className="text-base font-semibold">
                Feasibility &amp; Security Summary
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
      <div className="lg:col-span-5 flex flex-col">
        <AIdChatPanel
          step={6}
          onApplySuggestion={(suggestion) => setFormData((prev) => ({ ...prev, feasibilitySummary: suggestion }))}
        />
      </div>
    </div>
  )
}
