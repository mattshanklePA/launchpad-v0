/* @ds-bundle: {"format":4,"namespace":"KeystoneDesignSystem_37ff67","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"b35061d05dd0","components/core/Button.jsx":"27ecbf6bd6c2","components/core/Card.jsx":"f51c549e1b21","components/core/IconButton.jsx":"70df8cacdf93","components/core/StatusPill.jsx":"d0fba98786c7","components/feedback/Dialog.jsx":"d5432da668fd","components/feedback/Tooltip.jsx":"f32f1589c0a8","components/forms/Checkbox.jsx":"55e27efe59d7","components/forms/Input.jsx":"c306f0c2fdae","components/forms/Radio.jsx":"8c7738023109","components/forms/Select.jsx":"200fc6284504","components/forms/Switch.jsx":"2cbd6df23de4","exports/doc-page.js":"371bab66f42d","ui_kits/keystone-app/Dashboard.jsx":"6e7802c44a87","ui_kits/keystone-app/InitiativeDetail.jsx":"798c79864990","ui_kits/keystone-app/PlumbPanel.jsx":"80ff18c0409f","ui_kits/keystone-app/Shell.jsx":"f08e0b089740","ui_kits/keystone-app/data.js":"4c77df8b9f37"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.KeystoneDesignSystem_37ff67 = window.KeystoneDesignSystem_37ff67 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const TONES = {
  neutral: {
    bg: "var(--ks-limestone)",
    fg: "var(--ks-ink-700)"
  },
  basalt: {
    bg: "var(--ks-basalt)",
    fg: "var(--ks-chalk)"
  },
  info: {
    bg: "rgba(0,134,202,.12)",
    fg: "var(--ks-active-blue-dark)"
  },
  amber: {
    bg: "rgba(199,125,58,.15)",
    fg: "var(--ks-amber-dark)"
  }
};

/** Small metadata label — counts, categories, keys. Not for status (use StatusPill). */
function Badge({
  children,
  tone = "neutral",
  mono = false,
  style,
  ...rest
}) {
  const t = TONES[tone] || TONES.neutral;
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "4px",
      fontFamily: mono ? "var(--font-mono)" : "var(--font-body)",
      fontSize: mono ? "11px" : "12px",
      fontWeight: 600,
      letterSpacing: mono ? "0.06em" : "0",
      textTransform: mono ? "uppercase" : "none",
      padding: "2px 8px",
      borderRadius: "var(--radius-xs)",
      background: t.bg,
      color: t.fg,
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Badge.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: {
    fontSize: "13px",
    padding: "6px 12px",
    height: "32px",
    radius: "var(--radius-sm)"
  },
  md: {
    fontSize: "14px",
    padding: "9px 18px",
    height: "40px",
    radius: "var(--radius-sm)"
  },
  lg: {
    fontSize: "16px",
    padding: "12px 24px",
    height: "48px",
    radius: "var(--radius-md)"
  }
};
const VARIANTS = {
  primary: {
    background: "var(--ks-basalt)",
    color: "var(--ks-chalk)",
    border: "1px solid var(--ks-basalt)",
    "--hov": "var(--ks-basalt-600)",
    "--act": "var(--ks-basalt-800)"
  },
  secondary: {
    background: "var(--surface-card)",
    color: "var(--text-strong)",
    border: "1px solid var(--border-default)",
    "--hov": "var(--ks-chalk)",
    "--act": "var(--ks-limestone)"
  },
  ghost: {
    background: "transparent",
    color: "var(--text-strong)",
    border: "1px solid transparent",
    "--hov": "var(--ks-limestone)",
    "--act": "var(--ks-limestone-dark)"
  },
  danger: {
    background: "var(--ks-alert)",
    color: "#fff",
    border: "1px solid var(--ks-alert)",
    "--hov": "#b04234",
    "--act": "#98392c"
  }
};

/**
 * Keystone primary action button. Amber is never a button fill — primary is basalt.
 */
function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  iconLeft,
  iconRight,
  fullWidth = false,
  type = "button",
  onClick,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [state, setState] = React.useState("rest");
  const bg = disabled ? v.background : state === "active" ? v["--act"] : state === "hover" ? v["--hov"] : v.background;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setState("hover"),
    onMouseLeave: () => setState("rest"),
    onMouseDown: () => setState("active"),
    onMouseUp: () => setState("hover"),
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "8px",
      fontFamily: "var(--font-body)",
      fontWeight: 600,
      fontSize: s.fontSize,
      lineHeight: 1,
      height: s.height,
      padding: s.padding,
      borderRadius: s.radius,
      background: bg,
      color: v.color,
      border: v.border,
      width: fullWidth ? "100%" : "auto",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transform: state === "active" && !disabled ? "translateY(1px)" : "none",
      boxShadow: state === "active" ? "none" : "var(--shadow-xs)",
      transition: "background var(--dur-fast) var(--ease-standard), transform var(--dur-fast) var(--ease-standard)",
      outline: "none",
      whiteSpace: "nowrap",
      ...style
    },
    onFocus: e => e.target.style.boxShadow = "var(--shadow-focus)",
    onBlur: e => e.target.style.boxShadow = "var(--shadow-xs)"
  }, rest), iconLeft, children, iconRight);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Elevated content surface: white, hairline limestone border, 8px radius. */
function Card({
  children,
  padding = "24px",
  raised = false,
  interactive = false,
  onClick,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", _extends({
    onClick: onClick,
    onMouseEnter: () => interactive && setHover(true),
    onMouseLeave: () => interactive && setHover(false),
    style: {
      background: "var(--surface-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      padding,
      boxShadow: raised || hover ? "var(--shadow-sm)" : "none",
      borderColor: hover ? "var(--border-default)" : "var(--border-subtle)",
      cursor: interactive ? "pointer" : "default",
      transition: "box-shadow var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard)",
      ...style
    }
  }, rest), children);
}

/** Optional mono eyebrow + title header for a Card. */
function CardHeader({
  eyebrow,
  title,
  action,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "16px",
      marginBottom: "16px",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", null, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: "4px"
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-heading)",
      fontSize: "18px",
      fontWeight: 700,
      color: "var(--text-strong)",
      letterSpacing: "-0.01em"
    }
  }, title)), action);
}
Object.assign(__ds_scope, { Card, CardHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Card.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const SIZES = {
  sm: 32,
  md: 40,
  lg: 48
};

/** Square icon-only button. Same seat-down press as Button. */
function IconButton({
  children,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const dim = SIZES[size] || SIZES.md;
  const [state, setState] = React.useState("rest");
  const base = {
    ghost: {
      bg: "transparent",
      color: "var(--text-body)",
      hov: "var(--ks-limestone)",
      act: "var(--ks-limestone-dark)",
      border: "transparent"
    },
    secondary: {
      bg: "var(--surface-card)",
      color: "var(--text-strong)",
      hov: "var(--ks-chalk)",
      act: "var(--ks-limestone)",
      border: "var(--border-default)"
    },
    primary: {
      bg: "var(--ks-basalt)",
      color: "var(--ks-chalk)",
      hov: "var(--ks-basalt-600)",
      act: "var(--ks-basalt-800)",
      border: "var(--ks-basalt)"
    }
  }[variant] || {};
  const bg = disabled ? base.bg : state === "active" ? base.act : state === "hover" ? base.hov : base.bg;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setState("hover"),
    onMouseLeave: () => setState("rest"),
    onMouseDown: () => setState("active"),
    onMouseUp: () => setState("hover"),
    onFocus: e => e.currentTarget.style.boxShadow = "var(--shadow-focus)",
    onBlur: e => e.currentTarget.style.boxShadow = "none",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: dim,
      height: dim,
      padding: 0,
      borderRadius: "var(--radius-sm)",
      background: bg,
      color: base.color,
      border: `1px solid ${base.border}`,
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      transform: state === "active" && !disabled ? "translateY(1px)" : "none",
      transition: "background var(--dur-fast) var(--ease-standard)",
      outline: "none",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const STATUSES = {
  healthy: {
    label: "On track",
    color: "var(--ks-on-track)"
  },
  attention: {
    label: "Attention",
    color: "var(--ks-amber)"
  },
  alert: {
    label: "Off plumb",
    color: "var(--ks-alert)"
  },
  neutral: {
    label: "Not started",
    color: "var(--ks-ink-500)"
  }
};

/**
 * The core status vocabulary of a governance product: a dot + word.
 * healthy=green · attention=amber · alert=red · neutral=grey.
 */
function StatusPill({
  status = "neutral",
  children,
  solid = false,
  style,
  ...rest
}) {
  const s = STATUSES[status] || STATUSES.neutral;
  const label = children ?? s.label;
  if (solid) {
    return /*#__PURE__*/React.createElement("span", _extends({
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "3px 10px",
        borderRadius: "var(--radius-pill)",
        background: s.color,
        color: "#fff",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...style
      }
    }, rest), label);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "7px",
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      padding: "3px 10px 3px 8px",
      borderRadius: "var(--radius-pill)",
      background: "var(--surface-card)",
      border: "1px solid var(--border-default)",
      color: "var(--text-body)",
      lineHeight: 1.4,
      whiteSpace: "nowrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "7px",
      height: "7px",
      borderRadius: "50%",
      background: s.color,
      flexShrink: 0
    }
  }), label);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Modal dialog: basalt scrim, white panel, 12px radius. */
function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  width = "480px"
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      background: "rgba(42,51,60,.55)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      animation: "ks-fade var(--dur-base) var(--ease-standard)"
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes ks-fade{from{opacity:0}to{opacity:1}}@keyframes ks-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`), /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    onClick: e => e.stopPropagation(),
    style: {
      background: "var(--surface-card)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      width,
      maxWidth: "100%",
      animation: "ks-rise var(--dur-slow) var(--ease-out)",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "24px 24px 0"
    }
  }, eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)",
      marginBottom: "6px"
    }
  }, eyebrow), title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-heading)",
      fontSize: "22px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      color: "var(--text-strong)"
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 24px 24px",
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      lineHeight: 1.5,
      color: "var(--text-body)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      padding: "16px 24px",
      borderTop: "1px solid var(--border-subtle)",
      background: "var(--ks-chalk)"
    }
  }, footer)));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Basalt tooltip on hover/focus. Wraps a single trigger child. */
function Tooltip({
  label,
  children,
  placement = "top"
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    left: {
      right: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }[placement];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex"
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      ...pos,
      zIndex: 900,
      whiteSpace: "nowrap",
      background: "var(--ks-basalt)",
      color: "var(--ks-chalk)",
      fontFamily: "var(--font-body)",
      fontSize: "12px",
      fontWeight: 500,
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      boxShadow: "var(--shadow-md)",
      pointerEvents: "none",
      animation: "ks-tip var(--dur-fast) var(--ease-out)"
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes ks-tip{from{opacity:0}to{opacity:1}}`), label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Checkbox with active-blue fill when checked. */
function Checkbox({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: "18px",
      height: "18px",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "18px",
      height: "18px",
      borderRadius: "var(--radius-xs)",
      border: `1.5px solid ${checked ? "var(--ks-active-blue)" : "var(--border-strong)"}`,
      background: checked ? "var(--ks-active-blue)" : "var(--surface-card)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard)"
    }
  }, checked && /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  })))), label);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Text field with mono label. Focus shows the active-blue ring. */
function Input({
  label,
  hint,
  error,
  prefix,
  suffix,
  id,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const borderColor = error ? "var(--ks-alert)" : focus ? "var(--border-focus)" : "var(--border-default)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: disabled ? "var(--ks-chalk)" : "var(--surface-card)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-sm)",
      padding: "0 12px",
      height: "40px",
      boxShadow: focus ? "var(--shadow-focus)" : "none",
      transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)",
      opacity: disabled ? 0.6 : 1
    }
  }, prefix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "flex"
    }
  }, prefix), /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: type,
    value: value,
    onChange: onChange,
    placeholder: placeholder,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      flex: 1,
      border: "none",
      outline: "none",
      background: "transparent",
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: "var(--text-strong)",
      minWidth: 0
    }
  }, rest)), suffix && /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--text-muted)",
      display: "flex",
      fontFamily: "var(--font-mono)",
      fontSize: "12px"
    }
  }, suffix)), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "12px",
      color: error ? "var(--ks-alert)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Radio option — active-blue when selected. Use in a group sharing `name`. */
function Radio({
  label,
  checked = false,
  onChange,
  name,
  value,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: "18px",
      height: "18px",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      border: `1.5px solid ${checked ? "var(--ks-active-blue)" : "var(--border-strong)"}`,
      background: "var(--surface-card)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "border-color var(--dur-fast) var(--ease-standard)"
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: "9px",
      height: "9px",
      borderRadius: "50%",
      background: "var(--ks-active-blue)"
    }
  }))), label);
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Native select styled to match Input. */
function Select({
  label,
  hint,
  error,
  id,
  value,
  onChange,
  options = [],
  disabled = false,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const fid = id || React.useId();
  const borderColor = error ? "var(--ks-alert)" : focus ? "var(--border-focus)" : "var(--border-default)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: "11px",
      fontWeight: 500,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-muted)"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: fid,
    value: value,
    onChange: onChange,
    disabled: disabled,
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      appearance: "none",
      WebkitAppearance: "none",
      width: "100%",
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: "var(--text-strong)",
      background: disabled ? "var(--ks-chalk)" : "var(--surface-card)",
      border: `1px solid ${borderColor}`,
      borderRadius: "var(--radius-sm)",
      padding: "0 36px 0 12px",
      height: "40px",
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: focus ? "var(--shadow-focus)" : "none",
      outline: "none",
      transition: "border-color var(--dur-fast) var(--ease-standard), box-shadow var(--dur-fast) var(--ease-standard)"
    }
  }, rest), options.map(o => {
    const val = typeof o === "string" ? o : o.value;
    const lbl = typeof o === "string" ? o : o.label;
    return /*#__PURE__*/React.createElement("option", {
      key: val,
      value: val
    }, lbl);
  })), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.75",
    style: {
      position: "absolute",
      right: "12px",
      pointerEvents: "none",
      color: "var(--text-muted)"
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  }))), (hint || error) && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "12px",
      color: error ? "var(--ks-alert)" : "var(--text-muted)"
    }
  }, error || hint));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Toggle switch — active-blue track when on. */
function Switch({
  label,
  checked = false,
  onChange,
  disabled = false,
  id,
  style,
  ...rest
}) {
  const fid = id || React.useId();
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: fid,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "var(--font-body)",
      fontSize: "14px",
      color: "var(--text-body)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      width: "38px",
      height: "22px",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    id: fid,
    type: "checkbox",
    checked: checked,
    onChange: onChange,
    disabled: disabled,
    style: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      width: "38px",
      height: "22px",
      borderRadius: "var(--radius-pill)",
      background: checked ? "var(--ks-active-blue)" : "var(--ks-limestone-dark)",
      transition: "background var(--dur-base) var(--ease-standard)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: "2px",
      left: checked ? "18px" : "2px",
      width: "18px",
      height: "18px",
      borderRadius: "50%",
      background: "#fff",
      boxShadow: "var(--shadow-sm)",
      transition: "left var(--dur-base) var(--ease-out)"
    }
  }))), label);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// exports/doc-page.js
try { (() => {
// @ds-adherence-ignore -- omelette starter scaffold (raw elements/hex/px by design)
// Copied omelette starter. Re-running copy_starter_component with this kind overwrites this file with the latest version (page content is unaffected).
/* BEGIN USAGE */
/**
 * <doc-page> — paged-document shell for printable HTML.
 *
 * FIRST, decide how the document paginates — up front, before building:
 *
 * - FLOWING document (the default): write the whole document as one
 *   normal HTML flow inside <doc-page>; the browser's print engine
 *   splits it onto pages at export. Use for long-form documents with a
 *   single text flow: reports, memos, letters, essays.
 * - EXPLICIT pagination: a fixed set of pre-paginated pages, one
 *   <section class="page"> child per page. Use when the user asks for a
 *   specific page count, or the design implies one: a one-page resume, a
 *   two-sided flier, a poster, a certificate, a brochure — any richly
 *   laid-out document without a single text flow.
 * - If in doubt, ask the user as part of the build.
 *
 * PAGE SIZING — paper differs by country (letter vs A4), so the printed
 * sheet is not one fixed truth:
 * - FLOWING documents pin NO paper size: the print engine paginates
 *   onto the user's real paper, and the content reflows to it.
 * - EXPLICITLY PAGINATED documents print each page at a FIXED page box
 *   with overflow hidden — letter by default, size="a4" for a clearly
 *   metric user, the user's chosen paper when they export. Design each
 *   page to FILL that box, fitting letter and A4 alike without overlap.
 * - width/height pin an explicit fixed size, ONLY when the user gives
 *   one.
 * Never write your own @page rule or hard-code paper dimensions in the
 * content.
 *
 * Sizing modes (attributes):
 *   (none)                      — portrait: flowing docs use the user's
 *           paper; explicitly paginated pages use the named size box
 *           (letter unless size="a4")
 *   orientation="landscape"     — the same, landscape
 *   width / height              — explicit fixed size, ONLY when the user
 *           gives one (e.g. width="22in" height="30in" for a 22×30
 *           poster): the page IS the design's size, printed at true
 *           dimensions (or scaled onto the user's paper at print time).
 *           Any absolute CSS length: px/in/mm/cm/pt/pc.
 * The component announces the chosen mode to the host app at runtime (a
 * meta tag it injects), so the print path can inject the user's true
 * paper size.
 *
 * On screen the document renders on a desk background: a flowing
 * document as one tall scrolling sheet (Google Docs' pageless view);
 * explicitly paginated documents as one card per page.
 *
 * EXPLICIT pagination usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page>
 *     <section class="page" id="p1">…one page's design…</section>
 *     <section class="page" id="p2">…</section>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * How the page box works, concretely: each .page prints as ONE full-bleed
 * sheet at a FIXED physical size — letter by default (set size="a4" for
 * a clearly metric user), the user's chosen paper when they export —
 * with overflow hidden. Nothing scrolls and nothing reflows onto a next
 * sheet: content that misses the box is CLIPPED. Design each page to
 * FILL that page box, and to fit it — letter and A4 alike — without
 * overlap. Each page is a size container; don't size anything in
 * viewport units (they track the window, not the page), and never set
 * width or height on the .page section itself (the component sizes the
 * page box; an authored height like 100% is meaningless at print and is
 * overridden). The component owns the page box, the screen card chrome,
 * and the page breaks (never add your own break-before/after). Don't mix
 * .page sections with flowing content or header/footer slots in the same
 * document.
 *
 * FLOWING usage:
 *   <style>doc-page:not(:defined){visibility:hidden}</style>
 *   <doc-page margin="0.75in">
 *     <h1>Title</h1>
 *     <p>…body…</p>
 *   </doc-page>
 *   <script src="doc-page.js"></script>
 * There is no manual page-splitting — the browser's print engine
 * paginates at export. Standard break-hygiene rules (`break-inside:
 * avoid` on figures, code blocks, images and table rows; `orphans/
 * widows: 3`) are applied so paragraphs and groups split cleanly. On
 * screen and at print, headings default to `text-wrap: balance` and
 * body text to `text-wrap: pretty`; the defaults have zero specificity,
 * so any text-wrap you declare wins.
 *
 * Other attributes:
 *   size    — letter | a4 | legal (default letter). Flowing documents:
 *           preview proportion only — it does NOT pin their printed
 *           paper (the print dialog's paper governs); leave it alone
 *           there. Explicitly paginated documents: it sets the page box
 *           the cards and the pinned @page share (the export dialog's
 *           choice overrides both at print) — set size="a4" for a
 *           clearly metric user. Scaled-fit: names the sheet the fit is
 *           computed against, same a4-for-metric-users advice.
 *   content-width / content-height — the design's own fixed dimensions
 *           (CSS lengths), for scaling a fixed-size design ONTO the
 *           named sheet: content lays out at exactly this size, and the
 *           component scales it to fit that sheet's printable area
 *           (centered horizontally, top-aligned; the export dialog
 *           re-fits to the user's actual paper choice where available).
 *           Both must be set; they do not change the page box. For pages
 *           WITHOUT running header/footer slots.
 *   margin  — printable inset on every page of a FLOWING document
 *           (default 0.75in); margin="0" makes pages full-bleed.
 *           Explicitly paginated pages are always full-bleed.
 *
 * Running header/footer (flowing documents only): give an element
 * `slot="header"` or `slot="footer"` and it repeats on every printed
 * page via `position: fixed`. To keep body text from sliding under it,
 * the component prints inside a single-cell table whose <thead>/<tfoot>
 * are spacers sized to the header/footer height — browsers repeat
 * thead/tfoot on every page, so each sheet's content starts below the
 * header and ends above the footer. On screen the header/footer render
 * once at the top/bottom of the sheet.
 *
 * At print the component injects `@page { margin: 0 }` (which leaves
 * Chrome no margin box to draw its date/URL/page-count header in) and
 * moves the visual margin onto the sheet's own padding. It also marks
 * the document as owning its print CSS (a
 * `meta[name="omelette-owns-print"]` it injects at runtime), so the
 * PDF export never injects page-geometry CSS of its own on top.
 *
 * Print best practices for the content you author:
 * - Multi-column text: use CSS columns (`column-count` +
 *   `column-gap`), never side-by-side flex/grid columns — only real
 *   CSS columns flow and break across pages. `column-span: all` lets
 *   a heading span the columns; `hyphens: auto` (needs `lang` on
 *   the html element) keeps narrow columns readable.
 * - Page breaks in flowing documents: `break-before: page` on an
 *   element that must start a new page (a chapter, an appendix). Add
 *   your own kept-together blocks (callouts, stat tiles, cards) to a
 *   `break-inside: avoid` rule, and keep each one shorter than a page.
 * - Extend `orphans: 3; widows: 3` to any custom text blocks you add
 *   (p and li are covered by default).
 * - Give long tables a <thead> — browsers repeat it on every printed
 *   page.
 * - No `position: fixed`/`sticky` and no viewport units in content:
 *   fixed elements stamp every printed page (running headers/footers go
 *   in the component's slots) and `100vh` mis-sizes at print.
 *
 * Author content as static HTML so the user can click-to-edit any text
 * directly. Do not set width/padding/background on the document body —
 * the component owns the sheet box.
 */
/* END USAGE */

(() => {
  const PAPER = {
    letter: ['8.5in', '11in'],
    a4: ['210mm', '297mm'],
    legal: ['8.5in', '14in']
  };
  const CSS_LENGTH = /^\d+(\.\d+)?(px|in|mm|cm|pt|pc)$/;
  // Unitless "0" is a valid CSS length and the natural way to write
  // margin="0"; normalise it to 0px so max()/calc() (which reject a bare
  // number) keep working.
  const safeLen = (v, fb) => {
    v = (v || '').trim();
    return v === '0' ? '0px' : CSS_LENGTH.test(v) ? v : fb;
  };
  // WebKit (Safari and every iOS browser shell) never repeats a table's
  // thead/tfoot on printed pages (WebKit bug 17205), so the spacer-borne
  // vertical margins of a FLOWING document reach only the first page
  // there. Engine check, not browser check: vendor is 'Apple Computer,
  // Inc.' exactly for WebKit and 'Google Inc.' for Blink.
  const WK_PRINT = /apple/i.test(navigator.vendor || '');
  // CSS length → px number (CSS absolute units are exact: 1in = 96px).
  // Returns NaN for anything safeLen would reject — callers gate on it.
  const PX_PER = {
    px: 1,
    in: 96,
    mm: 96 / 25.4,
    cm: 96 / 2.54,
    pt: 96 / 72,
    pc: 16
  };
  const toPx = v => {
    const m = /^(\d+(?:\.\d+)?)(px|in|mm|cm|pt|pc)$/.exec((v || '').trim());
    return m ? parseFloat(m[1]) * PX_PER[m[2]] : NaN;
  };
  const stylesheet = `
    :host {
      position: relative;
      display: block;
      /* When the viewport is narrower than the page, grow to wrap the
       * sheet (plus this padding) instead of staying viewport-width, so
       * the desk background and right margin reach the sheet's far edge
       * in the horizontal scroll. */
      min-width: max-content;
      min-height: 100vh;
      background: #f5f5f4;
      padding: 48px 24px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
      --doc-page-w: 8.5in;
      --doc-page-h: 11in;
      --doc-page-margin: 0.75in;
      --doc-hdr-h: 0px;
      --doc-ftr-h: 0px;
      --doc-hdr-pad: 0px;
      --doc-ftr-pad: 0px;
    }
    .sheet {
      width: var(--doc-page-w);
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 2px 10px rgba(20, 20, 19, 0.12);
      border-radius: 7px;
      box-sizing: border-box;
      padding: var(--doc-page-margin);
    }
    .frame { width: 100%; border-collapse: collapse; }
    /* Scaled-fit mode (content-width/content-height): the inner .fit box
     * lays the content out at its authored fixed size and scales it onto
     * the printable area; .fit-box reserves the scaled footprint in flow
     * (transforms don't affect layout) and centers it. Without the mode,
     * both divs are unstyled block pass-throughs. */
    /* Explicit pagination: direct .page children are the pages. The sheet
     * becomes a transparent stack and each page carries the card look on
     * screen; at print each page is exactly one full-bleed sheet. The
     * ::slotted defaults are deliberately weak (document CSS wins), so
     * authored page styling can override any of this. */
    .sheet.paginated {
      background: transparent;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
    }
    .paginated ::slotted(.page) {
      position: relative;
      display: block;
      width: 100%;
      aspect-ratio: var(--doc-page-ar);
      container-type: size;
      overflow: hidden;
      box-sizing: border-box;
      background: #fff;
      border-radius: 7px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
      break-inside: avoid;
    }
    .paginated ::slotted(.page:not(:first-child)) { margin-top: 1rem; }
    @media print {
      .sheet.paginated { padding: 0; }
      /* The flowing-document vertical inset lives on the repeating
       * thead/tfoot spacers, not the sheet padding — they must go too,
       * or each full-sheet .page is pushed ~margin down and spills onto
       * a second sheet. Paginated pages are full-bleed by definition
       * (content owns its insets). */
      .sheet.paginated .hdr-space,
      .sheet.paginated .ftr-space { height: 0; }
      .paginated ::slotted(.page) {
        border-radius: 0 !important;
        box-shadow: none !important;
        margin: 0 !important;
        /* Physical page-box sizing, no viewport units: Safari resolves
         * 100vh against the window, not the page box, so a vh-sized card
         * paginates wrong there. --doc-page-w/h are the named size by
         * default and are overridden to the user's chosen paper by the
         * export path, so every card is exactly one sheet either way.
         * Width + height (same source values as @page size) rather than
         * width + aspect-ratio: the ratio is a 6-decimal rounding of the
         * same division, and a few millionths of overflow would spill a
         * blank sheet after every page. The screen-only aspect-ratio
         * (preview proportions) must not leak into print. cqh typography
         * tracks the same box.
         *
         * Every declaration is !important: per CSS Scoping, unimportant
         * shadow ::slotted rules LOSE to the document context, so a page
         * section's authored inline style would silently beat this print
         * geometry. A model-authored height:100% did exactly that — the
         * percentage resolves as auto in the all-auto print ancestry, the
         * base rule's size containment turns auto into ZERO, and
         * overflow:hidden then paints nothing: a blank PDF with perfect
         * page boxes. At print the component's geometry is the design's
         * whole contract, so it must win over any authored sizing. */
        aspect-ratio: auto !important;
        width: var(--doc-page-w) !important;
        height: var(--doc-page-h) !important;
        overflow: hidden !important;
      }
      .paginated ::slotted(.page:not(:first-child)) {
        break-before: page !important;
        margin-top: 0 !important;
      }
    }
    .fit-mode .fit-box {
      width: calc(var(--doc-fit-w) * var(--doc-fit-scale));
      height: calc(var(--doc-fit-h) * var(--doc-fit-scale));
      margin: 0 auto;
      break-inside: avoid;
    }
    .fit-mode .fit {
      width: var(--doc-fit-w);
      height: var(--doc-fit-h);
      transform: scale(var(--doc-fit-scale));
      transform-origin: top left;
    }
    .frame td, .frame th { padding: 0; text-align: left; font-weight: inherit; }
    .hdr-space { height: var(--doc-hdr-h); }
    .ftr-space { height: var(--doc-ftr-h); }
    ::slotted([slot="header"]),
    ::slotted([slot="footer"]) { display: block; box-sizing: border-box; }
    @media print {
      :host { background: none; padding: 0; min-width: 0; min-height: 0; }
      .sheet {
        width: auto; margin: 0; box-shadow: none; border-radius: 0;
        padding: 0 var(--doc-page-margin);
      }
      /* The thead/tfoot spacers repeat on every page, so they carry the
       * vertical page margin (which the sheet's own padding cannot, since
       * that padding is consumed once on the first/last page). The running
       * header/footer are fixed inside that band. */
      /* The 0.35in is breathing room between a running header/footer and
       * the body; without one the spacer is exactly the page margin, so a
       * margin="0" full-bleed document gets truly full-bleed pages. */
      .hdr-space { height: max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))); }
      .ftr-space { height: max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))); }
      /* WebKit flowing documents: @page carries the vertical margin (see
       * _syncPrintPageRule), so the spacers keep only whatever a running
       * header/footer needs BEYOND it — page 1 would otherwise double its
       * top inset. Paginated sheets already zero their spacers above. */
      .sheet.wk-print:not(.paginated) .hdr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-hdr-h) + var(--doc-hdr-pad))) - var(--doc-page-margin))); }
      .sheet.wk-print:not(.paginated) .ftr-space { height: max(0px, calc(max(var(--doc-page-margin), calc(var(--doc-ftr-h) + var(--doc-ftr-pad))) - var(--doc-page-margin))); }
      ::slotted([slot="header"]) {
        position: fixed; top: 0; left: 0; right: 0; margin: 0;
        padding: calc(var(--doc-page-margin) * 0.45) var(--doc-page-margin) 0;
      }
      ::slotted([slot="footer"]) {
        position: fixed; bottom: 0; left: 0; right: 0; margin: 0;
        padding: 0 var(--doc-page-margin) calc(var(--doc-page-margin) * 0.45);
      }
    }
  `;
  class DocPage extends HTMLElement {
    static get observedAttributes() {
      return ['size', 'width', 'height', 'margin', 'orientation', 'content-width', 'content-height'];
    }
    constructor() {
      super();
      this._root = this.attachShadow({
        mode: 'open'
      });
      this._mo = typeof MutationObserver === 'function' ? new MutationObserver(() => this._scheduleMeasure()) : null;
    }

    /** The named paper's [w, h], swapped when orientation="landscape".
     *  Only the named size swaps — explicit width/height are exact values
     *  the author already oriented. */
    _paperSize() {
      const named = PAPER[(this.getAttribute('size') || '').toLowerCase()] || PAPER.letter;
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? [named[1], named[0]] : named;
    }
    get pageWidth() {
      return safeLen(this.getAttribute('width'), this._paperSize()[0]);
    }
    get pageHeight() {
      return safeLen(this.getAttribute('height'), this._paperSize()[1]);
    }
    get pageMargin() {
      return safeLen(this.getAttribute('margin'), '0.75in');
    }

    /** Scaled-fit mode's content box [w, h] as CSS lengths, or null when
     *  the mode is off (either attribute missing/invalid/zero — a partial
     *  declaration falls back to normal flow rather than guessing). */
    _contentFit() {
      const w = safeLen(this.getAttribute('content-width'), null);
      const h = safeLen(this.getAttribute('content-height'), null);
      if (!w || !h) return null;
      const wPx = toPx(w),
        hPx = toPx(h);
      return wPx > 0 && hPx > 0 ? [w, h, wPx, hPx] : null;
    }
    connectedCallback() {
      if (!this._sheet) this._render();
      this._syncSize();
      this._syncPrintPageRule();
      this._ensureTextWrapDefaults();
      this._ensureOwnsPrintMeta();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      if (this._mo) this._mo.observe(this, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
      });
      this._onResize = () => this._scheduleMeasure();
      window.addEventListener('resize', this._onResize);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => this._scheduleMeasure());
      }
      this._scheduleMeasure();
    }
    disconnectedCallback() {
      window.removeEventListener('resize', this._onResize);
      if (this._mo) this._mo.disconnect();
      if (this._raf) {
        cancelAnimationFrame(this._raf);
        this._raf = null;
      }
      // Drop the head rules when the last doc-page leaves, so a deleted
      // document's @page geometry and text-wrap defaults can't apply to
      // whatever replaces it.
      const survivor = document.querySelector('doc-page');
      if (!survivor) {
        ['doc-page-print', 'doc-page-text-wrap', 'doc-page-owns-print', 'doc-page-fixed-size', 'doc-page-print-sizing'].forEach(id => {
          const tag = document.getElementById(id);
          if (tag) tag.remove();
        });
        // A live deck-stage deferred its own print-sizing meta to ours —
        // hand the page-global meta over so the deck isn't left unmarked.
        const deck = document.querySelector('deck-stage');
        if (deck && typeof deck._ensurePrintSizingMeta === 'function') {
          deck._ensurePrintSizingMeta();
        }
      } else {
        // A departed owner hands each page-global meta to whatever
        // doc-page remains (or it's removed).
        if (typeof survivor._syncFixedSizeMeta === 'function') {
          survivor._syncFixedSizeMeta();
        }
        if (typeof survivor._syncPrintSizingMeta === 'function') {
          survivor._syncPrintSizingMeta();
        }
      }
    }
    attributeChangedCallback() {
      if (!this._sheet) return;
      this._syncSize();
      this._syncPrintPageRule();
      this._syncFixedSizeMeta();
      this._syncPrintSizingMeta();
      this._scheduleMeasure();
    }
    _render() {
      this._root.innerHTML = `
        <style>${stylesheet}</style>
        <style id="vars"></style>
        <div class="sheet" data-screen-label="Document">
          <table class="frame" role="presentation">
            <thead><tr><th><div class="hdr-space"><slot name="header"></slot></div></th></tr></thead>
            <tbody><tr><td class="body"><div class="fit-box"><div class="fit"><slot></slot></div></div></td></tr></tbody>
            <tfoot><tr><td><div class="ftr-space"><slot name="footer"></slot></div></td></tr></tfoot>
          </table>
        </div>`;
      this._sheet = this._root.querySelector('.sheet');
      this._vars = this._root.getElementById('vars');
    }

    /** Runtime sizing lives in a shadow <style> :host rule, never on the
     *  light-DOM host element, so serialize-persist can't write it back. */
    _syncSize(hdrH, ftrH) {
      // Scaled-fit mode: content at its authored size, scaled onto the
      // printable area (page minus margins on both axes). The factor is a
      // plain number var so calc(length * number) stays valid; 4 decimals
      // keeps the shadow style stable across re-measures. Upscaling is
      // allowed — print transforms are vector, so text and CSS stay crisp
      // (raster images soften, which the catalog bullet warns about).
      const fit = this._contentFit();
      let fitVars = '';
      if (fit) {
        const marginPx = toPx(this.pageMargin) || 0;
        const availW = toPx(this.pageWidth) - 2 * marginPx;
        const availH = toPx(this.pageHeight) - 2 * marginPx;
        const scale = Math.min(availW / fit[2], availH / fit[3]);
        if (scale > 0 && Number.isFinite(scale)) {
          fitVars = '--doc-fit-w:' + fit[0] + ';' + '--doc-fit-h:' + fit[1] + ';' + '--doc-fit-scale:' + scale.toFixed(4) + ';';
        }
      }
      this._sheet.classList.toggle('fit-mode', !!fitVars);
      // Numeric w/h ratio for the paginated page cards' aspect-ratio —
      // aspect-ratio takes a number, not a length ratio, so compute it
      // here (CSS length division isn't portable). 6 decimals keeps the
      // shadow style stable across re-syncs.
      const arW = toPx(this.pageWidth);
      const arH = toPx(this.pageHeight);
      const ar = arW > 0 && arH > 0 ? (arW / arH).toFixed(6) : '0.772727';
      this._vars.textContent = ':host{' + fitVars + '--doc-page-ar:' + ar + ';' + '--doc-page-w:' + this.pageWidth + ';' + '--doc-page-h:' + this.pageHeight + ';' + '--doc-page-margin:' + this.pageMargin + ';' + '--doc-hdr-h:' + (hdrH || 0) + 'px;' + '--doc-ftr-h:' + (ftrH || 0) + 'px;' + '--doc-hdr-pad:' + (hdrH ? '0.35in' : '0px') + ';' + '--doc-ftr-pad:' + (ftrH ? '0.35in' : '0px') + '}';
    }

    /** @page is a no-op inside shadow DOM, so the rule lives in <head>.
     *  Re-appended on every sync so it stays last in source order — the
     *  @page cascade is source-order per descriptor, so this rule wins
     *  over any other @page rule in the document.
     *
     *  The @page SIZE is pinned where the page box IS part of the design:
     *  explicit-fixed-size mode (width + height authored), scaled-fit
     *  mode (the named sheet the fit targets), and explicit pagination
     *  (the named size the cards share — so card and sheet agree on
     *  every print path, and the export path's chosen paper overrides
     *  BOTH with one later rule). For FLOWING documents no paper size is
     *  emitted at all — the true size comes from the user's preference,
     *  injected by the export path or chosen in the print dialog — so a
     *  flowing document never fights the paper it lands on.
     *  margin: 0 is emitted in every mode: it leaves Chrome no margin box
     *  to draw its date/URL/page-count header in, and the visual margin
     *  lives on the sheet's own padding. */
    _syncPrintPageRule() {
      const id = 'doc-page-print';
      let tag = document.getElementById(id);
      if (!tag) {
        tag = document.createElement('style');
        tag.id = id;
      }
      document.head.appendChild(tag);
      // Three print-geometry regimes:
      // - true-size: the page IS the design — pin its exact size.
      // - scaled-fit (content-width/height): the fit factor is computed
      //   against the NAMED paper's printable area, so that paper must
      //   stay pinned or the scaled content overflows a smaller sheet
      //   (the export path re-fits and re-pins at print time on top).
      // - default modes: no paper size — but landscape still needs the
      //   paper-agnostic 'size: landscape' keyword, because the size
      //   descriptor is what carries orientation; without it a landscape
      //   document prints portrait whenever nothing injects a size.
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      // Explicit pagination pins the page box to the SAME values that
      // size the cards (the named size by default, the export path's
      // chosen paper when its later rule overrides both) — card and
      // sheet agree on every print path, and a mismatched real paper
      // shrinks-to-fit in the dialog instead of clipping a Letter card
      // on A4. Declared before the paginated read below so both derive
      // from one check.
      const paginatedNow = this.querySelector(':scope > .page') !== null;
      const sizeDescriptor = this._trueSizePx() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : this._contentFit() ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : paginatedNow ? 'size: ' + this.pageWidth + ' ' + this.pageHeight + '; ' : landscape ? 'size: landscape; ' : '';
      // WebKit never repeats the thead/tfoot spacers that carry a flowing
      // document's vertical page margins (see WK_PRINT above), so pages
      // after the first print edge-to-edge there. Carry the VERTICAL
      // margins on @page for WebKit instead, and the shadow print CSS
      // trims the first-page spacers by the same amount (.sheet.wk-print
      // rules). Horizontal inset stays on the sheet's own padding in
      // every engine. Blink keeps margin: 0 (a nonzero margin there
      // re-opens the box Chrome draws its header furniture in). One cost,
      // learned in testing: Safari's own date/URL headers are a USER
      // dialog setting ("Print headers and footers") that renders in the
      // margin area when room exists — margin: 0 only suppressed it by
      // leaving no room, and no CSS controls it. The export dialog's
      // Safari guide teaches turning the setting off for flowing
      // documents. Explicitly paginated and fixed-size documents keep
      // margin: 0 everywhere: their pages ARE the sheet.
      const wkFlowing = WK_PRINT && !paginatedNow && !this._trueSizePx() && !this._contentFit();
      const marginDescriptor = wkFlowing ? 'margin: ' + this.pageMargin + ' 0; ' : 'margin: 0; ';
      // Shadow-internal marker (never serialized), kept in lockstep with
      // the @page decision above: the print CSS trims the first-page
      // spacers ONLY while @page actually carries the margins — a
      // true-size or scaled-fit sheet keeps margin: 0 and must keep its
      // spacers too. Re-synced here so attribute changes and pagination
      // flips move both together.
      if (this._sheet) this._sheet.classList.toggle('wk-print', wkFlowing);
      tag.textContent = '@page { ' + sizeDescriptor + marginDescriptor + '} ' + '@media print { html, body { margin: 0 !important; padding: 0 !important; background: none !important; height: auto !important; overflow: visible !important; } ' + 'h1,h2,h3,h4,h5,h6 { break-after: avoid; } ' + 'figure,pre,blockquote,img,svg,tr { break-inside: avoid; } ' + 'p,li { orphans: 3; widows: 3; } ' + '* { -webkit-print-color-adjust: exact; print-color-adjust: exact; ' + 'backdrop-filter: none !important; -webkit-backdrop-filter: none !important; } ' + '*, *::before, *::after { animation-delay: -99s !important; animation-duration: .001s !important; ' + 'animation-iteration-count: 1 !important; animation-fill-mode: both !important; ' + 'animation-play-state: running !important; transition-duration: 0s !important; } }';
    }

    /** Typographic defaults for document text: balance headings, avoid
     *  widowed/orphaned words in body copy (browsers without text-wrap
     *  support drop the declarations). Zero-specificity via :where() so
     *  any text-wrap authored on those elements wins; document-level so the
     *  rules reach the slotted (light DOM) content — shadow styles can't.
     *  data-omelette-injected marks the tag for the host editor to strip
     *  at serialize, so it is never written back as authored source. */
    _ensureTextWrapDefaults() {
      if (document.getElementById('doc-page-text-wrap')) return;
      const tag = document.createElement('style');
      tag.id = 'doc-page-text-wrap';
      tag.setAttribute('data-omelette-injected', '');
      tag.textContent = ':where(h1,h2,h3,h4,h5,h6){text-wrap:balance}' + ':where(p,li,blockquote,figcaption){text-wrap:pretty}';
      document.head.appendChild(tag);
    }

    /** Declares that this document owns its print CSS. The instant-PDF
     *  export checks for the meta by NAME PRESENCE alone (content is
     *  ignored) and skips its automatic print-CSS injections, so the
     *  component's @page geometry is never overridden by a heuristic.
     *  data-omelette-injected keeps it out of serialized source. */
    _ensureOwnsPrintMeta() {
      if (document.getElementById('doc-page-owns-print')) return;
      const tag = document.createElement('meta');
      tag.id = 'doc-page-owns-print';
      tag.name = 'omelette-owns-print';
      tag.content = 'true';
      tag.setAttribute('data-omelette-injected', '');
      document.head.appendChild(tag);
    }

    /** This page's valid true-size page box (explicit width AND height)
     *  as [w, h] px ints, or null when the mode is off. */
    _trueSizePx() {
      if (!safeLen(this.getAttribute('width'), null) || !safeLen(this.getAttribute('height'), null)) return null;
      const w = Math.round(toPx(this.pageWidth));
      const h = Math.round(toPx(this.pageHeight));
      return w > 0 && h > 0 ? [w, h] : null;
    }

    /** True-size pages (explicit width AND height) also declare the page
     *  box as the preview size: the in-app preview reads
     *  meta[name="omelette-fixed-size"] (content "W,H" in px ints) and
     *  scales the sheet into view — without it an 18in poster previews at
     *  true size with scrollbars. Never overrides an author-set meta
     *  (only the component's own id is managed). The meta is page-global
     *  while doc-page instances are not, so every sync recomputes the
     *  page-wide owner — the first connected true-size doc-page — and a
     *  non-true-size sibling's sync can never delete the owner's meta.
     *  Removed when no true-size page remains (the owner's disconnect
     *  re-syncs via any survivor) or when an author-set meta exists. */
    _syncFixedSizeMeta() {
      const id = 'doc-page-fixed-size';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-fixed-size"]:not([data-omelette-injected])');
      // The page-wide owner, not this instance: an upgraded true-size page
      // anywhere in the document keeps the meta alive and sized.
      let box = null;
      for (const el of document.querySelectorAll('doc-page')) {
        box = typeof el._trueSizePx === 'function' ? el._trueSizePx() : null;
        if (box) break;
      }
      if (!box || authored) {
        if (own) own.remove();
        return;
      }
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-fixed-size';
      tag.content = box[0] + ',' + box[1];
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }

    /** This page's print-sizing mode: 'fixed' when an explicit width AND
     *  height are authored (the page is the design's own size), else the
     *  default paper in the authored orientation. */
    _printSizingMode() {
      if (this._trueSizePx()) return 'fixed';
      const landscape = (this.getAttribute('orientation') || '').trim().toLowerCase() === 'landscape';
      return landscape ? 'default-landscape' : 'default-portrait';
    }

    /** Announces the print-sizing mode to the host app:
     *  meta[name="omelette-print-sizing"] with content 'default-portrait',
     *  'default-landscape', or 'fixed' (fixed pages also carry the
     *  omelette-fixed-size meta with the page box in px). The export path
     *  probes it to decide what true paper size to inject at print time —
     *  in the default modes the component emits no paper size of its own.
     *  Same page-global ownership rules as the fixed-size meta above:
     *  first connected doc-page owns it, an authored meta is never
     *  overridden, removed when no doc-page remains. */
    _syncPrintSizingMeta() {
      const id = 'doc-page-print-sizing';
      const own = document.getElementById(id);
      const authored = document.querySelector('meta[name="omelette-print-sizing"]:not([data-omelette-injected])');
      // A fixed page wins outright (mirroring the fixed-size loop above,
      // so the two metas can never contradict each other in a mixed
      // multi-page document); otherwise the first page's mode holds.
      let mode = null;
      for (const el of document.querySelectorAll('doc-page')) {
        if (typeof el._printSizingMode !== 'function') continue;
        const m = el._printSizingMode();
        if (m === 'fixed') {
          mode = m;
          break;
        }
        if (mode === null) mode = m;
      }
      if (!mode || authored) {
        if (own) own.remove();
        return;
      }
      // A deck-stage that connected first injected its own meta and
      // defers to any existing one — take it over, or the document ends
      // up with two conflicting injected metas (a doc-page page is the
      // document; the deck re-ensures its meta if every doc-page leaves).
      const deckMeta = document.getElementById('deck-stage-print-sizing');
      if (deckMeta) deckMeta.remove();
      const tag = own || document.createElement('meta');
      tag.id = id;
      tag.name = 'omelette-print-sizing';
      tag.content = mode;
      tag.setAttribute('data-omelette-injected', '');
      if (!own) document.head.appendChild(tag);
    }
    _scheduleMeasure() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._measure();
      });
    }

    /** Slot heights feed the print spacers (--doc-hdr-h / --doc-ftr-h), so
     *  they re-measure on content mutation, resize, and font load. The
     *  same pass detects explicit pagination (direct .page children) and
     *  toggles the sheet between the flowing-document card and the
     *  page-per-card stack — content edits can add or remove pages at any
     *  time, so this tracks the same mutations the measurement does. */
    _measure() {
      const hdr = this.querySelector(':scope > [slot="header"]');
      const ftr = this.querySelector(':scope > [slot="footer"]');
      const wasPaginated = this._sheet.classList.contains('paginated');
      this._sheet.classList.toggle('paginated', this.querySelector(':scope > .page') !== null);
      // The WebKit @page margin is flowing-only, so a pagination flip
      // must re-emit the rule (content edits can add or remove .page
      // sections at any time).
      if (this._sheet.classList.contains('paginated') !== wasPaginated) {
        this._syncPrintPageRule();
      }
      this._syncSize(hdr ? hdr.offsetHeight : 0, ftr ? ftr.offsetHeight : 0);
    }
  }
  if (!customElements.get('doc-page')) {
    customElements.define('doc-page', DocPage);
  }
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "exports/doc-page.js", error: String((e && e.message) || e) }); }

// ui_kits/keystone-app/Dashboard.jsx
try { (() => {
// Portfolio dashboard — KPI strip + initiative table.
(function () {
  const {
    Card,
    StatusPill,
    Badge,
    Button,
    Input
  } = window.KeystoneDesignSystem_37ff67;
  function KpiCard({
    eyebrow,
    value,
    delta,
    deltaTone
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: "var(--surface-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-md)",
        padding: "18px 20px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 10
      }
    }, eyebrow), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "baseline",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 30,
        fontWeight: 600,
        color: "var(--text-strong)",
        letterSpacing: "-0.01em"
      }
    }, value), delta && /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 13,
        fontWeight: 600,
        color: deltaTone
      }
    }, delta)));
  }
  function GateBar({
    gate,
    total,
    status
  }) {
    const color = status === "alert" ? "var(--ks-alert)" : status === "attention" ? "var(--ks-amber)" : "var(--ks-on-track)";
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 3,
        alignItems: "center"
      }
    }, Array.from({
      length: total
    }).map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      style: {
        width: 16,
        height: 6,
        borderRadius: 2,
        background: i < gate ? color : "var(--ks-limestone)"
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-muted)",
        marginLeft: 6
      }
    }, gate, "/", total));
  }
  function Dashboard({
    onOpen
  }) {
    const [q, setQ] = React.useState("");
    const rows = window.KS_INITIATIVES.filter(i => i.name.toLowerCase().includes(q.toLowerCase()));
    const th = {
      fontFamily: "var(--font-mono)",
      fontSize: 10,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--text-faint)",
      fontWeight: 600,
      textAlign: "left",
      padding: "0 16px 10px"
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "24px 28px",
        overflow: "auto"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement(KpiCard, {
      eyebrow: "Portfolio return \xB7 YTD",
      value: "$4.2M",
      delta: "+18%",
      deltaTone: "var(--ks-on-track)"
    }), /*#__PURE__*/React.createElement(KpiCard, {
      eyebrow: "Active initiatives",
      value: "6",
      delta: "2 in review",
      deltaTone: "var(--text-muted)"
    }), /*#__PURE__*/React.createElement(KpiCard, {
      eyebrow: "Off plumb",
      value: "1",
      delta: "Needs decision",
      deltaTone: "var(--ks-alert)"
    }), /*#__PURE__*/React.createElement(KpiCard, {
      eyebrow: "Committed spend",
      value: "$8.5M",
      delta: "of $10.1M",
      deltaTone: "var(--text-muted)"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-heading)",
        fontSize: 16,
        fontWeight: 700,
        color: "var(--text-strong)",
        flex: 1
      }
    }, "Initiatives"), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 220
      }
    }, /*#__PURE__*/React.createElement(Input, {
      placeholder: "Search",
      value: q,
      onChange: e => setQ(e.target.value),
      prefix: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "search",
        style: {
          width: 16,
          height: 16
        }
      })
    })), /*#__PURE__*/React.createElement(Button, {
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "plus",
        style: {
          width: 16,
          height: 16
        }
      })
    }, "New initiative")), /*#__PURE__*/React.createElement(Card, {
      padding: "0",
      style: {
        overflow: "hidden"
      }
    }, /*#__PURE__*/React.createElement("table", {
      style: {
        width: "100%",
        borderCollapse: "collapse"
      }
    }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
      style: {
        borderBottom: "1px solid var(--border-subtle)"
      }
    }, /*#__PURE__*/React.createElement("th", {
      style: {
        ...th,
        paddingTop: 14
      }
    }, "Initiative"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...th,
        paddingTop: 14
      }
    }, "Owner"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...th,
        paddingTop: 14
      }
    }, "Stage"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...th,
        paddingTop: 14
      }
    }, "Gates"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...th,
        paddingTop: 14
      }
    }, "Confidence"), /*#__PURE__*/React.createElement("th", {
      style: {
        ...th,
        paddingTop: 14
      }
    }, "Status"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((it, idx) => /*#__PURE__*/React.createElement("tr", {
      key: it.id,
      onClick: () => onOpen(it),
      style: {
        borderBottom: idx < rows.length - 1 ? "1px solid var(--border-subtle)" : "none",
        cursor: "pointer"
      },
      onMouseEnter: e => e.currentTarget.style.background = "var(--ks-chalk)",
      onMouseLeave: e => e.currentTarget.style.background = "transparent"
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 16px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-heading)",
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text-strong)"
      }
    }, it.name), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)"
      }
    }, it.team)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 16px",
        fontSize: 14,
        color: "var(--text-body)"
      }
    }, it.owner), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 16px"
      }
    }, /*#__PURE__*/React.createElement(Badge, {
      mono: true,
      tone: it.stage === "Launched" ? "info" : "neutral"
    }, it.stage)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 16px"
      }
    }, /*#__PURE__*/React.createElement(GateBar, {
      gate: it.gate,
      total: it.gatesTotal,
      status: it.status
    })), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 16px",
        fontFamily: "var(--font-mono)",
        fontSize: 14,
        color: "var(--text-strong)"
      }
    }, it.confidence, "%"), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "14px 16px"
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      status: it.status
    }))))))));
  }
  Object.assign(window, {
    Dashboard,
    GateBar
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/keystone-app/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/keystone-app/InitiativeDetail.jsx
try { (() => {
// Initiative detail — header, KPIs, gate timeline, decision actions.
(function () {
  const {
    Card,
    CardHeader,
    StatusPill,
    Badge,
    Button,
    Dialog
  } = window.KeystoneDesignSystem_37ff67;
  function GateRow({
    g,
    last
  }) {
    const map = {
      clear: {
        color: "var(--ks-on-track)",
        icon: "check",
        label: "Cleared"
      },
      flagged: {
        color: "var(--ks-alert)",
        icon: "triangle-alert",
        label: "Flagged"
      },
      pending: {
        color: "var(--ks-ink-300)",
        icon: "circle",
        label: "Pending"
      }
    }[g.state];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 16,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: "50%",
        background: g.state === "pending" ? "var(--surface-card)" : map.color,
        border: g.state === "pending" ? "1.5px solid var(--border-strong)" : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: g.state === "pending" ? "var(--text-faint)" : "#fff"
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": map.icon,
      style: {
        width: 16,
        height: 16
      }
    })), !last && /*#__PURE__*/React.createElement("div", {
      style: {
        width: 2,
        height: 34,
        background: "var(--border-default)"
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBottom: 20,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: "var(--text-faint)"
      }
    }, "GATE-", g.n), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: "var(--font-heading)",
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text-strong)"
      }
    }, g.name)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, map.label, " \xB7 ", g.date)));
  }
  function Stat({
    label,
    value,
    sub,
    tone
  }) {
    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--text-muted)",
        marginBottom: 6
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 24,
        fontWeight: 600,
        color: tone || "var(--text-strong)"
      }
    }, value), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--text-muted)",
        marginTop: 2
      }
    }, sub));
  }
  function InitiativeDetail({
    item,
    onBack
  }) {
    const it = item || window.KS_INITIATIVES[1];
    const [open, setOpen] = React.useState(false);
    const overBudget = it.spend > it.budget;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "24px 28px",
        overflow: "auto"
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        fontSize: 13,
        color: "var(--text-link)",
        padding: 0,
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "arrow-left",
      style: {
        width: 16,
        height: 16
      }
    }), " Portfolio"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        marginBottom: 22
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontFamily: "var(--font-heading)",
        fontSize: 31,
        fontWeight: 900,
        letterSpacing: "-0.02em",
        color: "var(--text-strong)"
      }
    }, it.name), /*#__PURE__*/React.createElement(StatusPill, {
      status: it.status
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        color: "var(--text-muted)",
        marginTop: 4
      }
    }, it.team, " \xB7 ", it.owner, " \xB7 ", /*#__PURE__*/React.createElement(Badge, {
      mono: true,
      tone: "neutral"
    }, it.stage))), /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "pause",
        style: {
          width: 16,
          height: 16
        }
      }),
      onClick: () => setOpen(true)
    }, "Hold for review"), /*#__PURE__*/React.createElement(Button, {
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "lock",
        style: {
          width: 16,
          height: 16
        }
      })
    }, "Fund initiative")), it.status !== "healthy" && /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        alignItems: "center",
        background: "rgba(199,125,58,.10)",
        border: "1px solid rgba(199,125,58,.35)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        marginBottom: 22
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "triangle-alert",
      style: {
        width: 18,
        height: 18,
        color: "var(--ks-amber-dark)"
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 14,
        color: "var(--ks-amber-dark)",
        fontWeight: 500
      }
    }, it.note)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1.4fr 1fr",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
      eyebrow: "Gate progress",
      title: `${it.gate} of ${it.gatesTotal} cleared`
    }), window.KS_GATES.map((g, i) => /*#__PURE__*/React.createElement(GateRow, {
      key: g.n,
      g: g,
      last: i === window.KS_GATES.length - 1
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Card, null, /*#__PURE__*/React.createElement(CardHeader, {
      eyebrow: "Financials"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 20
      }
    }, /*#__PURE__*/React.createElement(Stat, {
      label: "Spend",
      value: `$${it.spend}M`,
      sub: `of $${it.budget}M budget`,
      tone: overBudget ? "var(--ks-alert)" : undefined
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Projected return",
      value: `$${it.ret}M`,
      sub: it.return
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Confidence",
      value: `${it.confidence}%`
    }), /*#__PURE__*/React.createElement(Stat, {
      label: "Horizon",
      value: it.return
    }))), /*#__PURE__*/React.createElement(Card, {
      style: {
        background: "var(--ks-basalt)",
        borderColor: "var(--ks-basalt)"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 12,
        alignItems: "flex-start"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/plumb-assistant.svg",
      style: {
        width: 24,
        filter: "brightness(3)"
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "var(--ks-active-blue)",
        marginBottom: 6
      }
    }, "Plumb says"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 14,
        lineHeight: 1.5,
        color: "var(--ks-chalk)"
      }
    }, it.note, " Want me to line it up against a comparable initiative?")))))), /*#__PURE__*/React.createElement(Dialog, {
      open: open,
      onClose: () => setOpen(false),
      eyebrow: "Decision needed",
      title: `Hold ${it.name} for review?`,
      footer: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
        variant: "secondary",
        onClick: () => setOpen(false)
      }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
        variant: "danger",
        onClick: () => setOpen(false)
      }, "Hold initiative"))
    }, "Holding pauses the next release until the flagged gate is cleared. The owner will be notified."));
  }
  Object.assign(window, {
    InitiativeDetail
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/keystone-app/InitiativeDetail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/keystone-app/PlumbPanel.jsx
try { (() => {
// Plumb assistant — slide-over chat panel.
(function () {
  const {
    Button
  } = window.KeystoneDesignSystem_37ff67;
  function PlumbPanel({
    open,
    onClose
  }) {
    const seed = [{
      who: "plumb",
      text: "Two initiatives need a decision this week. Meridian is off plumb — it slipped past its spend gate."
    }, {
      who: "user",
      text: "What should I do about Meridian?"
    }, {
      who: "plumb",
      text: "Hold it. Spend is $2.9M against a $2.6M gate and confidence is 41%. Cobalt covers the same market at lower risk — want them side by side?"
    }];
    const [msgs, setMsgs] = React.useState(seed);
    const [draft, setDraft] = React.useState("");
    const send = () => {
      if (!draft.trim()) return;
      setMsgs(m => [...m, {
        who: "user",
        text: draft
      }, {
        who: "plumb",
        text: "Lining up Meridian and Cobalt now — comparing spend, confidence and return horizon."
      }]);
      setDraft("");
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: 360,
        background: "var(--surface-card)",
        borderLeft: "1px solid var(--border-subtle)",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform var(--dur-slow) var(--ease-out)",
        zIndex: 50
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "16px 18px",
        borderBottom: "1px solid var(--border-subtle)"
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/plumb-assistant.svg",
      style: {
        width: 20
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-heading)",
        fontWeight: 700,
        fontSize: 15,
        color: "var(--text-strong)"
      }
    }, "Plumb"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "var(--ks-on-track)"
      }
    }, "Reading your portfolio")), /*#__PURE__*/React.createElement("button", {
      onClick: onClose,
      "aria-label": "Close",
      style: {
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--text-muted)",
        display: "flex"
      }
    }, /*#__PURE__*/React.createElement("i", {
      "data-lucide": "x",
      style: {
        width: 18,
        height: 18
      }
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: "auto",
        padding: "18px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }
    }, msgs.map((m, i) => m.who === "plumb" ? /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        alignSelf: "flex-start",
        maxWidth: "86%",
        background: "var(--ks-chalk)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "0 10px 10px 10px",
        padding: "10px 13px",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "var(--text-body)"
      }
    }, m.text) : /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        alignSelf: "flex-end",
        maxWidth: "86%",
        background: "var(--ks-basalt)",
        borderRadius: "10px 10px 0 10px",
        padding: "10px 13px",
        fontSize: 13.5,
        lineHeight: 1.5,
        color: "var(--ks-chalk)"
      }
    }, m.text)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8,
        flexWrap: "wrap"
      }
    }, ["Compare Meridian & Cobalt", "What's off plumb?"].map(s => /*#__PURE__*/React.createElement("button", {
      key: s,
      onClick: () => {
        setDraft(s);
      },
      style: {
        fontFamily: "var(--font-body)",
        fontSize: 12,
        color: "var(--text-link)",
        background: "var(--surface-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-pill)",
        padding: "5px 12px",
        cursor: "pointer"
      }
    }, s)))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "14px 16px",
        borderTop: "1px solid var(--border-subtle)",
        display: "flex",
        gap: 8,
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("input", {
      value: draft,
      onChange: e => setDraft(e.target.value),
      onKeyDown: e => e.key === "Enter" && send(),
      placeholder: "Ask Plumb\u2026",
      style: {
        flex: 1,
        height: 38,
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-sm)",
        padding: "0 12px",
        fontFamily: "var(--font-body)",
        fontSize: 14,
        outline: "none",
        color: "var(--text-strong)"
      }
    }), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      onClick: send,
      iconLeft: /*#__PURE__*/React.createElement("i", {
        "data-lucide": "arrow-up",
        style: {
          width: 16,
          height: 16
        }
      })
    }, " ")));
  }
  Object.assign(window, {
    PlumbPanel
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/keystone-app/PlumbPanel.jsx", error: String((e && e.message) || e) }); }

// ui_kits/keystone-app/Shell.jsx
try { (() => {
// Keystone app shell — fixed left rail (basalt) + top bar.
(function () {
  const {
    IconButton
  } = window.KeystoneDesignSystem_37ff67;
  function KIcon({
    n,
    size = 20,
    color
  }) {
    return /*#__PURE__*/React.createElement("i", {
      "data-lucide": n,
      style: {
        width: size,
        height: size,
        color
      }
    });
  }
  function Rail({
    view,
    setView,
    onPlumb
  }) {
    const items = [{
      id: "portfolio",
      icon: "layout-grid",
      label: "Portfolio"
    }, {
      id: "initiative",
      icon: "target",
      label: "Initiatives"
    }, {
      id: "gates",
      icon: "git-commit-horizontal",
      label: "Gates"
    }, {
      id: "reports",
      icon: "bar-chart-3",
      label: "Reports"
    }];
    return /*#__PURE__*/React.createElement("nav", {
      style: {
        width: 72,
        background: "var(--surface-nav)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "18px 0",
        gap: 8,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/mark-reversed.svg",
      style: {
        width: 30,
        marginBottom: 18
      },
      alt: "Keystone"
    }), items.map(it => {
      const active = view === it.id;
      return /*#__PURE__*/React.createElement("button", {
        key: it.id,
        onClick: () => setView(it.id),
        title: it.label,
        style: {
          width: 44,
          height: 44,
          borderRadius: "var(--radius-sm)",
          border: "none",
          cursor: "pointer",
          background: active ? "var(--ks-basalt-600)" : "transparent",
          color: active ? "var(--ks-chalk)" : "var(--ks-ink-300)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "background var(--dur-fast) var(--ease-standard)"
        }
      }, /*#__PURE__*/React.createElement(KIcon, {
        n: it.icon
      }));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("button", {
      onClick: onPlumb,
      title: "Ask Plumb",
      style: {
        width: 44,
        height: 44,
        borderRadius: "var(--radius-sm)",
        border: "none",
        cursor: "pointer",
        background: "var(--ks-active-blue)",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }
    }, /*#__PURE__*/React.createElement(KIcon, {
      n: "ruler"
    })));
  }
  function TopBar({
    title,
    sub,
    children
  }) {
    return /*#__PURE__*/React.createElement("header", {
      style: {
        height: 68,
        borderBottom: "1px solid var(--border-subtle)",
        background: "var(--surface-card)",
        display: "flex",
        alignItems: "center",
        padding: "0 28px",
        gap: 16,
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-heading)",
        fontSize: 19,
        fontWeight: 700,
        color: "var(--text-strong)",
        letterSpacing: "-0.01em"
      }
    }, title), sub && /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: 13,
        color: "var(--text-muted)"
      }
    }, sub)), children);
  }
  Object.assign(window, {
    Rail,
    TopBar,
    KIcon
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/keystone-app/Shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/keystone-app/data.js
try { (() => {
// Keystone app — sample portfolio data (fake, on-brand).
const KS_INITIATIVES = [{
  id: "atlas",
  name: "Atlas",
  owner: "D. Okafor",
  team: "Payments",
  stage: "Funded",
  status: "healthy",
  spend: 1.8,
  budget: 2.4,
  gate: 4,
  gatesTotal: 5,
  confidence: 86,
  return: "9 mo",
  ret: 4.2,
  note: "Clears every gate. Returns in nine months."
}, {
  id: "meridian",
  name: "Meridian",
  owner: "S. Reyes",
  team: "Growth",
  stage: "Gate review",
  status: "alert",
  spend: 2.9,
  budget: 2.6,
  gate: 3,
  gatesTotal: 5,
  confidence: 41,
  return: "—",
  ret: 1.1,
  note: "Slipped past its spend gate. Decision needed before next release."
}, {
  id: "beacon",
  name: "Beacon",
  owner: "J. Alvarez",
  team: "Platform",
  stage: "Funded",
  status: "attention",
  spend: 1.2,
  budget: 1.5,
  gate: 3,
  gatesTotal: 5,
  confidence: 63,
  return: "14 mo",
  ret: 2.0,
  note: "On plan, but confidence is drifting. Watch the next gate."
}, {
  id: "harbor",
  name: "Harbor",
  owner: "M. Lindqvist",
  team: "Data",
  stage: "Launched",
  status: "healthy",
  spend: 0.9,
  budget: 1.0,
  gate: 5,
  gatesTotal: 5,
  confidence: 92,
  return: "6 mo",
  ret: 3.1,
  note: "Launched inside every gate. Watching adoption."
}, {
  id: "vanta",
  name: "Vanta",
  owner: "P. Nwosu",
  team: "Security",
  stage: "Discovery",
  status: "neutral",
  spend: 0.1,
  budget: 0.8,
  gate: 1,
  gatesTotal: 5,
  confidence: 52,
  return: "—",
  ret: 0,
  note: "Early. Awaiting the first gate review."
}, {
  id: "cobalt",
  name: "Cobalt",
  owner: "R. Haas",
  team: "Growth",
  stage: "Gate review",
  status: "attention",
  spend: 1.6,
  budget: 1.8,
  gate: 2,
  gatesTotal: 5,
  confidence: 58,
  return: "18 mo",
  ret: 1.6,
  note: "Return horizon lengthening. Compare against Beacon."
}];
const KS_GATES = [{
  n: 1,
  name: "Problem fit",
  state: "clear",
  date: "Feb 12"
}, {
  n: 2,
  name: "Solution fit",
  state: "clear",
  date: "Apr 03"
}, {
  n: 3,
  name: "Spend gate",
  state: "flagged",
  date: "Jun 20"
}, {
  n: 4,
  name: "Launch readiness",
  state: "pending",
  date: "—"
}, {
  n: 5,
  name: "Post-launch review",
  state: "pending",
  date: "—"
}];
window.KS_INITIATIVES = KS_INITIATIVES;
window.KS_GATES = KS_GATES;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/keystone-app/data.js", error: String((e && e.message) || e) }); }

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.CardHeader = __ds_scope.CardHeader;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

})();
