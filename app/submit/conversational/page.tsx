"use client"

import { IntakeModeSurface } from "@/components/launchpad/intake-mode-surface"

// Nested under app/submit's layout (RequireAuth + FormProvider +
// DashboardShell, app/submit/layout.tsx), so this shares the exact same
// FormData/draft persistence as the step-by-step wizard at /submit — an idea
// started here can be finished there and vice versa, and a saved draft
// resumes with no special-cased logic (see conversational-intake.tsx).
//
// Forces the Guided mode on for this specific entry point (the dashboard's
// "Talk to <assistant>" link) regardless of the submitter's last remembered
// choice — the Guided/Form toggle (issue #170) is still right there to
// switch away from it, with no data loss either way.
export default function ConversationalIntakePage() {
  return <IntakeModeSurface forcedInitialMode="guided" />
}
