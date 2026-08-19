"use client"

// RD-5 (issue #206): wraps SubmissionDetail in the Keystone shell (RD-0) the
// same way RD-4's cluster page does — breadcrumb "Command Center / {unit
// short} / {submission short id}". There is no ES-#### id (see
// docs/design/handoff/DIVERGENCES.md item 5), so the breadcrumb's short id
// is the (truncated) use-case title, not a bare id fragment — the header
// card's own eyebrow uses the id's leading 8 characters instead (mirrors RD-4's
// cluster breadcrumb), since a code-like fragment there doesn't collide with
// the title rendered right below it the way it would in a one-line breadcrumb.
// No role restriction: unlike /clusters, a submitter also views this page
// (their own submission, to reply in the conversation thread).

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getDashboardScope } from "@/lib/dashboard/scope"
import { getBusinessUnit } from "@/lib/reviewWorkflow"
import { shortBusinessUnitLabel, truncateTitle } from "@/components/dashboard/command-center-data"
import { SubmissionDetail } from "@/components/submissions/submission-detail"

function SubmissionDetailPageInner({ id }: { id: string }) {
  const { loaded } = useDataProvider()
  const [sub, setSub] = useState<Submission | null>(null)

  useEffect(() => {
    if (loaded) setSub(getSubmissions().find((s) => s.id === id) || null)
  }, [loaded, id])

  const breadcrumb = sub
    ? `${shortBusinessUnitLabel(getBusinessUnit(sub))} / ${truncateTitle(sub.formData.useCaseTitle || "Untitled idea")}`
    : "Submission"

  return (
    <DashboardShell
      baseScope={getDashboardScope(getSession())}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb={breadcrumb}
    >
      <SubmissionDetail id={id} />
    </DashboardShell>
  )
}

export default function SubmissionDetailPage() {
  const params = useParams()
  const id = String(params?.id || "")
  return (
    <RequireAuth>
      <SubmissionDetailPageInner id={id} />
    </RequireAuth>
  )
}
