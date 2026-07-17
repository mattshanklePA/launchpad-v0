import React from "react";

/** Modal dialog: basalt scrim, white panel, 12px radius. */
export function Dialog({ open, onClose, title, eyebrow, children, footer, width = "480px" }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(42,51,60,.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
        animation: "ks-fade var(--dur-base) var(--ease-standard)",
      }}
    >
      <style>{`@keyframes ks-fade{from{opacity:0}to{opacity:1}}@keyframes ks-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>
      <div
        role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-card)", borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-lg)", width, maxWidth: "100%",
          animation: "ks-rise var(--dur-slow) var(--ease-out)", overflow: "hidden",
        }}
      >
        <div style={{ padding: "24px 24px 0" }}>
          {eyebrow && <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "6px" }}>{eyebrow}</div>}
          {title && <h2 style={{ margin: 0, fontFamily: "var(--font-heading)", fontSize: "22px", fontWeight: 700, letterSpacing: "-0.01em", color: "var(--text-strong)" }}>{title}</h2>}
        </div>
        <div style={{ padding: "16px 24px 24px", fontFamily: "var(--font-body)", fontSize: "14px", lineHeight: 1.5, color: "var(--text-body)" }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "16px 24px", borderTop: "1px solid var(--border-subtle)", background: "var(--ks-chalk)" }}>{footer}</div>}
      </div>
    </div>
  );
}
