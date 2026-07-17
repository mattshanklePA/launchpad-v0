import * as React from "react";

/**
 * Status vocabulary for the governance product — a colored dot + word.
 * The single source of truth for initiative / gate health.
 * @startingPoint section="Core" subtitle="On-track / attention / off-plumb status pill" viewport="700x110"
 */
export interface StatusPillProps {
  /** healthy=green · attention=amber · alert=red · neutral=grey. @default "neutral" */
  status?: "healthy" | "attention" | "alert" | "neutral";
  /** Override the default label text for the status. */
  children?: React.ReactNode;
  /** Solid fill instead of dot + outline. @default false */
  solid?: boolean;
  style?: React.CSSProperties;
}
export function StatusPill(props: StatusPillProps): JSX.Element;
