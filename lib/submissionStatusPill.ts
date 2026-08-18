// Maps a submission's review status onto the Keystone DS's four-state status
// vocabulary (lib/statusTokens.ts) for StatusPill (components/ui/status-pill.tsx).
// Mirrors lib/reviewWorkflow.ts's statusBadgeClasses() mapping exactly, kept
// as a separate file (rather than exported from reviewWorkflow.ts) per RD-0's
// guardrail against changing that file (issue #201).

import type { SubmissionStatus } from "@/lib/reviewWorkflow"
import type { KeystoneStatus } from "@/lib/statusTokens"

export function submissionStatusPillStatus(status: SubmissionStatus): KeystoneStatus {
  switch (status) {
    case "in_review":
      return "attention"
    case "needs_info":
    case "rejected":
      return "alert"
    case "approved":
      return "healthy"
    case "submitted":
    case "draft":
    default:
      return "neutral"
  }
}
