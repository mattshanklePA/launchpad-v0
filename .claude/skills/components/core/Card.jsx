import React from "react";

/** Elevated content surface: white, hairline limestone border, 8px radius. */
export function Card({ children, padding = "24px", raised = false, interactive = false, onClick, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => interactive && setHover(true)}
      onMouseLeave={() => interactive && setHover(false)}
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding,
        boxShadow: raised || hover ? "var(--shadow-sm)" : "none",
        borderColor: hover ? "var(--border-default)" : "var(--border-subtle)",
        cursor: interactive ? "pointer" : "default",
        transition: "box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Optional mono eyebrow + title header for a Card. */
export function CardHeader({ eyebrow, title, action, style }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "16px", ...style }}>
      <div>
        {eyebrow && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "4px" }}>{eyebrow}</div>
        )}
        {title && (
          <div style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 700, color: "var(--text-strong)", letterSpacing: "-0.01em" }}>{title}</div>
        )}
      </div>
      {action}
    </div>
  );
}
