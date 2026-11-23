import React from 'react';

/**
 * UI 7.7 Specification Table & Filter Facet Row
 * - Two-column row: label left (muted, 11-12px), value right (text, 11-12px),
 *   connected by a dotted leader line in --text-faint.
 * - Row height 28-32px, 11-12px type.
 * - When used in FilterPanel, supports clickable selection with active highlight.
 */
export function DottedSpecRow({
  label,
  value,
  count,
  selected = false,
  onClick = null,
  className = '',
}) {
  const isClickable = typeof onClick === 'function';

  const content = (
    <div
      className={`flex items-baseline justify-between w-full min-h-[30px] py-1 text-[12px] group select-none transition-colors ${
        selected ? 'text-text font-semibold' : 'text-muted'
      } ${isClickable ? 'cursor-pointer hover:text-text' : ''} ${className}`}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {/* Label Left */}
      <span
        className={`shrink-0 pr-2 truncate max-w-[55%] transition-colors ${
          selected ? 'text-text font-medium' : 'text-muted group-hover:text-text'
        }`}
      >
        {label}
      </span>

      {/* Dotted Leader Line in --text-faint */}
      <span
        className="grow border-b border-dotted border-text-faint/60 mx-1 mb-[5px]"
        aria-hidden="true"
      />

      {/* Value / Count Right */}
      <span
        className={`shrink-0 pl-2 text-right transition-colors ${
          selected
            ? 'text-text font-semibold'
            : count !== undefined
            ? 'text-muted/80 text-[11px] group-hover:text-text'
            : 'text-text font-normal'
        }`}
      >
        {count !== undefined ? count : value}
      </span>
    </div>
  );

  return content;
}

export default DottedSpecRow;