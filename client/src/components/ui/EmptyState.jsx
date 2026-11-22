import React from 'react';
import { Car } from 'lucide-react';
import { Button } from './Button';

/**
 * EmptyState component per UI Section 8.8:
 * Centred cut-out vehicle illustration on a rounded-24px tile, 24px/300 heading, one pill CTA.
 */
export function EmptyState({
  title = 'No vehicles found',
  description = 'Try adjusting your search filters or browse other available models.',
  actionLabel,
  onAction,
  icon: Icon = Car,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 max-w-md mx-auto ${className}`}
    >
      {/* Soft rounded-24px tile */}
      <div className="flex items-center justify-center w-24 h-24 mb-6 rounded-[24px] bg-tile text-muted">
        <Icon className="w-10 h-10 opacity-70" strokeWidth={1.5} />
      </div>

      <h3 className="text-[24px] font-light tracking-tight text-text mb-2">
        {title}
      </h3>

      <p className="text-[13px] text-muted leading-relaxed mb-6 max-w-sm">
        {description}
      </p>

      {actionLabel && (
        <Button variant="primary" size="lg" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
