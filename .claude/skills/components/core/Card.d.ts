import * as React from "react";

/**
 * White content surface with hairline limestone border and 8px radius.
 * Keystone leans on borders over shadow — raise only when floating.
 * @startingPoint section="Core" subtitle="Bordered content surface + optional header" viewport="700x220"
 */
export interface CardProps {
  children: React.ReactNode;
  /** CSS padding. @default "24px" */
  padding?: string;
  /** Apply resting shadow-sm. @default false */
  raised?: boolean;
  /** Hover affordance (border + shadow) for clickable cards. @default false */
  interactive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): JSX.Element;

export interface CardHeaderProps {
  /** Mono uppercase eyebrow. */
  eyebrow?: string;
  title?: string;
  /** Right-aligned action node (e.g. IconButton). */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export function CardHeader(props: CardHeaderProps): JSX.Element;
