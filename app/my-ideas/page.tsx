"use client"

// "Personal" in the Command Center sidebar (F3-6 item 1): the signed-in
// person's own ideas, for any role. A submitter's /home is this same view.

import { RequireAuth } from "@/components/auth/require-auth"
import { PersonalDashboard } from "@/components/dashboard/personal-dashboard"

export default function MyIdeasPage() {
  return (
    <RequireAuth requireRole={["admin", "reviewer", "submitter"]}>
      <PersonalDashboard />
    </RequireAuth>
  )
}
