import React from "react";

const STATUSES = {
  healthy:   { label: "On track",  color: "var(--ks-on-track)" },
  attention: { label: "Attention", color: "var(--ks-amber)" },
  alert:     { label: "Off plumb", color: "var(--ks-alert)" },
  neutral:   { label: "Not started", color: "var(--ks-ink-500)" },
};

/**
 * The core status vocabulary of a governance product: a dot + word.
 * healthy=green · attention=amber · alert=red · neutral=grey.
 */
export function StatusPill({ status = "neutral", children, solid = false, style, ...rest }) {
  const s = STATUSES[status] || STATUSES.neutral;
  const label = children ?? s.label;
  if (solid) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px", borderRadius: "var(--radius-pill)", background: s.color, color: "#fff", lineHeight: 1.4, whiteSpace: "nowrap", ...style }} {...rest}>{label}</span>
    );
  }
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "3px 10px 3px 8px", borderRadius: "var(--radius-pill)", background: "var(--surface-card)", border: "1px solid var(--border-default)", color: "var(--text-body)", lineHeight: 1.4, whiteSpace: "nowrap", ...style }} {...rest}>
      <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: s.color, flexShrink: 0 }} />
      {label}
    </span>
  );
}
