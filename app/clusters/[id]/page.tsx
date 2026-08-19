"use client"

// RD-4: the dedicated duplicate-cluster page (mock A2 Cluster,
// docs/design/Direction A - Guided review.dc.html). DIVERGENCES.md item 4:
// the dashboard path ("Open the cluster") lands here; the reviewer path
// reaches the same decision inside the review process (RD-6, issue #206),
// reusing the pieces this page exports from components/clusters/.
// Guarded like /decisions — same admin/reviewer role gate, no separate check.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { RequireAuth } from "@/components/auth/require-auth"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { getSession } from "@/lib/auth"
import { getDashboardScope } from "@/lib/dashboard/scope"
import { clusterDuplicates, getRationalization } from "@/lib/rationalization"
import { ClusterHeader } from "@/components/clusters/cluster-header"
import { PlumbClusterRecommendation } from "@/components/clusters/plumb-cluster-recommendation"
import { ClusterSignals } from "@/components/clusters/cluster-signals"
import { ClusterMembers } from "@/components/clusters/cluster-members"
import { ClusterDecision } from "@/components/clusters/cluster-decision"

function ClusterNotFound({ breadcrumb }: { breadcrumb: string }) {
  return (
    <DashboardShell
      baseScope={getDashboardScope(getSession())}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb={breadcrumb}
    >
      <div className="flex flex-col items-center gap-2 rounded-md border border-border-subtle bg-card px-6 py-14 text-center">
        <p className="font-heading text-base font-bold text-foreground">Cluster not found</p>
        <p className="max-w-[40ch] text-[13.5px] text-muted-foreground">
          This duplicate cluster doesn&apos;t exist, or it&apos;s already been resolved.
        </p>
        <Link href="/home" className="mt-2 text-[13px] font-semibold text-primary hover:underline">
          Back to home
        </Link>
      </div>
    </DashboardShell>
  )
}

function ClusterPageInner({ id }: { id: string }) {
  const { loaded, refetchSubmissions } = useDataProvider()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  useEffect(() => {
    if (loaded) setSubmissions(getSubmissions())
  }, [loaded])

  const breadcrumb = `Duplicate cluster ${id.slice(0, 8)}`

  if (!loaded) return null

  const clusters = clusterDuplicates(submissions)
  const cluster = clusters.find((c) => c.id === id)
  if (!cluster) return <ClusterNotFound breadcrumb={breadcrumb} />

  const byId = new Map(submissions.map((s) => [s.id, s]))
  const members = cluster.memberIds.map((memberId) => byId.get(memberId)).filter((s): s is Submission => !!s)
  const decision = members.map(getRationalization).find((r) => r?.clusterId === cluster.id)
  const currentLeadId = decision?.leadSubmissionId || selectedLeadId || cluster.memberIds[0]

  const reload = async () => {
    await refetchSubmissions()
    setSubmissions(getSubmissions())
  }

  return (
    <DashboardShell
      baseScope={getDashboardScope(getSession())}
      hierarchy={{ bureaus: [] }}
      selection={null}
      onSelect={() => {}}
      breadcrumb={breadcrumb}
    >
      <div className="space-y-6">
        <ClusterHeader cluster={cluster} members={members} decision={decision} />

        <div className="flex flex-col items-stretch gap-4 lg:flex-row">
          <PlumbClusterRecommendation members={members} />
          <ClusterSignals members={members} maxSimilarity={cluster.maxSimilarity} />
        </div>

        <ClusterMembers
          members={members}
          currentLeadId={currentLeadId}
          decided={!!decision}
          onSelectLead={setSelectedLeadId}
        />

        <ClusterDecision cluster={cluster} members={members} decision={decision} leadId={currentLeadId} onDecided={reload} />
      </div>
    </DashboardShell>
  )
}

export default function ClusterPage() {
  const params = useParams()
  const id = String(params?.id || "")
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <ClusterPageInner id={id} />
    </RequireAuth>
  )
}
