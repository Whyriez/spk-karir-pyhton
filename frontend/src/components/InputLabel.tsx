import type { LabelHTMLAttributes, ReactNode } from "react";

type Props = LabelHTMLAttributes<HTMLLabelElement> & {
  value?: string;
  required?: boolean;
  children?: ReactNode;
};

export default function InputLabel({
  value,
  required,
  className = "",
  children,
  ...props
}: Props) {
  return (
    <label
      {...props}
      className={`block text-sm font-medium text-gray-700 ${className}`}
    >
      {value ?? children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}
