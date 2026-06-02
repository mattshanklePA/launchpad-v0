"use client"

import { RequireAuth } from "@/components/auth/require-auth"
import { Header } from "@/components/layout/header"
import { DecisionCenter } from "@/components/admin/decision-center"

export default function DecisionsPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer"]}>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container py-8">
          <DecisionCenter />
        </div>
      </div>
    </RequireAuth>
  )
}
