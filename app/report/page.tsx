// /report: the executive AI portfolio report (F5-2, #319). Server component so
// that with the switch off the visitor gets the normal not-found page, with no
// report code sent to the browser. The screen itself is a client component.

import { notFound } from "next/navigation"
import { getTenant } from "@/lib/tenant"
import { ReportScreen } from "@/components/report/report-screen"

export default function ReportPage() {
  if (!getTenant().features.portfolioReport) notFound()
  return <ReportScreen />
}
