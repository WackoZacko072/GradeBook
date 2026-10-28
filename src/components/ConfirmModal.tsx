import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModalPortal } from './ModalPortal';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
}) => {
  return (
    <ModalPortal
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="max-w-lg"
      aria-labelledby="confirm-modal-title"
      className="p-6 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3.5 rounded-2xl flex-shrink-0 ${
            isDestructive
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              : 'bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8]'
          }`}
        >
          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
        </div>
        <div className="flex-1">
          <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
            {title}
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-[#c4c7c5] leading-relaxed">
            {message}
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-colors cursor-pointer min-h-[44px] google-btn-press"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`w-full sm:w-auto px-6 py-2.5 text-xs sm:text-sm font-bold text-white rounded-xl transition-colors cursor-pointer min-h-[44px] google-btn-press ${
            isDestructive
              ? 'bg-rose-600 hover:bg-rose-700 shadow-sm'
              : 'bg-blue-600 hover:bg-blue-700 shadow-sm'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </ModalPortal>
  );
};
