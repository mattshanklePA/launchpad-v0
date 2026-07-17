import React from "react";

const SIZES = {
  sm: { fontSize: "13px", padding: "6px 12px", height: "32px", radius: "var(--radius-sm)" },
  md: { fontSize: "14px", padding: "9px 18px", height: "40px", radius: "var(--radius-sm)" },
  lg: { fontSize: "16px", padding: "12px 24px", height: "48px", radius: "var(--radius-md)" },
};

const VARIANTS = {
  primary: {
    background: "var(--ks-basalt)", color: "var(--ks-chalk)",
    border: "1px solid var(--ks-basalt)",
    "--hov": "var(--ks-basalt-600)", "--act": "var(--ks-basalt-800)",
  },
  secondary: {
    background: "var(--surface-card)", color: "var(--text-strong)",
    border: "1px solid var(--border-default)",
    "--hov": "var(--ks-chalk)", "--act": "var(--ks-limestone)",
  },
  ghost: {
    background: "transparent", color: "var(--text-strong)",
    border: "1px solid transparent",
    "--hov": "var(--ks-limestone)", "--act": "var(--ks-limestone-dark)",
  },
  danger: {
    background: "var(--ks-alert)", color: "#fff",
    border: "1px solid var(--ks-alert)",
    "--hov": "#b04234", "--act": "#98392c",
  },
};

/**
 * Keystone primary action button. Amber is never a button fill — primary is basalt.
 */
export function Button({
  children, variant = "primary", size = "md", disabled = false,
  iconLeft, iconRight, fullWidth = false, type = "button", onClick, style, ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [state, setState] = React.useState("rest");
  const bg = disabled ? v.background
    : state === "active" ? v["--act"]
    : state === "hover" ? v["--hov"]
    : v.background;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setState("hover")}
      onMouseLeave={() => setState("rest")}
      onMouseDown={() => setState("active")}
      onMouseUp={() => setState("hover")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px",
        fontFamily: "var(--font-body)", fontWeight: 600, fontSize: s.fontSize,
        lineHeight: 1, height: s.height, padding: s.padding, borderRadius: s.radius,
        background: bg, color: v.color, border: v.border,
        width: fullWidth ? "100%" : "auto",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        transform: state === "active" && !disabled ? "translateY(1px)" : "none",
        boxShadow: state === "active" ? "none" : "var(--shadow-xs)",
        transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
        outline: "none", whiteSpace: "nowrap", ...style,
      }}
      onFocus={(e) => (e.target.style.boxShadow = "var(--shadow-focus)")}
      onBlur={(e) => (e.target.style.boxShadow = "var(--shadow-xs)")}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
