import React from 'react';
import { AlertTriangle } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs transition-opacity animate-fade-scale"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-[#18191b] rounded-2xl shadow-xl border border-slate-100 dark:border-[#26282a] p-6 transform transition-all animate-slide-up"
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-3 rounded-xl flex-shrink-0 ${
              isDestructive
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                : 'bg-blue-50 dark:bg-[#8ab4f8]/15 text-blue-600 dark:text-[#8ab4f8]'
            }`}
          >
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-modal-title" className="text-lg font-bold text-slate-900 dark:text-[#e8eaed]">
              {title}
            </h3>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-[#c4c7c5] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-[#e8eaed] bg-slate-100 hover:bg-slate-200 dark:bg-[#26282a] dark:hover:bg-[#444746] rounded-xl transition-colors cursor-pointer min-h-[44px] google-btn-press"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 text-sm font-bold text-white rounded-xl transition-colors cursor-pointer min-h-[44px] google-btn-press ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-sm shadow-rose-200 dark:shadow-none'
                : 'bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
