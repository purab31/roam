import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Select component per UI Section 7.16:
 * 16px radius (rounded-md), 1px --border, focus ring 2px --text with 2px offset.
 */
export const Select = forwardRef(function Select(
  {
    label,
    error,
    helperText,
    options = [],
    placeholder = 'Select an option',
    className = '',
    id,
    disabled,
    children,
    ...props
  },
  ref
) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="text-[11px] font-medium text-muted tracking-wide"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={`w-full h-11 px-4 pr-10 text-[13px] text-text bg-transparent rounded-[16px] border border-border appearance-none cursor-pointer transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2 ${
            error ? 'border-danger' : 'hover:border-text'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="" disabled className="bg-surface text-muted">{placeholder}</option>}
          {children ||
            options.map(opt => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={val} value={val} className="bg-surface text-text">
                  {lbl}
                </option>
              );
            })}
        </select>

        <span className="absolute right-4 text-muted pointer-events-none">
          <ChevronDown className="w-4 h-4" />
        </span>
      </div>

      {error ? (
        <span className="text-[11px] text-danger font-medium">{error}</span>
      ) : helperText ? (
        <span className="text-[11px] text-muted">{helperText}</span>
      ) : null}
    </div>
  );
});

export default Select;
