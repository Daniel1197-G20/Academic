import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  className = ''
}) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Restrained matte backdrop - no excessive blur */}
      <div 
        className="fixed inset-0 bg-ink/30 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface - Level 2 Raised */}
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col bg-white dark:bg-navy-900 rounded-hero p-5 sm:p-6 shadow-tactile-modal border border-border dark:border-navy-800 animate-fade-in z-10 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3.5 border-b border-border dark:border-navy-800 shrink-0">
          <div className="pr-4">
            {title && (
              <h2 id="modal-title" className="text-base sm:text-lg font-semibold text-ink dark:text-white tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs sm:text-sm text-muted dark:text-navy-400 mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-btn text-muted hover:text-ink hover:bg-canvas dark:hover:bg-navy-800 border border-transparent hover:border-border dark:hover:border-navy-700 hover:shadow-tactile-surface transition-all active:translate-y-[1px]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="py-4 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
}
