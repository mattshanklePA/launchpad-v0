// The readiness assessment `assessReadiness` returns when the model is
// unavailable (app/actions.ts). It lives here, not there, because that file is
// "use server" and outside the vitest include globs — same reason
// lib/scoutPrompt.ts and lib/scoutFieldPlan.ts were pulled out.
//
// ES2-14: the fallback returns `findings` too, so the mock path renders the
// same shape as the real one and the demo never falls back to a bare
// paragraph. Its one finding matches its own prose.

import type { FormData } from "@/lib/steps"
import type { ReadinessFinding } from "@/lib/readinessPresentation"
import { getTenant } from "@/lib/tenant"

export type ReadinessAssessment = {
  readinessScore: "ready" | "needs_work" | "early_stage"
  readinessSummary: string
  executiveSummary: string
  findings: ReadinessFinding[]
}

export function readinessFallback(formData: FormData): ReadinessAssessment {
  const tenant = getTenant()
  return {
    readinessScore: "needs_work",
    readinessSummary:
      "This idea has a clear problem statement and target users, but the expected user and business benefit could use more specificity before a reviewer starts vetting it.",
    executiveSummary: `"${formData.useCaseTitle || "Untitled Idea"}" proposes an AI-driven approach to improve operations for ${tenant.shortName} staff. The idea targets a real operational pain point, but the expected benefit needs more detail before it's ready for a reviewer to vet.`,
    findings: [
      {
        step: 3,
        message:
          "Name the specific user and business benefit you expect, with the number or baseline it would move.",
      },
    ],
  }
}
