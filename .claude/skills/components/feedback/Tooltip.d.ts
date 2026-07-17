import * as React from "react";

/** Basalt tooltip shown on hover/focus of a single trigger child. */
export interface TooltipProps {
  /** Tooltip text. */
  label: React.ReactNode;
  /** The trigger element. */
  children: React.ReactNode;
  placement?: "top" | "bottom" | "left" | "right";
}
export function Tooltip(props: TooltipProps): JSX.Element;
