/* @ds-bundle: {"format":4,"namespace":"KeystoneDesignSystem_37ff67","components":[{"name":"Badge","sourcePath":"components/core/Badge.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Card","sourcePath":"components/core/Card.jsx"},{"name":"CardHeader","sourcePath":"components/core/Card.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"}],"sourceHashes":{"components/core/Badge.jsx":"b35061d05dd0","components/core/Button.jsx":"27ecbf6bd6c2","components/core/Card.jsx":"f51c549e1b21","components/core/IconButton.jsx":"70df8cacdf93","components/core/StatusPill.jsx":"d0fba98786c7","components/feedback/Dialog.jsx":"d5432da668fd","components/feedback/Tooltip.jsx":"f32f1589c0a8","components/forms/Checkbox.jsx":"55e27efe59d7","components/forms/Input.jsx":"c306f0c2fdae","components/forms/Radio.jsx":"8c7738023109","components/forms/Select.jsx":"200fc6284504","components/forms/Switch.jsx":"2cbd6df23de4","ui_kits/keystone-app/Dashboard.jsx":"6e7802c44a87","ui_kits/keystone-app/InitiativeDetail.jsx":"798c79864990","ui_kits/keystone-app/PlumbPanel.jsx":"80ff18c0409f","ui_kits/keystone-app/Shell.jsx":"f08e0b089740","ui_kits/keystone-app/data.js":"4c77df8b9f37"},"inlinedExternals":[],"unexposedExports":[]} */

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
