"use client"
import { Button } from "@/components/ui/button"
import { FileDown } from "lucide-react"
import { jsPDF } from "jspdf"
import "jspdf-autotable" // Ensure you have this package
import { formSteps, type FormData } from "@/lib/steps"

// Extend jsPDF with autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

export function PDFExportButton({ formData }: { formData: FormData }) {
  const handleExport = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text("LaunchPad Business Case", 14, 22)
    doc.setFontSize(11)
    doc.setTextColor(100)
    doc.text(`Submission Date: ${new Date().toLocaleDateString()}`, 14, 30)

    const tableData = formSteps.slice(0, -1).map((step) => {
      let content = ""
      if (step.step === 1) {
        content = `Name: ${formData.submitterName}\nEmail: ${formData.submitterEmail}\nRole: ${formData.submitterRole}\nDepartment: ${formData.submitterDepartment}`
      } else {
        const fieldId = step.fields[0].id as keyof FormData
        content = formData[fieldId] as string
      }
      return [step.title, content || "N/A"]
    })

    doc.autoTable({
      startY: 40,
      head: [["Section", "Details"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [22, 163, 74] },
      didDrawCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
          doc.setFontSize(10)
        }
      },
    })

    doc.save("LaunchPad-Business-Case.pdf")
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <FileDown className="mr-2 h-4 w-4" /> Export to PDF
    </Button>
  )
}
