"use client"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFieldVisibility } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"

export function Step1SubmitterInfo() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility(formData)

  // Dependent dropdown: only bureaus that declare `offices` show one, and it
  // resets whenever the bureau changes to a bureau without a matching office.
  const selectedUnit = getTenant().unit.options.find((o) => o.value === formData.submitterOffice)
  const offices = selectedUnit?.offices || []

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isVisible("submitterName") && (
          <div className="space-y-2">
            <Label htmlFor="submitterName">Name</Label>
            <Input
              id="submitterName"
              value={formData.submitterName}
              onChange={(e) => setFormData((prev) => ({ ...prev, submitterName: e.target.value }))}
              placeholder="e.g., Jane Doe"
            />
          </div>
        )}
        {isVisible("submitterEmail") && (
          <div className="space-y-2">
            <Label htmlFor="submitterEmail">Email</Label>
            <Input
              id="submitterEmail"
              type="email"
              value={formData.submitterEmail}
              onChange={(e) => setFormData((prev) => ({ ...prev, submitterEmail: e.target.value }))}
              placeholder="e.g., jane.doe@army.mil"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isVisible("submitterRole") && (
          <div className="space-y-2">
            <Label htmlFor="submitterRole">Role</Label>
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
          </div>
        )}
        {isVisible("submitterOffice") && (
          <div className="space-y-2">
            <Label htmlFor="submitterOffice">{getTenant().unit.label}</Label>
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
          </div>
        )}
        {isVisible("submitterSubOffice") && offices.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="submitterSubOffice">{getTenant().tierLabels.subUnit}</Label>
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
          </div>
        )}
      </div>

      {(isVisible("sponsorName") || isVisible("sponsorRole") || isVisible("sponsorEmail")) && (
        <div className="space-y-2 border-t pt-6">
          <Label className="text-base font-semibold text-uspto-gray-text">Client sponsor</Label>
          <p className="text-sm text-muted-foreground">
            Leave blank if you are your own sponsor. Fill this in if someone else is sponsoring this idea.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {isVisible("sponsorName") && (
              <div className="space-y-2">
                <Label htmlFor="sponsorName">Sponsor name</Label>
                <Input
                  id="sponsorName"
                  value={formData.sponsorName}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sponsorName: e.target.value }))}
                  placeholder="e.g., Jonathan Smith"
                />
              </div>
            )}
            {isVisible("sponsorRole") && (
              <div className="space-y-2">
                <Label htmlFor="sponsorRole">Sponsor role</Label>
                <Input
                  id="sponsorRole"
                  value={formData.sponsorRole}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sponsorRole: e.target.value }))}
                  placeholder="e.g., Director of Operations"
                />
              </div>
            )}
            {isVisible("sponsorEmail") && (
              <div className="space-y-2">
                <Label htmlFor="sponsorEmail">Sponsor email</Label>
                <Input
                  id="sponsorEmail"
                  type="email"
                  value={formData.sponsorEmail}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sponsorEmail: e.target.value }))}
                  placeholder="e.g., jonathan.smith@uspto.gov"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
