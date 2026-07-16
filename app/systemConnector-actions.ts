"use server"

// Server action wiring the Decision Center's Approve button to the EXISTING
// SystemConnector port (lib/systemConnector.ts -> lib/adapters/default/rallyConnector.ts
// or lib/adapters/aiHub/aiHubConnector.ts, tenant-gated) — no new send path.
// Runs server-side, same pattern as app/dashboard-actions.ts's Notifier
// wiring, since the SystemConnector is core/server-only code (see
// docs/BOUNDARY.md).

import { getSystemConnector } from "@/lib/systemConnector"
import type { Submission } from "@/lib/submissions"

export async function pushApprovedSubmission(
  submission: Submission,
): Promise<{ ok: boolean; url?: string }> {
  return getSystemConnector().pushSubmission(submission)
}
