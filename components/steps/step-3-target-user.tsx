"use client"
import { useForm } from "@/context/form-context"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TextareaAutosize from "react-textarea-autosize"
import { AIdChatPanel } from "@/components/launchpad/chat-panel"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Step3TargetUser() {
  const { formData, setFormData } = useForm()

  const handleSuggestion = (suggestion: string) => {
    setFormData((prev) => ({ ...prev, targetUserContext: suggestion }))
  }

  return (
    <TooltipProvider>
      <div className="grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <div className="rounded-lg border bg-white p-6 shadow-sm space-y-8 h-full">
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-uspto-gray-text">Define the Audience</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="targetAudience">Who is your primary audience?</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="impactedUsersCount">How many users are impacted?</Label>
                  <Select
                    value={formData.impactedUsersCount}
                    onValueChange={(value) => setFormData((prev) => ({ ...prev, impactedUsersCount: value as any }))}
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
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-uspto-gray-text">Identify Key Pain Points</h3>
              <TextareaAutosize
                id="painPoints"
                value={formData.painPoints}
                onChange={(e) => setFormData((prev) => ({ ...prev, painPoints: e.target.value }))}
                placeholder="Describe the key pain points your users are experiencing..."
                minRows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              />
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-uspto-gray-text">User Profile</h3>
              <TextareaAutosize
                id="targetUserContext"
                value={formData.targetUserContext}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetUserContext: e.target.value }))}
                placeholder="Add more details here..."
                minRows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-base"
              />
            </div>
          </div>
        </div>
        <div className="lg:col-span-5 flex flex-col">
          <AIdChatPanel step={3} onApplySuggestion={handleSuggestion} />
        </div>
      </div>
    </TooltipProvider>
  )
}
