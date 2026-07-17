import React from "react";

/** Radio option — active-blue when selected. Use in a group sharing `name`. */
export function Radio({ label, checked = false, onChange, name, value, disabled = false, id, style, ...rest }) {
  const fid = id || React.useId();
  return (
    <label htmlFor={fid} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)", ...style }}>
      <span style={{ position: "relative", display: "inline-flex", width: "18px", height: "18px", flexShrink: 0 }}>
        <input id={fid} type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        <span style={{
          width: "18px", height: "18px", borderRadius: "50%",
          border: `1.5px solid ${checked ? "var(--ks-active-blue)" : "var(--border-strong)"}`,
          background: "var(--surface-card)", display: "flex", alignItems: "center", justifyContent: "center",
          transition: "border-color var(--dur-fast) var(--ease-standard)",
        }}>
          {checked && <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: "var(--ks-active-blue)" }} />}
        </span>
      </span>
      {label}
    </label>
  );
}
