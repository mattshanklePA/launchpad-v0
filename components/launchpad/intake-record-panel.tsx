"use client"

// The live "your idea so far" record for the conversational-first intake
// (issue #169) — every light field the assistant thread has captured,
// always visible next to the chat and editable inline. Editing a field here
// calls back into the parent (`onFieldChange`), which both updates FormData
// and — since the assistant re-reads current FormData on its next turn and
// the conversation engine recomputes which topic is still open from FormData
// itself (lib/intakeFlow.ts's `nextIntakeTopic`) — lets a manual edit here
// stand in for an answer never asked out loud, so the assistant never
// re-asks something already on the record.

import { useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Toggle } from "@/components/ui/toggle"
import { OptionRadioGroup } from "@/components/launchpad/option-radio-group"
import { fieldLabel } from "@/components/launchpad/chat-panel"
import { Pencil, Check, X, Send, Loader2, ClipboardList } from "lucide-react"
import type { FormData } from "@/lib/steps"
import { getTenant } from "@/lib/tenant"
import { cn } from "@/lib/utils"

type Props = {
  formData: FormData
  onFieldChange: (patch: Partial<FormData>) => void
  remainingLabels: string[]
  readyToSubmit: boolean
  isSubmitting: boolean
  onSubmit: () => void
}

function RecordSection({
  label,
  captured,
  editing,
  onEdit,
  onCancel,
  children,
}: {
  label: string
  captured: boolean
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
        {!editing ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onEdit}
            aria-label={`Edit ${label}`}
          >
            <Pencil className="h-3 w-3 mr-1" />
            Edit
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={onCancel} aria-label={`Cancel editing ${label}`}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        )}
      </div>
      {!captured && !editing && (
        <p className="text-sm text-muted-foreground italic">Not yet captured.</p>
      )}
      {children}
    </div>
  )
}

export function IntakeRecordPanel({ formData, onFieldChange, remainingLabels, readyToSubmit, isSubmitting, onSubmit }: Props) {
  const tenant = getTenant()
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [textDraft, setTextDraft] = useState("")
  const [multiDraft, setMultiDraft] = useState<string[]>([])
  const [audienceDraft, setAudienceDraft] = useState<FormData["deliveryAudience"]>("")
  const [benefitsDraft, setBenefitsDraft] = useState({ solutionSummary: "", userValue: "", businessValue: "" })

  const startTextEdit = (section: string, current: string) => {
    setTextDraft(current)
    setEditingSection(section)
  }
  const saveTextEdit = (field: keyof FormData) => {
    onFieldChange({ [field]: textDraft } as Partial<FormData>)
    setEditingSection(null)
  }

  const startMultiEdit = () => {
    setMultiDraft(formData.affectedBusinessUnits || [])
    setEditingSection("affectedUnits")
  }
  const toggleMultiDraft = (value: string) => {
    setMultiDraft((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]))
  }
  const saveMultiEdit = () => {
    onFieldChange({ affectedBusinessUnits: multiDraft })
    setEditingSection(null)
  }

  const startAudienceEdit = () => {
    setAudienceDraft(formData.deliveryAudience)
    setEditingSection("audience")
  }
  const saveAudienceEdit = (value: string) => {
    onFieldChange({ deliveryAudience: value as FormData["deliveryAudience"] })
    setEditingSection(null)
  }

  const startBenefitsEdit = () => {
    setBenefitsDraft({
      solutionSummary: formData.solutionSummary || "",
      userValue: formData.userValue || "",
      businessValue: formData.businessValue || "",
    })
    setEditingSection("solutionBenefits")
  }
  const saveBenefitsEdit = () => {
    onFieldChange(benefitsDraft)
    setEditingSection(null)
  }

  const affectedLabels = (formData.affectedBusinessUnits || []).map(
    (v) => tenant.affectedSystems.find((o) => o.value === v)?.label || v,
  )

  return (
    <Card className="sticky top-24 max-h-[calc(100vh-8rem)] flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Your idea so far
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto flex-1">
        <RecordSection
          label={fieldLabel("problemDefinition")}
          captured={Boolean(formData.problemDefinition?.trim())}
          editing={editingSection === "problem"}
          onEdit={() => startTextEdit("problem", formData.problemDefinition || "")}
          onCancel={() => setEditingSection(null)}
        >
          {editingSection === "problem" ? (
            <div className="space-y-2">
              <Textarea
                aria-label={fieldLabel("problemDefinition")}
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                rows={4}
                autoFocus
              />
              <Button size="sm" onClick={() => saveTextEdit("problemDefinition")}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          ) : (
            formData.problemDefinition && <p className="text-sm whitespace-pre-wrap">{formData.problemDefinition}</p>
          )}
        </RecordSection>

        <RecordSection
          label={fieldLabel("affectedBusinessUnits")}
          captured={(formData.affectedBusinessUnits || []).length > 0}
          editing={editingSection === "affectedUnits"}
          onEdit={startMultiEdit}
          onCancel={() => setEditingSection(null)}
        >
          {editingSection === "affectedUnits" ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label={fieldLabel("affectedBusinessUnits")}>
                {tenant.affectedSystems.map((option) => (
                  <Toggle
                    key={option.value}
                    pressed={multiDraft.includes(option.value)}
                    onPressedChange={() => toggleMultiDraft(option.value)}
                    variant="outline"
                    className="rounded-full px-3 py-1 text-sm h-auto"
                  >
                    {option.label}
                  </Toggle>
                ))}
              </div>
              <Button size="sm" onClick={saveMultiEdit} disabled={multiDraft.length === 0}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          ) : (
            affectedLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {affectedLabels.map((l) => (
                  <span key={l} className="rounded-full bg-muted px-2.5 py-0.5 text-xs">
                    {l}
                  </span>
                ))}
              </div>
            )
          )}
        </RecordSection>

        <RecordSection
          label={fieldLabel("deliveryAudience")}
          captured={Boolean(formData.deliveryAudience)}
          editing={editingSection === "audience"}
          onEdit={startAudienceEdit}
          onCancel={() => setEditingSection(null)}
        >
          {editingSection === "audience" ? (
            <OptionRadioGroup
              ariaLabel={fieldLabel("deliveryAudience")}
              value={audienceDraft}
              onChange={saveAudienceEdit}
              options={[
                { value: "internal", label: "Internal — for our own staff" },
                { value: "external", label: "External — customer/public-facing" },
              ]}
            />
          ) : (
            formData.deliveryAudience && (
              <p className="text-sm">{formData.deliveryAudience === "internal" ? "Internal — for our own staff" : "External — customer/public-facing"}</p>
            )
          )}
        </RecordSection>

        <RecordSection
          label="Proposed solution & expected benefits"
          captured={Boolean(formData.solutionSummary?.trim() && formData.userValue?.trim() && formData.businessValue?.trim())}
          editing={editingSection === "solutionBenefits"}
          onEdit={startBenefitsEdit}
          onCancel={() => setEditingSection(null)}
        >
          {editingSection === "solutionBenefits" ? (
            <div className="space-y-3">
              {(["solutionSummary", "userValue", "businessValue"] as const).map((key) => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground" htmlFor={`benefits-${key}`}>
                    {fieldLabel(key)}
                  </label>
                  <Textarea
                    id={`benefits-${key}`}
                    value={benefitsDraft[key]}
                    onChange={(e) => setBenefitsDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    rows={2}
                  />
                </div>
              ))}
              <Button size="sm" onClick={saveBenefitsEdit}>
                <Check className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {(["solutionSummary", "userValue", "businessValue"] as const).map(
                (key) =>
                  formData[key] && (
                    <div key={key}>
                      <p className="text-xs font-medium text-muted-foreground">{fieldLabel(key)}</p>
                      <p className="text-sm whitespace-pre-wrap">{formData[key] as string}</p>
                    </div>
                  ),
              )}
            </div>
          )}
        </RecordSection>
      </CardContent>
      <CardFooter className={cn("flex-shrink-0 flex-col items-stretch gap-2 border-t pt-4", !readyToSubmit && "items-start")}>
        {!readyToSubmit ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Still need: {remainingLabels.join(", ")}
          </p>
        ) : (
          <>
            <p className="text-xs text-green-700" aria-live="polite">
              Every light field is captured — ready to submit.
            </p>
            <Button onClick={onSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" /> Submit for Vetting
                </>
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
