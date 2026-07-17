import React from "react";

/** Checkbox with active-blue fill when checked. */
export function Checkbox({ label, checked = false, onChange, disabled = false, id, style, ...rest }) {
  const fid = id || React.useId();
  return (
    <label htmlFor={fid} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)", ...style }}>
      <span style={{ position: "relative", display: "inline-flex", width: "18px", height: "18px", flexShrink: 0 }}>
        <input id={fid} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        <span style={{
          width: "18px", height: "18px", borderRadius: "var(--radius-xs)",
          border: `1.5px solid ${checked ? "var(--ks-active-blue)" : "var(--border-strong)"}`,
          background: checked ? "var(--ks-active-blue)" : "var(--surface-card)",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)",
        }}>
          {checked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>}
        </span>
      </span>
      {label}
    </label>
  );
}
