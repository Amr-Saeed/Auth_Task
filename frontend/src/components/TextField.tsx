import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
} from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  children?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function TextField({
  label,
  error,
  children,
  ref,
  ...input
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...input}
      />
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
      {children}
    </div>
  );
}
