// Branded LaunchPad PDF generator.
// Produces a multi-page PDF with a tenant-branded header band, exec summary
// callout, per-section blocks with side badges, key-functionality bullets,
// focus-area chips, and a readiness assessment banner.

import { jsPDF } from "jspdf"
import { SUBMITTER_ROLE_LABELS, type FormData } from "@/lib/steps"
import { getTenant, getOrgNameForUnit } from "@/lib/tenant"

const USPTO_BLUE_PRIMARY: [number, number, number] = [53, 94, 147]
const USPTO_BLUE_SECONDARY: [number, number, number] = [37, 66, 103]
const USPTO_BLUE_TINT: [number, number, number] = [235, 239, 245]
const READY_GREEN: [number, number, number] = [22, 163, 74]
const NEEDS_AMBER: [number, number, number] = [217, 119, 6]
const EARLY_RED: [number, number, number] = [220, 38, 38]
const GRAY_500: [number, number, number] = [107, 114, 128]
const GRAY_200: [number, number, number] = [229, 231, 235]
const TEXT: [number, number, number] = [33, 33, 33]

function fmt(v: unknown): string {
  if (Array.isArray(v)) return v.length > 0 ? v.join(", ") : "—"
  return typeof v === "string" && v.trim() !== "" ? v : "—"
}

function readinessColor(s?: string): [number, number, number] {
  if (s === "ready") return READY_GREEN
  if (s === "needs_work") return NEEDS_AMBER
  if (s === "early_stage") return EARLY_RED
  return GRAY_500
}

function readinessLabel(s?: string): string {
  if (s === "ready") return "Ready for Review"
  if (s === "needs_work") return "Needs Work"
  if (s === "early_stage") return "Early Stage"
  return "Not Assessed"
}

function officeLabel(o?: string): string {
  if (!o) return "Unknown"
  return getTenant().unit.options.find((opt) => opt.value === o)?.label || o
}

function roleLabel(r?: string): string {
  if (!r) return "Unknown"
  return SUBMITTER_ROLE_LABELS[r] || r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

function rangeLabel(v: string | undefined, suffix: string): string | undefined {
  if (!v) return undefined
  return `${v.replace(/_/g, "–")} ${suffix}`.trim()
}

export function generateSubmissionPDF(formData: FormData) {
  const tenant = getTenant()
  const doc = new jsPDF({ unit: "pt", format: "letter" })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = 0

  // Header band
  doc.setFillColor(...USPTO_BLUE_PRIMARY)
  doc.rect(0, 0, pageW, 72, "F")
  doc.setTextColor(255, 255, 255)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(20)
  doc.text(tenant.productName, margin, 36)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(11)
  doc.text("AI Use Case Submission", margin, 54)
  doc.setFontSize(9)
  const date = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
  doc.text(date, pageW - margin, 54, { align: "right" })
  y = 96

  // Title block
  doc.setTextColor(...TEXT)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(22)
  const titleLines = doc.splitTextToSize(formData.useCaseTitle || "Untitled AI Use Case", pageW - 2 * margin)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 24 + 4

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.setTextColor(...GRAY_500)
  const sub = `${formData.submitterName || "Anonymous"}  ·  ${roleLabel(formData.submitterRole)}  ·  ${officeLabel(formData.submitterOffice)}`
  doc.text(sub, margin, y)
  y += 16

  if (formData.readinessScore) {
    const c = readinessColor(formData.readinessScore)
    const lab = readinessLabel(formData.readinessScore)
    doc.setFillColor(...c)
    doc.setFontSize(9)
    doc.setFont("helvetica", "bold")
    const w = doc.getTextWidth(lab) + 16
    doc.roundedRect(margin, y, w, 18, 3, 3, "F")
    doc.setTextColor(255, 255, 255)
    doc.text(lab, margin + 8, y + 12)
    y += 28
  } else {
    y += 6
  }

  // Exec summary callout
  if (formData.executiveSummary && formData.executiveSummary.trim()) {
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(formData.executiveSummary, pageW - 2 * margin - 24)
    const boxH = 32 + lines.length * 12
    doc.setFillColor(...USPTO_BLUE_TINT)
    doc.roundedRect(margin, y, pageW - 2 * margin, boxH, 4, 4, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...USPTO_BLUE_PRIMARY)
    doc.text("EXECUTIVE SUMMARY", margin + 12, y + 16)
    doc.setFont("helvetica", "italic")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(lines, margin + 12, y + 30)
    y += boxH + 16
  }

  // Section renderer
  const section = (title: string, body: string, badge?: string) => {
    if (y > pageH - 100) { doc.addPage(); y = margin + 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(...USPTO_BLUE_PRIMARY)
    doc.text(title, margin, y)
    if (badge) {
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      const bw = doc.getTextWidth(badge) + 14
      doc.setFillColor(...GRAY_200)
      doc.roundedRect(pageW - margin - bw, y - 11, bw, 14, 2, 2, "F")
      doc.setTextColor(60, 60, 60)
      doc.text(badge, pageW - margin - 7, y - 1, { align: "right" })
    }
    y += 6
    doc.setDrawColor(...USPTO_BLUE_SECONDARY)
    doc.setLineWidth(0.6)
    doc.line(margin, y, pageW - margin, y)
    y += 10
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    const lines = doc.splitTextToSize(body || "—", pageW - 2 * margin)
    doc.text(lines, margin, y)
    y += lines.length * 12 + 14
  }

  const bullets = (label: string, items?: string[]) => {
    if (!items || items.length === 0) return
    if (y > pageH - 80) { doc.addPage(); y = margin + 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY_500)
    doc.text(label, margin, y)
    y += 12
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    items.forEach((it) => {
      const ls = doc.splitTextToSize(`•  ${it}`, pageW - 2 * margin - 14)
      doc.text(ls, margin + 12, y)
      y += ls.length * 12 + 2
    })
    y += 8
  }

  const chips = (label: string, items?: string[]) => {
    if (!items || items.length === 0) return
    if (y > pageH - 60) { doc.addPage(); y = margin + 20 }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...GRAY_500)
    doc.text(label, margin, y)
    y += 12
    doc.setFontSize(8)
    doc.setFont("helvetica", "normal")
    let x = margin
    items.forEach((it) => {
      const cw = doc.getTextWidth(it) + 14
      if (x + cw > pageW - margin) { x = margin; y += 18 }
      doc.setFillColor(...USPTO_BLUE_TINT)
      doc.roundedRect(x, y - 9, cw, 14, 2, 2, "F")
      doc.setTextColor(...USPTO_BLUE_PRIMARY)
      doc.text(it, x + 7, y + 1)
      x += cw + 4
    })
    y += 20
  }

  // Body sections
  section("Target Users", fmt(formData.targetUserSummary || formData.targetUserContext),
    formData.impactedUsersCount ? `${formData.impactedUsersCount.replace(/_/g, "–")} users impacted` : undefined)
  section("Problem Statement", fmt(formData.problemDefinition || formData.coreProblem),
    formData.severity ? `${formData.severity.charAt(0).toUpperCase() + formData.severity.slice(1)} severity` : undefined)
  section("Proposed Solution", fmt(formData.solutionSummary || formData.proposedSolution))
  bullets("Key functionality", formData.keyFunctionality)
  section("User Value", fmt(formData.userValueSummary || formData.userValue), rangeLabel(formData.userTimeSavings, "hrs saved"))
  bullets("Other user improvements", formData.otherUserImprovements)
  section("Business Value", fmt(formData.businessValueSummary || formData.businessValue), rangeLabel(formData.costSavings, "savings"))
  bullets("Strategic benefits", formData.strategicBenefit)
  section(`Strategic Alignment with ${getOrgNameForUnit(formData.submitterOffice)} Priorities`, fmt(formData.alignmentSummary || formData.relevantOkrs))
  chips("Strategic focus areas", formData.usptoFocusArea)
  section("Feasibility & Security", fmt(formData.feasibilitySummary || formData.dependencies),
    formData.implementationComplexity ? `${formData.implementationComplexity.charAt(0).toUpperCase() + formData.implementationComplexity.slice(1)} complexity` : undefined)
  bullets("Resources needed", formData.resourcesNeeded)
  bullets("Access control requirements", formData.accessControlRequirements)
  section("Success Metrics", fmt(formData.metricsSummary || formData.successMetrics), rangeLabel(formData.timelineForResults, "mo timeline"))
  bullets("Key metrics tracked", formData.keyMetrics)

  // Readiness banner
  if (formData.readinessSummary && formData.readinessSummary.trim()) {
    if (y > pageH - 100) { doc.addPage(); y = margin + 20 }
    const c = readinessColor(formData.readinessScore)
    const lines = doc.splitTextToSize(formData.readinessSummary, pageW - 2 * margin - 28)
    const boxH = 36 + lines.length * 12
    doc.setFillColor(...c)
    doc.rect(margin, y, 4, boxH, "F")
    doc.setFillColor(250, 250, 250)
    doc.rect(margin + 4, y, pageW - 2 * margin - 4, boxH, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9)
    doc.setTextColor(...c)
    doc.text(`AI READINESS ASSESSMENT — ${readinessLabel(formData.readinessScore).toUpperCase()}`, margin + 14, y + 16)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.setTextColor(...TEXT)
    doc.text(lines, margin + 14, y + 32)
    y += boxH + 16
  }

  // Footer on every page
  const total = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...GRAY_200)
    doc.setLineWidth(0.5)
    doc.line(margin, pageH - 32, pageW - margin, pageH - 32)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...GRAY_500)
    doc.text(`${tenant.productName} — ${tenant.logoSubtitle}`, margin, pageH - 18)
    doc.text(`Page ${i} of ${total}`, pageW - margin, pageH - 18, { align: "right" })
  }

  const slug = (formData.useCaseTitle || "untitled-idea")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  doc.save(`launchpad-${slug || "submission"}.pdf`)
}
