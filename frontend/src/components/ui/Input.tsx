import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function Input({ id, label, error, className = '', ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');

  return (
    <label htmlFor={inputId} className="block">
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-3 text-ink outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/25 ${className}`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error ? (
        <span id={`${inputId}-error`} className="mt-2 block text-sm text-rose-300">
          {error}
        </span>
      ) : null}
    </label>
  );
}
