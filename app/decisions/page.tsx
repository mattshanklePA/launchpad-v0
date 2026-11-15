"use client"

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { DecisionCenter, decisionHeadline } from "@/components/admin/decision-center"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { decisionCenterCandidates } from "@/lib/decisionCenter"
import { getSession } from "@/lib/auth"
import { getDashboardScope } from "@/lib/dashboard/scope"
import { getTenant } from "@/lib/tenant"

function DecisionsPageInner() {
  const { loaded } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    if (loaded) {
      const s = getSession()
      const viewer = s ? { role: s.role, email: s.email, businessUnit: s.businessUnit, office: s.office } : null
      setSubmissions(decisionCenterCandidates(getSubmissions(), viewer))
    }
  }, [loaded])

  return (
    <DashboardShell
      baseScope={getDashboardScope(getSession())}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb="Decision Center"
      title={getTenant().features.cockpitLook ? decisionHeadline(submissions.length) : undefined}
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
