// The single write path for a cluster rationalization decision — shared by
// components/admin/rationalization-panel.tsx and components/clusters/cluster-decision.tsx
// (RD-4) so the two surfaces the same decision can be made from (RollUp's
// panel and the dedicated cluster page, per DIVERGENCES.md item 4) never
// drift onto two different patches. Pure I/O wrapper around
// lib/rationalization.ts's pure patch builders — no decision logic lives
// here, only "write the patch to every member."

import { patchSubmissionFormData } from "@/lib/submissions"
import {
  buildRationalizationPatch,
  clearRationalizationPatch,
  type RationalizationCluster,
  type RationalizationDecision,
} from "@/lib/rationalization"

/** Records a cluster decision (consolidate or keep-separate) on every member. */
export async function applyRationalizationDecision(
  cluster: RationalizationCluster,
  decision: RationalizationDecision,
  opts: { leadSubmissionId?: string; decidedBy: string; decidedAt: string },
): Promise<void> {
  const patch = buildRationalizationPatch(cluster, decision, opts)
  await Promise.all(cluster.memberIds.map((id) => patchSubmissionFormData(id, patch)))
}

/** Reverses a cluster decision on every member, returning the cluster to "pending". */
export async function undoRationalizationDecision(cluster: RationalizationCluster): Promise<void> {
  const patch = clearRationalizationPatch()
  await Promise.all(cluster.memberIds.map((id) => patchSubmissionFormData(id, patch)))
}
