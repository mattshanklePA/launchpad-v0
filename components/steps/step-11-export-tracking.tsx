"use client"
import { useForm } from "@/context/form-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, FileDown, Rocket } from "lucide-react"
import Link from "next/link"

export function Step11ExportTracking() {
  const { formData } = useForm()

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
          <Button variant="secondary">
            <FileDown className="mr-2 h-4 w-4" /> Export to PDF
          </Button>
          <Button disabled>
            <Rocket className="mr-2 h-4 w-4" /> View in Rally
          </Button>
        </CardContent>
      </Card>
      <Button asChild variant="link" className="mt-8">
        <Link href="/">Return to Dashboard</Link>
      </Button>
    </div>
  )
}
