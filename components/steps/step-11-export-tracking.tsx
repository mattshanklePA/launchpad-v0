"use client"
import { useForm } from "@/context/form-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Rocket, Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { PDFExportButton } from "@/components/steps/pdf-export-button"
import { getTenant } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import { SubmitBandContent } from "@/components/cockpit"

export function Step11ExportTracking() {
  const { formData, resetForm } = useForm()
  const router = useRouter()
  // "View in Rally" only applies to tenants with a Rally integration
  // (`TenantConfig.features.rallyExport` — on for USPTO, off for DoW, DoC and
  // es2), the same flag step 10's route options respect. Rendering the button
  // disabled still put another customer's connector on the screen every intake
  // ends on (ES2-13).
  const tenant = getTenant()

  const handleReturnToDashboard = () => {
    resetForm()
    router.push("/")
  }

  const handleStartNewIdea = () => {
    resetForm()
    // resetForm sets currentStep back to 1, no navigation needed —
    // the FormContainer will re-render Step 1 automatically.
  }

  if (tenant.features.cockpitLook) {
    const status = formData.routeTo.includes("draft") ? "Draft" : "Under Review"
    return (
      <div data-cockpit="submit-sent" className="flex flex-col">
        <SubmitBandContent eyebrow={tenantCopy(tenant).submitSentEyebrow.toUpperCase()} title="Idea Submitted for Vetting!" />
        <div className="flex w-full flex-col gap-6">
          <p className="m-0 text-[14px] text-[var(--ks-ink-700)]">
            Your AI idea has been submitted. The review team will vet it for feasibility, value, and strategic alignment.
          </p>
          <section className="border border-[var(--ks-limestone-dark)] bg-white p-6">
            <h2 className="ks-section-head m-0 text-[var(--ks-ink-900)]">What Happens Next</h2>
            <p className="mt-2 text-[14px] text-[var(--ks-ink-700)]">
              Your idea is now marked as: <span className="font-bold text-[var(--ks-ink-900)]">{status}</span>
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <PDFExportButton formData={formData} variant="secondary" label="Download Submission as PDF" />
            </div>
          </section>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={handleStartNewIdea}>
              <Plus className="mr-2 h-4 w-4" />
              Start a New Idea
            </Button>
            <Button variant="link" onClick={handleReturnToDashboard}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      <h1 className="text-3xl font-bold mb-2">Idea Submitted for Vetting!</h1>
      <p className="text-muted-foreground mb-8">Your AI idea has been submitted. The review team will vet it for feasibility, value, and strategic alignment.</p>
      <Card>
        <CardHeader>
          <CardTitle>What Happens Next</CardTitle>
          <CardDescription>
            Your idea is now marked as:{" "}
            <span className="font-semibold text-primary">
              {formData.routeTo.includes("draft") ? "Draft" : "Under Review"}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 justify-center">
          <PDFExportButton formData={formData} variant="secondary" label="Download Submission as PDF" />
          {tenant.features.rallyExport && (
            <Button disabled>
              <Rocket className="mr-2 h-4 w-4" /> View in Rally
            </Button>
          )}
        </CardContent>
      </Card>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
        <Button variant="outline" onClick={handleStartNewIdea}>
          <Plus className="mr-2 h-4 w-4" />
          Start a New Idea
        </Button>
        <Button variant="link" onClick={handleReturnToDashboard}>
          Return to Dashboard
        </Button>
      </div>
      </div>
  )
}
