"use client"
import { useState } from "react"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFieldVisibility } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"
import { Field, StepCard } from "./step-frame"

export function Step1SubmitterInfo() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)

  // Dependent dropdown: only bureaus that declare `offices` show one, and it
  // resets whenever the bureau changes to a bureau without a matching office.
  const selectedUnit = getTenant().unit.options.find((o) => o.value === formData.submitterOffice)
  const offices = selectedUnit?.offices || []

  const sponsorVisible = isVisible("sponsorName") || isVisible("sponsorRole") || isVisible("sponsorEmail")
  const hasSponsorValue = Boolean(
    formData.sponsorName.trim() || formData.sponsorRole.trim() || formData.sponsorEmail.trim(),
  )
  // Collapsed behind a link by default — open on arrival only when a sponsor
  // value already exists, so returning to a draft never hides data.
  const [sponsorOpen, setSponsorOpen] = useState(hasSponsorValue)

  return (
    <StepCard>
      <div className="flex flex-wrap gap-5">
        {isVisible("submitterName") && (
          <Field label="Name" htmlFor="submitterName" hint="From your session." className="min-w-[260px] flex-1">
            <Input
              id="submitterName"
              value={formData.submitterName}
              onChange={(e) => setFormData((prev) => ({ ...prev, submitterName: e.target.value }))}
              placeholder="e.g., Jane Doe"
            />
          </Field>
        )}
        {isVisible("submitterEmail") && (
          <Field label="Email" htmlFor="submitterEmail" className="min-w-[260px] flex-1">
            <Input
              id="submitterEmail"
              type="email"
              value={formData.submitterEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, submitterEmail: e.target.value }))}
              // Same defect as the sponsor field below, one row up: a hardcoded
              // army.mil address on every non-DoW instance (ES2-11).
              placeholder={`e.g., ${getTenant().loginEmailPlaceholder}`}
            />
          </Field>
        )}
      </div>
      <div className="flex flex-wrap gap-5">
        {isVisible("submitterRole") && (
          <Field label="Role" htmlFor="submitterRole" className="min-w-[260px] flex-1">
            <Select
              value={formData.submitterRole}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, submitterRole: value as any }))}
            >
              <SelectTrigger id="submitterRole">
                <SelectValue placeholder="Select your role..." />
              </SelectTrigger>
              <SelectContent>
                {getTenant().submitterRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {isVisible("submitterOffice") && (
          <Field label={getTenant().unit.label} htmlFor="submitterOffice" className="min-w-[260px] flex-1">
            <Select
              value={formData.submitterOffice}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, submitterOffice: value as any, submitterSubOffice: "" }))
              }
            >
              <SelectTrigger id="submitterOffice">
                <SelectValue placeholder={`Select your ${getTenant().unit.label.toLowerCase()}...`} />
              </SelectTrigger>
              <SelectContent>
                {getTenant().unit.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        {isVisible("submitterSubOffice") && offices.length > 0 && (
          <Field label={getTenant().tierLabels.subUnit} htmlFor="submitterSubOffice" className="min-w-[260px] flex-1">
            <Select
              value={formData.submitterSubOffice}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, submitterSubOffice: value as any }))}
            >
              <SelectTrigger id="submitterSubOffice">
                <SelectValue placeholder={`Select your ${getTenant().tierLabels.subUnit.toLowerCase()} (optional)...`} />
              </SelectTrigger>
              <SelectContent>
                {offices.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      {sponsorVisible && !sponsorOpen && (
        <div className="flex items-center justify-between gap-4 rounded-md border border-dashed border-border bg-card px-5 py-3.5">
          <p className="text-[13.5px] text-foreground">
            Submitting on someone else&apos;s behalf?{" "}
            <span className="text-muted-foreground">Add a sponsor, optional.</span>
          </p>
          <button
            type="button"
            onClick={() => setSponsorOpen(true)}
            className="text-[13px] font-semibold text-primary hover:underline"
          >
            Add sponsor
          </button>
        </div>
      )}

      {sponsorVisible && sponsorOpen && (
        <div className="space-y-4 border-t border-border-subtle pt-5">
          <p className="text-[13.5px] font-semibold text-foreground">Client sponsor</p>
          <p className="text-[12.5px] text-muted-foreground">
            Leave blank if you are your own sponsor. Fill this in if someone else is sponsoring this idea.
          </p>
          <div className="flex flex-wrap gap-5">
            {isVisible("sponsorName") && (
              <Field label="Sponsor name" htmlFor="sponsorName" className="min-w-[220px] flex-1">
                <Input
                  id="sponsorName"
                  value={formData.sponsorName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sponsorName: e.target.value }))}
                  placeholder="e.g., Jonathan Smith"
                />
              </Field>
            )}
            {isVisible("sponsorRole") && (
              <Field label="Sponsor role" htmlFor="sponsorRole" className="min-w-[220px] flex-1">
                <Input
                  id="sponsorRole"
                  value={formData.sponsorRole}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sponsorRole: e.target.value }))}
                  placeholder="e.g., Director of Operations"
                />
              </Field>
            )}
            {isVisible("sponsorEmail") && (
              <Field label="Sponsor email" htmlFor="sponsorEmail" className="min-w-[220px] flex-1">
                <Input
                  id="sponsorEmail"
                  type="email"
                  value={formData.sponsorEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sponsorEmail: e.target.value }))}
                  // Reuses the tenant's own example address (#186) rather than
                  // hardcoding one org's domain on every other org's screen.
                  placeholder={`e.g., ${getTenant().loginEmailPlaceholder}`}
                />
              </Field>
            )}
          </div>
        </div>
      )}
    </StepCard>
  )
}
