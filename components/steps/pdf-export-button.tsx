"use client"

import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import type { FormData } from "@/lib/steps"
import { generateSubmissionPDF } from "@/lib/pdfGenerator"

type Props = {
  formData: FormData
  variant?: "outline" | "secondary" | "default"
  size?: "default" | "sm" | "lg"
  label?: string
}

export function PDFExportButton({
  formData,
  variant = "outline",
  size = "default",
  label = "Export to PDF",
}: Props) {
  return (
    <Button variant={variant} size={size} onClick={() => generateSubmissionPDF(formData)}>
      <FileDown className="mr-2 h-4 w-4" /> {label}
    </Button>
  )
}
