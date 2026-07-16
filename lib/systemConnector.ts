/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { SystemConnector } from "@/lib/ports/connector"
import { rallyConnector } from "@/lib/adapters/default/rallyConnector"
import { aiHubConnector } from "@/lib/adapters/aiHub/aiHubConnector"
import { getTenant } from "@/lib/tenant"

/**
 * Resolve the active SystemConnector.
 *
 * Defaults to the Rally example. A tenant with the `aiHubExport` feature flag
 * set (DoC today) gets the AI Hub adapter instead, which reuses the OMB field
 * mapping. To sync submissions to a different agency system of record or AI
 * use-case inventory (ServiceNow, Jira), branch here on config/env and return
 * another SystemConnector. See docs/BOUNDARY.md.
 */
export function getSystemConnector(): SystemConnector {
  if (getTenant().features.aiHubExport) return aiHubConnector()
  return rallyConnector()
}
