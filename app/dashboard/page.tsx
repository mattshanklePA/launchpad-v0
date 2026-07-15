"use client"

// Temporary admin-gated preview route for the Department Dashboard (CC-4).
// Not linked from any nav and does NOT repoint /home — that cutover is CC-6.
// Gated to admin viewers whose dashboard scope resolves to "department"
// (lib/dashboard/scope.ts's getDashboardScope): the Office of the Secretary
// or a department-level admin with no bureau assignment. A bureau/office-
// scoped admin or any non-admin is redirected to /home rather than seeing a
// partial or wrong-scope department view.

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { RequireAuth } from "@/components/auth/require-auth"
import { Header } from "@/components/layout/header"
import { getSession } from "@/lib/auth"
import { getDashboardScope } from "@/lib/dashboard/scope"
import { DepartmentDashboard } from "@/components/dashboard/department-dashboard"

function DashboardPreviewInner() {
  const router = useRouter()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const session = getSession()
    if (getDashboardScope(session).level !== "department") {
      router.replace("/home")
      return
    }
    setAllowed(true)
  }, [router])

  if (!allowed) return <div className="min-h-screen bg-gray-50" />

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container py-8">
        <DepartmentDashboard />
      </div>
    </div>
  )
}

export default function DashboardPreviewPage() {
  return (
    <RequireAuth requireRole={["admin"]}>
      <DashboardPreviewInner />
    </RequireAuth>
  )
}
