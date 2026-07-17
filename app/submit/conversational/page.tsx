"use client"

import { ConversationalIntake } from "@/components/launchpad/conversational-intake"

// Nested under app/submit's layout (RequireAuth + FormProvider +
// DashboardShell, app/submit/layout.tsx), so this shares the exact same
// FormData/draft persistence as the step-by-step wizard at /submit — an idea
// started here can be finished there and vice versa, and a saved draft
// resumes with no special-cased logic (see conversational-intake.tsx).
export default function ConversationalIntakePage() {
  return <ConversationalIntake />
}
