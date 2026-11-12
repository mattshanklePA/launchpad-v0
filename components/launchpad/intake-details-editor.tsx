"use client"

// The required fields guided mode's conversation does not collect itself
// (issue #268) — idea title and description, program office, and the audience
// and withholding answers form mode also requires. They sit on the record so a
// guided submitter can finish them without switching to form mode. Which ones
// appear follows the same `isFieldVisible` rule the readiness gate uses.

import type { ReactNode } from "react"
import { Textarea } from "@/components/ui/textarea"
import { fieldLabel } from "@/components/launchpad/chat-panel"
import { isFieldVisible } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import type { FormData } from "@/lib/steps"

type Props = {
  formData: FormData
  onFieldChange: (patch: Partial<FormData>) => void
}

const USERS_IMPACTED = [
  { value: "lt_10", label: "Fewer than 10" },
  { value: "10_50", label: "10–50" },
  { value: "50_500", label: "50–500" },
  { value: "gt_500", label: "More than 500" },
]

const WITHHOLD = [
  { value: "no", label: "No — can be released publicly" },
  { value: "yes_risk_to_disclosure", label: "Yes — risk to disclosure" },
  { value: "yes_disclosure_prohibited", label: "Yes — disclosure prohibited by law" },
  { value: "other", label: "Other — must stay internal" },
]

const SELECT_CLASS = "w-full rounded-md border border-input bg-white px-3 py-2 text-sm"

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  )
}

export function IntakeDetailsEditor({ formData, onFieldChange }: Props) {
  const tenant = getTenant()
  const show = (k: keyof FormData) => isFieldVisible(k, formData)

  const select = (key: keyof FormData, options: { value: string; label: string }[], label: string) => (
    <Row id={`details-${key}`} label={label}>
      <select
        id={`details-${key}`}
        className={SELECT_CLASS}
        value={String(formData[key] ?? "")}
        onChange={(e) => onFieldChange({ [key]: e.target.value } as Partial<FormData>)}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Row>
  )

  return (
    <div className="space-y-3" data-testid="intake-details">
      {show("useCaseTitle") && (
        <Row id="details-useCaseTitle" label={fieldLabel("useCaseTitle")}>
          <input
            id="details-useCaseTitle"
            className={SELECT_CLASS}
            value={formData.useCaseTitle}
            onChange={(e) => onFieldChange({ useCaseTitle: e.target.value })}
          />
        </Row>
      )}
      {show("useCaseDescription") && (
        <Row id="details-useCaseDescription" label={fieldLabel("useCaseDescription")}>
          <Textarea
            id="details-useCaseDescription"
            rows={2}
            value={formData.useCaseDescription}
            onChange={(e) => onFieldChange({ useCaseDescription: e.target.value })}
          />
        </Row>
      )}
      {show("submitterOffice") &&
        select("submitterOffice", tenant.unit.options, tenant.unit.label)}
      {show("targetAudience") && select("targetAudience", tenant.targetAudiences, fieldLabel("targetAudience"))}
      {show("impactedUsersCount") && select("impactedUsersCount", USERS_IMPACTED, fieldLabel("impactedUsersCount"))}
      {show("targetUserContext") && (
        <Row id="details-targetUserContext" label={fieldLabel("targetUserContext")}>
          <Textarea
            id="details-targetUserContext"
            rows={2}
            value={formData.targetUserContext}
            onChange={(e) => onFieldChange({ targetUserContext: e.target.value })}
          />
        </Row>
      )}
      {show("isWithheld") && select("isWithheld", WITHHOLD, fieldLabel("isWithheld"))}
    </div>
  )
}
