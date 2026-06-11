import type { ReactNode } from 'react';

export function Field({
  label,
  wide,
  hint,
  children
}: {
  label: string;
  wide?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className={`field ${wide ? 'wide' : ''}`}>
      <span className="field-label">
        {label}
        {hint && <em>{hint}</em>}
      </span>
      {children}
    </label>
  );
}
