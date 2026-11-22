import React from 'react';

/**
 * Chip component per UI Section 7.17:
 * 24px high pill, --tile fill, 10px text.
 */
export function Chip({
  children,
  className = '',
  onClick,
  active = false,
  icon: Icon,
  ...props
}) {
  const isClickable = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`inline-flex items-center gap-1.5 h-6 px-3 rounded-full text-[10px] font-medium transition-colors select-none ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-tile text-text hover:bg-bg-subtle'
      } ${
        isClickable
          ? 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2'
          : ''
      } ${className}`}
      {...props}
    >
      {Icon && <Icon className="w-3 h-3 text-muted" />}
      {children}
    </span>
  );
}

export default Chip;
