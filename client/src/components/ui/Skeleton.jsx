import React from 'react';

/**
 * Skeleton component per UI Section 7.10 & Section 8.8:
 * Pale grey rounded tile / placeholders with subtle pulse animation.
 */
export function Skeleton({
  variant = 'text',
  className = '',
  width,
  height,
  ...props
}) {
  const base = 'animate-pulse bg-tile';

  const variants = {
    text: 'h-4 rounded-full',
    title: 'h-8 rounded-full',
    tile: 'w-full aspect-[4/3] rounded-[24px]',
    circle: 'rounded-full aspect-square',
    button: 'h-11 rounded-full',
  };

  const style = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div
      className={`${base} ${variants[variant] || variants.text} ${className}`}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full">
      <Skeleton variant="tile" className="h-[260px]" />
      <div className="flex flex-col gap-1.5 px-2">
        <Skeleton variant="text" className="w-3/4 h-4" />
        <Skeleton variant="text" className="w-1/3 h-3" />
        <Skeleton variant="text" className="w-1/2 h-2.5 mt-1" />
      </div>
    </div>
  );
}

export default Skeleton;
