import React, { useRef, useState } from 'react';
import { X, Download, Upload, RotateCcw, AlertCircle, CheckCircle } from 'lucide-react';
import type { ClassItem } from '../types/grade';
import { exportBackup, validateAndParseBackup } from '../utils/storage';
import { INITIAL_DEMO_CLASSES } from '../utils/sampleData';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  onRestoreClasses: (restored: ClassItem[]) => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  classes,
  onRestoreClasses,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    try {
      exportBackup(classes);
      setSuccessMsg('Backup downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch {
      setErrorMsg('Failed to download backup file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = validateAndParseBackup(text);
        onRestoreClasses(parsed);
        setSuccessMsg(`Restored ${parsed.length} classes successfully!`);
        setTimeout(() => {
          onClose();
        }, 1200);
      } catch (err: any) {
        setErrorMsg(err.message || 'Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetToDemo = () => {
    onRestoreClasses(INITIAL_DEMO_CLASSES);
    setSuccessMsg('Reset to demo classes!');
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="backup-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 p-6 transform transition-all animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 id="backup-modal-title" className="text-lg font-bold text-slate-900">
              Backup & Sync
            </h2>
            <p className="text-xs text-slate-500">
              Export and restore your grade records
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="mt-5 space-y-3">
          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900">
                  Export JSON Backup
                </span>
                <span className="block text-xs text-slate-500">
                  Download a backup file containing all your classes & grades
                </span>
              </div>
            </div>
          </button>

          {/* Import */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-700 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900">
                  Import JSON Backup
                </span>
                <span className="block text-xs text-slate-500">
                  Restore previously saved grade data from your device
                </span>
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Reset Demo */}
          <button
            type="button"
            onClick={handleResetToDemo}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-100 text-slate-500 rounded-xl group-hover:text-slate-800 transition-colors">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold text-slate-900">
                  Load Example Semester Data
                </span>
                <span className="block text-xs text-slate-500">
                  Pre-populates with realistic classes (Pre-Calculus, Econ, Physics)
                </span>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
