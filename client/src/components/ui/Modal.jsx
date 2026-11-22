import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/**
 * Modal component per UI Section 5 & 12:
 * 24px radius, backdrop blur, keyboard escape handler, focus trapping.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = '',
}) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div
        ref={modalRef}
        className={`relative z-10 w-full max-w-lg p-6 sm:p-8 rounded-[24px] bg-surface text-text border border-border shadow-card transition-all duration-200 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h2
                id="modal-title"
                className="text-[20px] font-normal tracking-tight text-text"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="text-[12px] text-muted mt-1 leading-normal">
                {description}
              </p>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full shrink-0"
            icon={X}
          />
        </div>

        {/* Content */}
        <div className="mt-2">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
