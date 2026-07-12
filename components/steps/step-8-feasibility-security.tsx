"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { AIdChatPanel } from "../launchpad/chat-panel"
import TextareaAutosize from "react-textarea-autosize"
import { useFieldVisibility } from "@/lib/formConfig"
import { usePersistentDisclosure } from "@/hooks/use-persistent-disclosure"
import { getTenant } from "@/lib/tenant"
import { ChevronDown, ChevronRight } from "lucide-react"
import { FieldRequirementBadge } from "../launchpad/field-requirement-badge"
import { determineHighImpact, HIGH_IMPACT_FACTOR_LABELS, type HighImpactFactor } from "@/lib/highImpactDetermination"

const highImpactFactorOptions: { value: HighImpactFactor; label: string }[] = (
  Object.keys(HIGH_IMPACT_FACTOR_LABELS) as HighImpactFactor[]
).map((value) => ({ value, label: HIGH_IMPACT_FACTOR_LABELS[value] }))

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

// OMB topic-area options (docs/omb-2025-inventory-fields.md field #9).
const topicAreaOptions = [
  { value: "administrative_functions", label: "Administrative Functions" },
  { value: "cybersecurity", label: "Cybersecurity" },
  { value: "emergency_management", label: "Emergency Management" },
  { value: "energy_environment", label: "Energy and the Environment" },
  { value: "government_benefits_processing", label: "Government Benefits Processing" },
  { value: "health_medical", label: "Health and Medical" },
  { value: "human_resources", label: "Human Resources" },
  { value: "information_technology", label: "Information Technology" },
  { value: "international_affairs", label: "International Affairs" },
  { value: "law_enforcement", label: "Law Enforcement" },
  { value: "procurement_financial_management", label: "Procurement and Financial Management" },
  { value: "science", label: "Science" },
  { value: "service_delivery", label: "Service Delivery" },
  { value: "transportation", label: "Transportation" },
  { value: "other", label: "Other" },
]

// OMB AI classification options (field #10).
const aiClassificationOptions = [
  { value: "agentic_ai", label: "Agentic AI" },
  { value: "classical_predictive_ml", label: "Classical/Predictive Machine Learning" },
  { value: "computer_vision", label: "Computer Vision" },
  { value: "generative_ai", label: "Generative AI" },
  { value: "nlp", label: "Natural Language Processing" },
  { value: "reinforcement_learning", label: "Reinforcement Learning" },
]

// OMB demographic-features options (field #23, select multiple).
const demographicFeatureOptions = [
  { value: "race_ethnicity", label: "Race/Ethnicity" },
  { value: "sex", label: "Sex" },
  { value: "age", label: "Age" },
  { value: "religious_affiliation", label: "Religious Affiliation" },
  { value: "socioeconomic_status", label: "Socioeconomic Status" },
  { value: "ability_status", label: "Ability Status" },
  { value: "residency_status", label: "Residency Status" },
  { value: "marital_status", label: "Marital Status" },
  { value: "income", label: "Income" },
  { value: "employment_status", label: "Employment Status" },
  { value: "none", label: "None of the above" },
  { value: "other", label: "Other" },
]

// OMB public-consultation steps options (field #34, select multiple).
const publicConsultationOptions = [
  { value: "direct_usability_testing", label: "Direct usability testing" },
  { value: "general_solicitation", label: "General solicitations of public feedback/comments" },
  { value: "public_hearings", label: "Public hearings or meetings" },
  { value: "other", label: "Other" },
  { value: "in_progress", label: "In-progress" },
  { value: "waived", label: "Agency CAIO has waived this minimum practice" },
]

export function Step8FeasibilitySecurity() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)
  const [showOptional, setShowOptional] = usePersistentDisclosure("feasibility")
  const tenant = getTenant()

  const handleToggle = (
    field: "resourcesNeeded" | "accessControlRequirements" | "highImpactFactors" | "demographicFeatures" | "publicConsultationSteps",
    item: string,
  ) => {
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
              <p className="text-sm text-muted-foreground mt-1">{tenant.dataMaturityFraming}</p>
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
                A required{tenant.trlSystemName ? ` ${tenant.trlSystemName}` : ""} field; lower TRL is fine but should come with a maturation plan.
              </p>
            </div>
          </div>

          {/* === Responsible AI gate (tenant risk framework) === */}
          <div className="pt-6 mt-6 border-t space-y-5">
            <div>
              <h3 className="font-semibold text-lg text-uspto-gray-text">Responsible AI &amp; security</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Disclosures aligned to {tenant.riskFramework.label}.
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
                Classification gates where the AI can run. CUI requires IL4/IL5.
                {tenant.srgCaveat ? ` ${tenant.srgCaveat}` : ""}
              </p>
            </div>

            <div className="space-y-2">
              <Label>
                Does this use PII or other sensitive personal data?{" "}
                <FieldRequirementBadge fieldKey="involvesSensitiveData" />
              </Label>
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
                Does the AI make or materially influence a decision about people (personnel, targeting, benefits)?{" "}
                <FieldRequirementBadge fieldKey="aiDecisionalImpact" />
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
              <Label htmlFor="aiModelSourcing">
                Underlying AI model sourcing <FieldRequirementBadge fieldKey="aiModelSourcing" />
              </Label>
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
              <p className="text-xs text-muted-foreground">{tenant.modelSourcingGuidance}</p>
            </div>

            <div className="space-y-2">
              <Label>
                Is human judgment required before the AI output drives action?
                {tenant.humanReviewCitation ? ` (${tenant.humanReviewCitation})` : ""}{" "}
                <FieldRequirementBadge fieldKey="aiHumanReview" />
              </Label>
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
                  Federal AI use case inventory <FieldRequirementBadge fieldKey="stageOfDevelopment" />
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Fields required for the OMB AI use case inventory (M-25-21 companion guidance). Each OMB-required
                  field is marked with a <em>Required (OMB)</em> tag — hover it to see why.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stageOfDevelopment">
                  Stage of development <FieldRequirementBadge fieldKey="stageOfDevelopment" />
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

              {isVisible("highImpactFactors") && (
                <div className="space-y-2">
                  <Label>
                    Could this AI&apos;s output meaningfully affect any of the following?{" "}
                    <FieldRequirementBadge fieldKey="highImpactFactors" />
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    OMB M-25-21 Section 5 high-impact criteria — select all that apply.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {highImpactFactorOptions.map((option) => (
                      <Toggle
                        key={option.value}
                        pressed={formData.highImpactFactors.includes(option.value)}
                        onPressedChange={() => handleToggle("highImpactFactors", option.value)}
                        variant="outline"
                        className="rounded-full px-3 py-1 text-sm h-auto"
                      >
                        {option.label}
                      </Toggle>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  Is this a high-impact AI use case? <FieldRequirementBadge fieldKey="highImpact" />
                </Label>
                <RadioGroup
                  value={formData.highImpact}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, highImpact: value as any }))}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high_impact" id="hi-yes" />
                    <Label htmlFor="hi-yes">High-impact</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="presumed_not_high_impact" id="hi-presumed" />
                    <Label htmlFor="hi-presumed">Presumed high-impact, but determined not high-impact</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="not_high_impact" id="hi-no" />
                    <Label htmlFor="hi-no">Not high-impact</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  High-impact use cases carry additional OMB risk-management reporting.
                  {" "}
                  Recommended: <strong>{determineHighImpact(formData).recommendation === "yes" ? "High-impact" : "Not high-impact"}</strong>, based on the factors selected above plus the risk answers already captured on this form — you make the final call.
                </p>
              </div>

              {isVisible("highImpactJustification") && (
                <div className="space-y-2">
                  <Label htmlFor="highImpactJustification">
                    Justification <FieldRequirementBadge fieldKey="highImpactJustification" />
                  </Label>
                  <Textarea
                    id="highImpactJustification"
                    value={formData.highImpactJustification}
                    onChange={(e) => setFormData((prev) => ({ ...prev, highImpactJustification: e.target.value }))}
                    placeholder="Why was this presumed high-impact use case determined not to be high-impact?"
                    rows={3}
                  />
                </div>
              )}

              {isVisible("topicArea") && (
                <div className="space-y-2">
                  <Label htmlFor="topicArea">
                    Use case topic area <FieldRequirementBadge fieldKey="topicArea" />
                  </Label>
                  <Select
                    value={formData.topicArea}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, topicArea: value as any }))}
                  >
                    <SelectTrigger id="topicArea">
                      <SelectValue placeholder="Select topic area..." />
                    </SelectTrigger>
                    <SelectContent>
                      {topicAreaOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isVisible("aiClassification") && (
                <div className="space-y-2">
                  <Label htmlFor="aiClassification">
                    AI classification <FieldRequirementBadge fieldKey="aiClassification" />
                  </Label>
                  <Select
                    value={formData.aiClassification}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, aiClassification: value as any }))}
                  >
                    <SelectTrigger id="aiClassification">
                      <SelectValue placeholder="Select classification..." />
                    </SelectTrigger>
                    <SelectContent>
                      {aiClassificationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {isVisible("aiImpactAssessment") && (
                <div className="space-y-5 pl-4 border-l-2 border-blue-200">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    High-impact risk management <FieldRequirementBadge fieldKey="aiImpactAssessment" />
                  </p>

                  <div className="space-y-2">
                    <Label>
                      Pre-deployment / real-world testing done?{" "}
                      <FieldRequirementBadge fieldKey="preDeploymentTesting" />
                    </Label>
                    <RadioGroup
                      value={formData.preDeploymentTesting}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, preDeploymentTesting: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="pretest-yes" />
                        <Label htmlFor="pretest-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="pretest-prog" />
                        <Label htmlFor="pretest-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="pretest-waived" />
                        <Label htmlFor="pretest-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                    <Textarea
                      value={formData.preDeploymentTestingNote}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, preDeploymentTestingNote: e.target.value }))
                      }
                      placeholder="Note (optional)..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      AI impact assessment completed?{" "}
                      <FieldRequirementBadge fieldKey="aiImpactAssessmentCompleted" />
                    </Label>
                    <RadioGroup
                      value={formData.aiImpactAssessmentCompleted}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, aiImpactAssessmentCompleted: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="assess-completed-yes" />
                        <Label htmlFor="assess-completed-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="assess-completed-prog" />
                        <Label htmlFor="assess-completed-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="assess-completed-waived" />
                        <Label htmlFor="assess-completed-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiImpactAssessment">
                      Potential impacts and how they were identified{" "}
                      <FieldRequirementBadge fieldKey="aiImpactAssessment" />
                    </Label>
                    <Textarea
                      id="aiImpactAssessment"
                      value={formData.aiImpactAssessment}
                      onChange={(e) => setFormData((prev) => ({ ...prev, aiImpactAssessment: e.target.value }))}
                      placeholder="Intended purpose, expected benefits, and potential risks of this AI system..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Independent review conducted? <FieldRequirementBadge fieldKey="independentReviewConducted" />
                    </Label>
                    <RadioGroup
                      value={formData.independentReviewConducted}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, independentReviewConducted: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes_other_office" id="indreview-office" />
                        <Label htmlFor="indreview-office">Yes — by another agency office/reviewer not involved in development</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes_oversight_board" id="indreview-board" />
                        <Label htmlFor="indreview-board">Yes — by an agency AI oversight board</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes_caio" id="indreview-caio" />
                        <Label htmlFor="indreview-caio">Yes — by the CAIO</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="indreview-prog" />
                        <Label htmlFor="indreview-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="indreview-waived" />
                        <Label htmlFor="indreview-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Ongoing monitoring plan? <FieldRequirementBadge fieldKey="ongoingMonitoringPlan" />
                    </Label>
                    <RadioGroup
                      value={formData.ongoingMonitoringPlan}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, ongoingMonitoringPlan: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="monitor-yes" />
                        <Label htmlFor="monitor-yes">Yes, sufficient monitoring protocols established</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="monitor-prog" />
                        <Label htmlFor="monitor-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="monitor-waived" />
                        <Label htmlFor="monitor-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                    <Textarea
                      value={formData.ongoingMonitoringNote}
                      onChange={(e) => setFormData((prev) => ({ ...prev, ongoingMonitoringNote: e.target.value }))}
                      placeholder="Note (optional)..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Periodic operator training established?{" "}
                      <FieldRequirementBadge fieldKey="operatorTrainingEstablished" />
                    </Label>
                    <RadioGroup
                      value={formData.operatorTrainingEstablished}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, operatorTrainingEstablished: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="optraining-yes" />
                        <Label htmlFor="optraining-yes">Yes, sufficient and periodic training established</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="optraining-prog" />
                        <Label htmlFor="optraining-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="optraining-waived" />
                        <Label htmlFor="optraining-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Appropriate fail-safe in place? <FieldRequirementBadge fieldKey="failSafeMechanism" />
                    </Label>
                    <RadioGroup
                      value={formData.failSafeMechanism}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, failSafeMechanism: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="failsafe-yes" />
                        <Label htmlFor="failsafe-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_applicable" id="failsafe-na" />
                        <Label htmlFor="failsafe-na">Not applicable</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="failsafe-prog" />
                        <Label htmlFor="failsafe-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="failsafe-waived" />
                        <Label htmlFor="failsafe-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Established appeal process for impacted individuals?{" "}
                      <FieldRequirementBadge fieldKey="humanOversightAppeal" />
                    </Label>
                    <RadioGroup
                      value={formData.humanOversightAppeal}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, humanOversightAppeal: value as any }))
                      }
                      className="flex flex-col gap-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="appeal-yes" />
                        <Label htmlFor="appeal-yes">Yes, appeal process established</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_applicable" id="appeal-na" />
                        <Label htmlFor="appeal-na">Not applicable</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="in_progress" id="appeal-prog" />
                        <Label htmlFor="appeal-prog">In-progress</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="law_precludes" id="appeal-law" />
                        <Label htmlFor="appeal-law">Law/operational limits preclude appeal</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="waived" id="appeal-waived" />
                        <Label htmlFor="appeal-waived">Agency CAIO has waived this minimum practice</Label>
                      </div>
                    </RadioGroup>
                    <Textarea
                      value={formData.humanOversightAppealNote}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, humanOversightAppealNote: e.target.value }))
                      }
                      placeholder="Note (optional)..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Steps taken to consult end users and the public{" "}
                      <FieldRequirementBadge fieldKey="publicConsultationSteps" />
                    </Label>
                    <p className="text-xs text-muted-foreground">Select all that apply.</p>
                    <div className="flex flex-wrap gap-2">
                      {publicConsultationOptions.map((option) => (
                        <Toggle
                          key={option.value}
                          pressed={formData.publicConsultationSteps.includes(option.value)}
                          onPressedChange={() => handleToggle("publicConsultationSteps", option.value)}
                          variant="outline"
                          className="rounded-full px-3 py-1 text-sm h-auto"
                        >
                          {option.label}
                        </Toggle>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {isVisible("hasATO") && (
                <div className="space-y-2">
                  <Label>
                    Associated Authorization to Operate (ATO)? <FieldRequirementBadge fieldKey="hasATO" />
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
              )}

              {isVisible("atoSystemName") && (
                <div className="space-y-2">
                  <Label htmlFor="atoSystemName">
                    ATO system name <FieldRequirementBadge fieldKey="atoSystemName" />
                  </Label>
                  <Input
                    id="atoSystemName"
                    value={formData.atoSystemName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, atoSystemName: e.target.value }))}
                    placeholder="Name of the authorized system..."
                  />
                </div>
              )}

              {isVisible("systemSource") && (
                <div className="space-y-2">
                  <Label htmlFor="systemSource">
                    Built in-house, under contract, or purchased? <FieldRequirementBadge fieldKey="systemSource" />
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
              )}

              {isVisible("systemSourceVendorName") && (
                <div className="space-y-2">
                  <Label htmlFor="systemSourceVendorName">
                    Vendor name <FieldRequirementBadge fieldKey="systemSourceVendorName" />
                  </Label>
                  <Input
                    id="systemSourceVendorName"
                    value={formData.systemSourceVendorName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, systemSourceVendorName: e.target.value }))}
                    placeholder="Vendor or contractor name..."
                  />
                </div>
              )}

              {isVisible("operationalDate") && (
                <div className="space-y-2">
                  <Label htmlFor="operationalDate">
                    Operational / pilot start date <FieldRequirementBadge fieldKey="operationalDate" />
                  </Label>
                  <Input
                    id="operationalDate"
                    type="date"
                    value={formData.operationalDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, operationalDate: e.target.value }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  Is this a National Security System / Intelligence Community use?{" "}
                  <FieldRequirementBadge fieldKey="nationalSecuritySystem" />
                </Label>
                <RadioGroup
                  value={formData.nationalSecuritySystem}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, nationalSecuritySystem: value as any }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="nss-yes" />
                    <Label htmlFor="nss-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="nss-no" />
                    <Label htmlFor="nss-no">No</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  NSS/IC use cases are excluded from the public OMB AI use case inventory.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Is this a research-only use (not an operational mission, service, or decision)?{" "}
                  <FieldRequirementBadge fieldKey="researchOnly" />
                </Label>
                <RadioGroup
                  value={formData.researchOnly}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, researchOnly: value as any }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="research-yes" />
                    <Label htmlFor="research-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="research-no" />
                    <Label htmlFor="research-no">No</Label>
                  </div>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  Research-only use is excluded from the inventory — unless it controls or significantly influences a
                  decision or outcome about individuals.
                </p>
              </div>

              <div className="pt-4 space-y-5">
                <h4 className="text-sm font-semibold text-uspto-gray-text">Data &amp; code disclosures</h4>

                {isVisible("trainingDataDescription") && (
                  <div className="space-y-2">
                    <Label htmlFor="trainingDataDescription">
                      Training / evaluation data <FieldRequirementBadge fieldKey="trainingDataDescription" />
                    </Label>
                    <Textarea
                      id="trainingDataDescription"
                      value={formData.trainingDataDescription}
                      onChange={(e) => setFormData((prev) => ({ ...prev, trainingDataDescription: e.target.value }))}
                      placeholder="Describe the data used to train, fine-tune, and/or evaluate the model(s)..."
                      rows={3}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="federalDataCatalogLink">
                    Federal Data Catalog entry <FieldRequirementBadge fieldKey="federalDataCatalogLink" />
                  </Label>
                  <Input
                    id="federalDataCatalogLink"
                    value={formData.federalDataCatalogLink}
                    onChange={(e) => setFormData((prev) => ({ ...prev, federalDataCatalogLink: e.target.value }))}
                    placeholder="Link, if the data is publicly disclosed as an open government data asset..."
                  />
                </div>

                {isVisible("hasPii") && (
                  <div className="space-y-2">
                    <Label>
                      Involves PII maintained by the agency? <FieldRequirementBadge fieldKey="hasPii" />
                    </Label>
                    <RadioGroup
                      value={formData.hasPii}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, hasPii: value as any }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="haspii-yes" />
                        <Label htmlFor="haspii-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="haspii-no" />
                        <Label htmlFor="haspii-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="piaLink">
                    Privacy Impact Assessment (PIA) link <FieldRequirementBadge fieldKey="piaLink" />
                  </Label>
                  <Input
                    id="piaLink"
                    value={formData.piaLink}
                    onChange={(e) => setFormData((prev) => ({ ...prev, piaLink: e.target.value }))}
                    placeholder="Link, if publicly available..."
                  />
                </div>

                {isVisible("demographicFeatures") && (
                  <div className="space-y-2">
                    <Label>
                      Demographic variables used as model features{" "}
                      <FieldRequirementBadge fieldKey="demographicFeatures" />
                    </Label>
                    <p className="text-xs text-muted-foreground">Select all that apply.</p>
                    <div className="flex flex-wrap gap-2">
                      {demographicFeatureOptions.map((option) => (
                        <Toggle
                          key={option.value}
                          pressed={formData.demographicFeatures.includes(option.value)}
                          onPressedChange={() => handleToggle("demographicFeatures", option.value)}
                          variant="outline"
                          className="rounded-full px-3 py-1 text-sm h-auto"
                        >
                          {option.label}
                        </Toggle>
                      ))}
                    </div>
                  </div>
                )}

                {isVisible("customCode") && (
                  <div className="space-y-2">
                    <Label>
                      Does this project include custom-developed code? <FieldRequirementBadge fieldKey="customCode" />
                    </Label>
                    <RadioGroup
                      value={formData.customCode}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, customCode: value as any }))}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="customcode-yes" />
                        <Label htmlFor="customcode-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="customcode-no" />
                        <Label htmlFor="customcode-no">No</Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {isVisible("openSourceCodeLink") && (
                  <div className="space-y-2">
                    <Label htmlFor="openSourceCodeLink">
                      Open source code link <FieldRequirementBadge fieldKey="openSourceCodeLink" />
                    </Label>
                    <Input
                      id="openSourceCodeLink"
                      value={formData.openSourceCodeLink}
                      onChange={(e) => setFormData((prev) => ({ ...prev, openSourceCodeLink: e.target.value }))}
                      placeholder="Link to the publicly available source code..."
                    />
                  </div>
                )}
              </div>
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
