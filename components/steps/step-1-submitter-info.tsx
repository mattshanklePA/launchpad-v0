"use client"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFieldVisibility } from "@/lib/formConfig"
import { getTenant } from "@/lib/tenant"

export function Step1SubmitterInfo() {
  const { formData, setFormData } = useForm()
  const isVisible = useFieldVisibility()

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
                <SelectItem value="patent_examiner">Operations / Staff Officer</SelectItem>
                <SelectItem value="trademark_examiner">Analyst</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="it_staff">IT Staff</SelectItem>
                <SelectItem value="product_owner">Product Owner</SelectItem>
                <SelectItem value="lead_product_owner">Lead Product Owner</SelectItem>
                <SelectItem value="developer">Developer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {isVisible("submitterOffice") && (
          <div className="space-y-2">
            <Label htmlFor="submitterOffice">{getTenant().unit.label}</Label>
            <Select
              value={formData.submitterOffice}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, submitterOffice: value as any }))}
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
      </div>
    </div>
  )
}
