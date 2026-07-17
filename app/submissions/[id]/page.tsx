"use client"

import { useParams } from "next/navigation"
import { RequireAuth } from "@/components/auth/require-auth"
import { Header } from "@/components/layout/header"
import { SubmissionDetail } from "@/components/submissions/submission-detail"

export default function SubmissionDetailPage() {
  const params = useParams()
  const id = String(params?.id || "")
  return (
    <RequireAuth>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <SubmissionDetail id={id} />
        </main>
      </div>
    </RequireAuth>
  )
}
