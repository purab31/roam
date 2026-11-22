import React, { forwardRef } from 'react';

/**
 * Textarea component per UI Section 7.16:
 * 16px radius (rounded-md), 1px --border, focus ring 2px --text with 2px offset.
 */
export const Textarea = forwardRef(function Textarea(
  {
    label,
    error,
    helperText,
    rows = 4,
    className = '',
    id,
    disabled,
    ...props
  },
  ref
) {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="text-[11px] font-medium text-muted tracking-wide"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        rows={rows}
        disabled={disabled}
        className={`w-full p-4 text-[13px] text-text bg-transparent rounded-[16px] border border-border placeholder:text-faint transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 ${
          error ? 'border-danger' : 'hover:border-text'
        } ${className}`}
        {...props}
      />

      {error ? (
        <span className="text-[11px] text-danger font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-[11px] text-muted">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Textarea;
