import React from "react";

const TONES = {
  neutral: { bg: "var(--ks-limestone)", fg: "var(--ks-ink-700)" },
  basalt:  { bg: "var(--ks-basalt)", fg: "var(--ks-chalk)" },
  info:    { bg: "rgba(0,134,202,.12)", fg: "var(--ks-active-blue-dark)" },
  amber:   { bg: "rgba(199,125,58,.15)", fg: "var(--ks-amber-dark)" },
};

/** Small metadata label — counts, categories, keys. Not for status (use StatusPill). */
export function Badge({ children, tone = "neutral", mono = false, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "4px",
        fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
        fontSize: mono ? "11px" : "12px", fontWeight: 600,
        letterSpacing: mono ? "0.06em" : "0",
        textTransform: mono ? "uppercase" : "none",
        padding: "2px 8px", borderRadius: "var(--radius-xs)",
        background: t.bg, color: t.fg, lineHeight: 1.4, whiteSpace: "nowrap", ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
