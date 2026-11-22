import React from 'react';

/**
 * Badge component per UI Section 7.17:
 * Discount badge: accent fill (--accent), white 9-10px/600 text, radius 6px, 2px 6px padding.
 * Count badge / dot badge.
 */
export function Badge({
  children,
  variant = 'discount',
  className = '',
  ...props
}) {
  if (variant === 'discount') {
    return (
      <span
        className={`inline-flex items-center justify-center bg-accent text-accent-foreground text-[10px] font-bold rounded-[6px] px-1.5 py-0.5 tracking-tight uppercase select-none ${className}`}
        {...props}
      >
        {children}
      </span>
    );
  }

  if (variant === 'dot') {
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full bg-accent ${className}`}
        {...props}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center h-5 px-2 rounded-full text-[10px] font-semibold bg-primary text-primary-foreground select-none ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export default Badge;
