/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Default adapter; not for redistribution.
 */

import type { Notifier } from "@/lib/ports/notify"
import { sendSlackNotification } from "@/lib/slackWebhook"

/** Default Notifier: Slack webhook (wraps lib/slackWebhook.ts). */
export function slackNotifier(): Notifier {
  return {
    async send(message: string): Promise<void> {
      await sendSlackNotification(message)
    },
  }
}
