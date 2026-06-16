/*
 * LaunchPad — (c) 2026 Packaged Agile, LLC. All rights reserved.
 * Proprietary and confidential. Core module; not for redistribution.
 */

/**
 * Notifier port.
 *
 * Sends outbound notifications. The default implementation is Slack; an agency
 * can swap in Microsoft Teams or email by implementing this interface and
 * wiring it in `lib/notifier.ts`. See docs/BOUNDARY.md.
 */
export interface Notifier {
  /** Send a notification message. Resolves once delivery is attempted. */
  send(message: string): Promise<void>
}
