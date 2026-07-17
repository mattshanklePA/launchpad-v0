import React from "react";

/** Toggle switch — active-blue track when on. */
export function Switch({ label, checked = false, onChange, disabled = false, id, style, ...rest }) {
  const fid = id || React.useId();
  return (
    <label htmlFor={fid} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1, fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-body)", ...style }}>
      <span style={{ position: "relative", display: "inline-flex", width: "38px", height: "22px", flexShrink: 0 }}>
        <input id={fid} type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        <span style={{
          width: "38px", height: "22px", borderRadius: "var(--radius-pill)",
          background: checked ? "var(--ks-active-blue)" : "var(--ks-limestone-dark)",
          transition: "background var(--dur-base) var(--ease-standard)", position: "relative",
        }}>
          <span style={{
            position: "absolute", top: "2px", left: checked ? "18px" : "2px",
            width: "18px", height: "18px", borderRadius: "50%", background: "#fff",
            boxShadow: "var(--shadow-sm)", transition: "left var(--dur-base) var(--ease-out)",
          }} />
        </span>
      </span>
      {label}
    </label>
  );
}
