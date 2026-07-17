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
