import React, { forwardRef } from 'react';

/**
 * Input component per UI Section 7.16:
 * Pill input (44px) with 1px --border, 16px side padding, 12px placeholder --text-faint.
 * Focus ring: 2px outline in --text with 2px offset.
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    icon: Icon,
    rightElement,
    className = '',
    id,
    disabled,
    ...props
  },
  ref
) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-[11px] font-medium text-muted tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {Icon && (
          <span className="absolute left-4 text-muted pointer-events-none">
            <Icon className="w-4 h-4" />
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={`w-full h-11 px-4 text-[13px] text-text bg-transparent rounded-full border border-border placeholder:text-faint transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 ${
            Icon ? 'pl-11' : ''
          } ${rightElement ? 'pr-12' : ''} ${
            error ? 'border-danger focus-visible:ring-danger' : 'hover:border-text'
          } ${className}`}
          {...props}
        />

        {rightElement && (
          <div className="absolute right-2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <span className="text-[11px] text-danger font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-[11px] text-muted">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Input;
