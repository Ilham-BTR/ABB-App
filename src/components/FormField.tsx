import { InputHTMLAttributes, forwardRef } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  required?: boolean;
};

export const FormField = forwardRef<HTMLInputElement, Props>(function FormField(
  { label, required, className = "", ...rest },
  ref
) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <input ref={ref} required={required} className={`input ${className}`} {...rest} />
    </label>
  );
});
