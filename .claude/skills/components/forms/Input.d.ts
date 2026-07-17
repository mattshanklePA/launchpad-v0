import * as React from "react";

/** Labelled text field with mono uppercase label, optional prefix/suffix, hint & error. */
export interface InputProps {
  label?: string;
  hint?: string;
  /** Error message; turns the field red and replaces the hint. */
  error?: string;
  /** Node before the input (icon or unit). */
  prefix?: React.ReactNode;
  /** Node after the input (unit, e.g. "USD"). */
  suffix?: React.ReactNode;
  id?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export function Input(props: InputProps): JSX.Element;
