import * as React from "react";

/** Radio option — group by shared `name`. */
export interface RadioProps {
  label?: React.ReactNode;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  value?: string;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}
export function Radio(props: RadioProps): JSX.Element;
