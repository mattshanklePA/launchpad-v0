"use server"

// Server action wiring the Executive Action Center's buttons (CC-5) to the
// EXISTING Notifier port (lib/notifier.ts -> lib/adapters/default/slackNotifier.ts
// -> lib/slackWebhook.ts) — no new send path. Runs server-side, same pattern
// as every other server action in app/ (e.g. app/admin/compare-actions.ts),
// since the Notifier is core/server-only code (see docs/BOUNDARY.md).
//
// The actual guard lives in lib/dashboard/actions.ts's `canAutoSend` +
// `buildNotificationBatch` — this function just calls the notifier for
// whatever survives that guard. A batch with nothing sendable (every item
// guarded off, e.g. a needs_info nudge aimed at a submitter, or no reviewer on
// file yet) never touches the notifier at all.

import { getNotifier } from "@/lib/notifier"
import { buildNotificationBatch, type DashboardAction } from "@/lib/dashboard/actions"

export async function sendDashboardActionNotification(
  actions: DashboardAction[],
): Promise<{ sent: boolean; count: number }> {
  const batch = buildNotificationBatch(actions)
  if (!batch) return { sent: false, count: 0 }
  await getNotifier().send(batch.message)
  return { sent: true, count: batch.count }
}
