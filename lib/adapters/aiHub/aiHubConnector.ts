/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Adapter layer; see docs/BOUNDARY.md.
 */

// AI Hub SystemConnector adapter — pushes an approved submission to Commerce's
// AI use-case inventory Hub. Reuses lib/ombExport.ts's mapSubmissionToOmbRow
// as the single source of truth for the field mapping (guardrail: no second
// copy of the OMB schema), keyed to OMB_COLUMNS so the payload only ever
// carries the 34 OMB fields — never the raw formData/submission object.
//
// TODO(AI Hub integration): there is no live AI Hub endpoint yet. Once
// Commerce provisions one, set AI_HUB_ENDPOINT_URL (and any auth header this
// module will need) and the fetch below starts actually delivering rows.
// Until then, an unconfigured endpoint no-ops (log + succeed) so demo
// tenants never break on a missing integration.

import type { SystemConnector } from "@/lib/ports/connector"
import type { Submission } from "@/lib/submissions"
import { mapSubmissionToOmbRow, OMB_COLUMNS, type OmbExportAgency } from "@/lib/ombExport"
import { getTenant } from "@/lib/tenant"

function ombPayload(submission: Submission, agency: OmbExportAgency): Record<string, string> {
  const row = mapSubmissionToOmbRow(submission, agency)
  return Object.fromEntries(OMB_COLUMNS.map((column, i) => [column, row[i]]))
}

/** AI Hub SystemConnector: maps via the shared OMB mapping, then pushes to the configured endpoint (no-op stub when unconfigured). */
export function aiHubConnector(): SystemConnector {
  return {
    async pushSubmission(submission: Submission): Promise<{ ok: boolean; url?: string }> {
      const tenant = getTenant()
      const payload = ombPayload(submission, { shortName: tenant.shortName, publicInquiryEmail: tenant.publicInquiryEmail })
      const endpoint = process.env.AI_HUB_ENDPOINT_URL

      if (!endpoint) {
        console.log(`[aiHubConnector] AI_HUB_ENDPOINT_URL not configured — no-op push for "${payload["Use Case Name"]}"`)
        return { ok: true }
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      return { ok: res.ok, url: endpoint }
    },
  }
}
