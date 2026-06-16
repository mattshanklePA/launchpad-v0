/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { SystemConnector } from "@/lib/ports/connector"
import { rallyConnector } from "@/lib/adapters/default/rallyConnector"

/**
 * Resolve the active SystemConnector.
 *
 * Today this returns the default Rally example. To sync submissions to an
 * agency's system of record or AI use-case inventory (ServiceNow, the AI Hub,
 * Jira), branch here on config/env and return a different SystemConnector.
 * See docs/BOUNDARY.md.
 */
export function getSystemConnector(): SystemConnector {
  return rallyConnector()
}
