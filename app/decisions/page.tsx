"use client"

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { Header } from "@/components/layout/header"
import { DecisionCenter } from "@/components/admin/decision-center"
import { useDataProvider } from "@/components/data-provider"
import { getSubmissions, type Submission } from "@/lib/submissions"
import { visibleSubmissions } from "@/lib/reviewWorkflow"
import { getSession } from "@/lib/auth"

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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container py-8">
        <DecisionCenter submissions={submissions} />
      </div>
    </div>
  )
}

export default function DecisionsPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <DecisionsPageInner />
    </RequireAuth>
  )
}
