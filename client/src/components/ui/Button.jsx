import React from 'react';

/**
 * Button component implementing UI Design Spec Section 7.15:
 * Variants: primary, secondary (outline), ghost (icon circle), onDark, text, destructive, more
 * Sizes: lg (44px), sm (36px)
 */
export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  className = '',
  disabled = false,
  type = 'button',
  icon: Icon,
  iconPosition = 'left',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-all duration-150 select-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text focus-visible:ring-offset-2';

  // Sizing per UI 7.15
  const sizeStyles = {
    lg: 'h-11 px-6 text-[13px] rounded-full',
    sm: 'h-9 px-4 text-[12px] rounded-full',
    iconLg: 'w-11 h-11 p-0 rounded-full',
    iconSm: 'w-9 h-9 p-0 rounded-full',
    inline: 'p-0 h-auto rounded-none',
  };

  // Variants per UI 7.15 & Section 2.3
  const variantStyles = {
    primary:
      'bg-primary text-primary-foreground hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0',
    secondary:
      'bg-transparent border border-border text-text hover:border-text active:bg-bg-subtle',
    ghost:
      'bg-transparent border border-border text-text hover:border-text active:scale-95',
    ghostBorderless:
      'bg-transparent text-text hover:bg-tile active:scale-95',
    onDark:
      'bg-white text-black hover:opacity-90 hover:-translate-y-[1px] active:translate-y-0',
    destructive:
      'bg-transparent border border-danger text-danger hover:bg-danger hover:text-white',
    text:
      'bg-transparent text-[12px] text-text hover:underline underline-offset-4',
    more:
      'bg-transparent text-[10px] font-bold tracking-wider uppercase text-text hover:underline underline-offset-4',
  };

  // Determine actual sizing
  let computedSize = sizeStyles[size] || sizeStyles.lg;
  if (variant === 'ghost' || variant === 'ghostBorderless') {
    computedSize = size === 'sm' ? sizeStyles.iconSm : sizeStyles.iconLg;
  } else if (variant === 'text' || variant === 'more') {
    computedSize = sizeStyles.inline;
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${baseStyles} ${computedSize} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      {...props}
    >
      {Icon && iconPosition === 'left' && (
        <Icon className={`${variant === 'ghost' ? 'w-4 h-4' : 'w-3.5 h-3.5 mr-2'}`} />
      )}
      {children}
      {Icon && iconPosition === 'right' && (
        <Icon className="w-3.5 h-3.5 ml-2" />
      )}
    </button>
  );
}

export default Button;
