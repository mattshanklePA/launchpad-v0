/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Default adapter; not for redistribution.
 */

import type { SystemConnector } from "@/lib/ports/connector"
import type { Submission } from "@/lib/submissions"
import { submitToRally } from "@/lib/rallyClient"

/** Default SystemConnector: Rally example (wraps lib/rallyClient.ts). */
export function rallyConnector(): SystemConnector {
  return {
    async pushSubmission(submission: Submission): Promise<{ ok: boolean; url?: string }> {
      const res = await submitToRally(submission)
      return { ok: res.success, url: res.url }
    },
  }
}
