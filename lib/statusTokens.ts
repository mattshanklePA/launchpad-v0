// Keystone DS status vocabulary (.claude/skills/tokens/colors.css's
// --status-* aliases; tailwind.config.ts's healthy/attention/alert/neutral
// colors) — exactly four states, reused by every status-driving badge
// helper (lib/reviewWorkflow.ts, lib/riskProfile.ts, lib/nistRmf.ts) so they
// can never drift from each other or from the DS token set.

export type KeystoneStatus = "healthy" | "attention" | "alert" | "neutral"

export const STATUS_BADGE_CLASS: Record<KeystoneStatus, string> = {
  healthy: "bg-healthy-subtle text-healthy-foreground border-healthy/30",
  attention: "bg-attention-subtle text-attention-foreground border-attention/30",
  alert: "bg-alert-subtle text-alert-foreground border-alert/30",
  neutral: "bg-neutral-subtle text-neutral-foreground border-neutral/40",
}

/** Left-border accent class for a card/panel carrying one of the four statuses — the KPI-card and reviewer-detail pattern (issue #157): a hairline card + this accent + a StatusPill, never a full background wash. */
export const STATUS_BORDER_L_CLASS: Record<KeystoneStatus, string> = {
  healthy: "border-l-healthy",
  attention: "border-l-attention",
  alert: "border-l-alert",
  neutral: "border-l-neutral",
}

/** Solid dot color for a StatusPill (components/ui/status-pill.tsx). */
export const STATUS_DOT_CLASS: Record<KeystoneStatus, string> = {
  healthy: "bg-healthy",
  attention: "bg-attention",
  alert: "bg-alert",
  neutral: "bg-neutral",
}

/** Default StatusPill copy when a caller doesn't supply its own label. */
export const STATUS_DEFAULT_LABEL: Record<KeystoneStatus, string> = {
  healthy: "On track",
  attention: "Attention",
  alert: "At risk",
  neutral: "Neutral",
}
