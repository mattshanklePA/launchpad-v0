"use client"
import { useForm } from "@/context/form-context"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function Step1SubmitterInfo() {
  const { formData, setFormData } = useForm()

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="submitterName">Name</Label>
          <Input
            id="submitterName"
            value={formData.submitterName}
            onChange={(e) => setFormData((prev) => ({ ...prev, submitterName: e.target.value }))}
            placeholder="e.g., Jane Doe"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="submitterEmail">Email</Label>
          <Input
            id="submitterEmail"
            type="email"
            value={formData.submitterEmail}
            onChange={(e) => setFormData((prev) => ({ ...prev, submitterEmail: e.target.value }))}
            placeholder="e.g., jane.doe@uspto.gov"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <SelectItem value="patent_examiner">Patent Examiner</SelectItem>
              <SelectItem value="trademark_examiner">Trademark Examiner</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="it_staff">IT Staff</SelectItem>
              <SelectItem value="product_owner">Product Owner</SelectItem>
              <SelectItem value="lead_product_owner">Lead Product Owner</SelectItem>
              <SelectItem value="developer">Developer</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="submitterOffice">Business Unit</Label>
          <Select
            value={formData.submitterOffice}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, submitterOffice: value as any }))}
          >
            <SelectTrigger id="submitterOffice">
              <SelectValue placeholder="Select your business unit..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="patents">Patents</SelectItem>
              <SelectItem value="trademarks">Trademarks</SelectItem>
              <SelectItem value="ocio">OCIO (Chief Information Officer)</SelectItem>
              <SelectItem value="ocfo">OCFO (Chief Financial Officer)</SelectItem>
              <SelectItem value="ogc">OGC (General Counsel)</SelectItem>
              <SelectItem value="opia">OPIA (Policy &amp; International Affairs)</SelectItem>
              <SelectItem value="hr">Office of Human Resources</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
