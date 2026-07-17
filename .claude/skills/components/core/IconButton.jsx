import React from "react";

const SIZES = { sm: 32, md: 40, lg: 48 };

/** Square icon-only button. Same seat-down press as Button. */
export function IconButton({
  children, label, variant = "ghost", size = "md", disabled = false, onClick, style, ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  const [state, setState] = React.useState("rest");
  const base = {
    ghost: { bg: "transparent", color: "var(--text-body)", hov: "var(--ks-limestone)", act: "var(--ks-limestone-dark)", border: "transparent" },
    secondary: { bg: "var(--surface-card)", color: "var(--text-strong)", hov: "var(--ks-chalk)", act: "var(--ks-limestone)", border: "var(--border-default)" },
    primary: { bg: "var(--ks-basalt)", color: "var(--ks-chalk)", hov: "var(--ks-basalt-600)", act: "var(--ks-basalt-800)", border: "var(--ks-basalt)" },
  }[variant] || {};
  const bg = disabled ? base.bg : state === "active" ? base.act : state === "hover" ? base.hov : base.bg;
  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setState("hover")} onMouseLeave={() => setState("rest")}
      onMouseDown={() => setState("active")} onMouseUp={() => setState("hover")}
      onFocus={(e) => (e.currentTarget.style.boxShadow = "var(--shadow-focus)")}
      onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: dim, height: dim, padding: 0, borderRadius: "var(--radius-sm)",
        background: bg, color: base.color, border: `1px solid ${base.border}`,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1,
        transform: state === "active" && !disabled ? "translateY(1px)" : "none",
        transition: "background var(--dur-fast) var(--ease-standard)", outline: "none", ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
