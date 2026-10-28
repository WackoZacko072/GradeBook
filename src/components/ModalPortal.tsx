import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

export interface ModalPortalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  /** Max width class, e.g. 'max-w-lg', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl' */
  maxWidth?: string;
  className?: string;
  overlayClassName?: string;
  role?: string;
  'aria-labelledby'?: string;
  closeOnBackdrop?: boolean;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-2xl',
  className = '',
  overlayClassName = '',
  role = 'dialog',
  'aria-labelledby': ariaLabelledBy,
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      role={role}
      aria-modal="true"
      aria-labelledby={ariaLabelledBy}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/75 backdrop-blur-md overflow-y-auto animate-fade-in ${overlayClassName}`}
      onClick={(e) => {
        if (e.target === e.currentTarget && closeOnBackdrop && onClose) {
          onClose();
        }
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#1e1f20] rounded-3xl shadow-2xl border border-slate-200/50 dark:border-white/10 flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[90vh] md:max-h-[88vh] my-auto overflow-hidden animate-fade-scale ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};
