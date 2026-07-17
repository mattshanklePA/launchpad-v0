import * as React from "react";

export interface SelectOption { value: string; label: string; }

/** Native select styled to match Input. */
export interface SelectProps {
  label?: string;
  hint?: string;
  error?: string;
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** Options as strings or {value,label}. */
  options?: (string | SelectOption)[];
  disabled?: boolean;
  style?: React.CSSProperties;
}
export function Select(props: SelectProps): JSX.Element;
