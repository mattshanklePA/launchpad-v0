import * as React from "react";

/** Square icon-only button; requires an accessible label. */
export interface IconButtonProps {
  /** Icon node (Lucide SVG, 18–22px). */
  children: React.ReactNode;
  /** Accessible label (aria-label + title). */
  label: string;
  variant?: "ghost" | "secondary" | "primary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

export function IconButton(props: IconButtonProps): JSX.Element;
