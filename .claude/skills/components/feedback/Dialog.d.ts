import * as React from "react";

/** Modal dialog with basalt scrim, mono eyebrow, and a chalk footer for actions. */
export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  /** Mono uppercase eyebrow above the title. */
  eyebrow?: string;
  children?: React.ReactNode;
  /** Footer node — put action Buttons here (right-aligned). */
  footer?: React.ReactNode;
  /** Panel width. @default "480px" */
  width?: string;
}
export function Dialog(props: DialogProps): JSX.Element | null;
