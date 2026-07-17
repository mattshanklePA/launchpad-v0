import React from "react";

/** Text field with mono label. Focus shows the active-blue ring. */
export function Input({
  label, hint, error, prefix, suffix, id, value, onChange, placeholder,
  type = "text", disabled = false, style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const borderColor = error ? "var(--ks-alert)" : focus ? "var(--border-focus)" : "var(--border-default)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", ...style }}>
      {label && (
        <label htmlFor={fid} style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>{label}</label>
      )}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        background: disabled ? "var(--ks-chalk)" : "var(--surface-card)",
        border: `1px solid ${borderColor}`, borderRadius: "var(--radius-sm)",
        padding: "0 12px", height: "40px",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
        opacity: disabled ? 0.6 : 1,
      }}>
        {prefix && <span style={{ color: "var(--text-muted)", display: "flex" }}>{prefix}</span>}
        <input
          id={fid} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-strong)", minWidth: 0 }}
          {...rest}
        />
        {suffix && <span style={{ color: "var(--text-muted)", display: "flex", fontFamily: "var(--font-mono)", fontSize: "12px" }}>{suffix}</span>}
      </div>
      {(hint || error) && (
        <span style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: error ? "var(--ks-alert)" : "var(--text-muted)" }}>{error || hint}</span>
      )}
    </div>
  );
}
