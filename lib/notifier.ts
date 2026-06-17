/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

import type { Notifier } from "@/lib/ports/notify"
import { slackNotifier } from "@/lib/adapters/default/slackNotifier"

/**
 * Resolve the active Notifier.
 *
 * Today this returns the default Slack notifier. To route notifications to an
 * agency's Teams or email, branch here on config/env and return a different
 * Notifier. Core code calls `getNotifier()` and never references a concrete
 * channel. See docs/BOUNDARY.md.
 */
export function getNotifier(): Notifier {
  return slackNotifier()
}
