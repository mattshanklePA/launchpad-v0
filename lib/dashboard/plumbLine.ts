// Plumb's one-sentence line at the bottom of the Command Center right rail
// (RD-1, mock 01/02's "Where the portfolio stands" rail). Deterministic —
// no model call, no chat behind it. Exactly three fixed strings, chosen by
// rule from the same counts the rail's own KPI cards and hero already show,
// so Plumb's sentence can never say something the numbers above it don't.

/**
 * `hasCriticalItem`: whether an action item with severity "critical" exists
 * in the current scope's own action list — NOT whether the enterprise-only
 * hero card is rendering (that's a separate, department-scope-only display
 * decision; a bureau/office scope can have a real critical item with no hero
 * card at all). `warningCount` should be the same "wants a reviewer" count
 * the scope's own "no reviewer assigned" action row already computed, not a
 * sum across every warning-severity item (issue #218).
 */
export function plumbLine(hasCriticalItem: boolean, warningCount: number): string {
  if (hasCriticalItem) {
    return "The cluster is the only thing blocking approvals this week. Everything else can wait until it is settled."
  }
  if (warningCount > 0) {
    return `Nothing is blocked. ${warningCount} item${warningCount === 1 ? "" : "s"} want${warningCount === 1 ? "s" : ""} a reviewer when you have time.`
  }
  return "Nothing off-plumb. Every use case is inside its gates."
}
