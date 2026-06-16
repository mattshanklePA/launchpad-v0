/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { Submission } from "@/lib/submissions"

/**
 * SystemConnector port.
 *
 * Pushes submissions and decisions outbound to an agency system of record or
 * AI use-case inventory. The default implementation is a Rally example; an
 * agency can implement this interface for ServiceNow, the AI Hub inventory,
 * Jira, etc., and wire it in `lib/systemConnector.ts`. See docs/BOUNDARY.md.
 */
export interface SystemConnector {
  pushSubmission(submission: Submission): Promise<{ ok: boolean; url?: string }>
}
