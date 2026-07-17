import * as React from "react";

/** Small metadata label — counts, categories, keys. For state use StatusPill. */
export interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "basalt" | "info" | "amber";
  /** Mono uppercase style for keys/codes. @default false */
  mono?: boolean;
  style?: React.CSSProperties;
}
export function Badge(props: BadgeProps): JSX.Element;
