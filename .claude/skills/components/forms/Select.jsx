import React from "react";

/** Native select styled to match Input. */
export function Select({ label, hint, error, id, value, onChange, options = [], disabled = false, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const borderColor = error ? "var(--ks-alert)" : focus ? "var(--border-focus)" : "var(--border-default)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      {label && <label htmlFor={fid} style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</label>}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={fid} value={value} onChange={onChange} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            appearance: "none", WebkitAppearance: "none", width: "100%",
            fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-strong)",
            background: disabled ? "var(--ks-chalk)" : "var(--surface-card)",
            border: `1px solid ${borderColor}`, borderRadius: "var(--radius-sm)",
            padding: "0 36px 0 12px", height: "40px", cursor: disabled ? "not-allowed" : "pointer",
            boxShadow: focus ? "var(--shadow-focus)" : "none", outline: "none",
            transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
          }}
          {...rest}
        >
          {options.map((o) => {
            const val = typeof o === "string" ? o : o.value;
            const lbl = typeof o === "string" ? o : o.label;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" style={{ position: "absolute", right: "12px", pointerEvents: "none", color: "var(--text-muted)" }}><path d="m6 9 6 6 6-6"/></svg>
      </div>
      {(hint || error) && <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: error ? "var(--ks-alert)" : "var(--text-muted)" }}>{error || hint}</span>}
    </div>
  );
}
