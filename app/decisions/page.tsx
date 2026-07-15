"use client"

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DecisionCenter } from "@/components/admin/decision-center"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { visibleSubmissions } from "@/lib/reviewWorkflow"
import { getSession } from "@/lib/auth"
import { getDashboardScope } from "@/lib/dashboard/scope"

function DecisionsPageInner() {
  const { loaded } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    if (loaded) {
      const s = getSession()
      const viewer = s ? { role: s.role, email: s.email, businessUnit: s.businessUnit, office: s.office } : null
      setSubmissions(visibleSubmissions(getSubmissions(), viewer))
    }
  }, [loaded])

  return (
    <DashboardShell
      baseScope={getDashboardScope(getSession())}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb="Decision Center"
    >
      <DecisionCenter submissions={submissions} headingLevel="h1" />
    </DashboardShell>
  )
}

export default function DecisionsPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <DecisionsPageInner />
    </RequireAuth>
  )
}
