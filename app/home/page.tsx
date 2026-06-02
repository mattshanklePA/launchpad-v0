"use client"

import { useEffect, useState } from "react"
import { RequireAuth } from "@/components/auth/require-auth"
import { Header } from "@/components/layout/header"
import { getSession } from "@/lib/auth"
import { SubmitterHome } from "@/components/home/submitter-home"
import { ReviewerHome } from "@/components/home/reviewer-home"

function HomeInner() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    setRole(getSession()?.role ?? null)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container py-8">
        {role === null ? null : role === "submitter" ? <SubmitterHome /> : <ReviewerHome />}
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <RequireAuth>
      <HomeInner />
    </RequireAuth>
  )
}
