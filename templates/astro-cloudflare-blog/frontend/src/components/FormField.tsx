import type { JSX } from 'preact';

type Props = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  value?: string;
  multiline?: boolean;
};

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  required,
  maxLength,
  minLength,
  value,
  multiline,
}: Props) {
  const id = `field-${name}`;

  const inputProps: JSX.HTMLAttributes<HTMLInputElement | HTMLTextAreaElement> = {
    id,
    name,
    placeholder,
    required,
    maxLength,
    minLength,
    value,
    className: 'form-field-input',
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      {multiline ? (
        <textarea {...(inputProps as JSX.HTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input
          type={type}
          {...(inputProps as JSX.HTMLAttributes<HTMLInputElement>)}
        />
      )}
    </div>
  );
}
