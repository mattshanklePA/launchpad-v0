import React from "react";

/** Basalt tooltip on hover/focus. Wraps a single trigger child. */
export function Tooltip({ label, children, placement = "top" }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top:    { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left:   { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right:  { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  }[placement];
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span
          role="tooltip"
          style={{
            position: "absolute", ...pos, zIndex: 900, whiteSpace: "nowrap",
            background: "var(--ks-basalt)", color: "var(--ks-chalk)",
            fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 500,
            padding: "6px 10px", borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-md)", pointerEvents: "none",
            animation: "ks-tip var(--dur-fast) var(--ease-out)",
          }}
        >
          <style>{`@keyframes ks-tip{from{opacity:0}to{opacity:1}}`}</style>
          {label}
        </span>
      )}
    </span>
  );
}
