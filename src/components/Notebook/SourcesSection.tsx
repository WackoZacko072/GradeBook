import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Upload,
  FileText,
  Plus,
  Trash2,
  Eye,
  X,
  FileCode,
} from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import type { NoteSource } from '../../types/notebook';

interface SourcesSectionProps {
  sources: NoteSource[];
  onUpdateSources: (sources: NoteSource[]) => void;
}

export const SourcesSection: React.FC<SourcesSectionProps> = ({
  sources,
  onUpdateSources,
}) => {
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [viewingSource, setViewingSource] = useState<NoteSource | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newSources: NoteSource[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await readFileAsText(file);
        if (text && text.trim().length > 0) {
          newSources.push({
            id: `src_${Date.now()}_${i}`,
            name: file.name,
            type: 'file',
            fileSize: formatFileSize(file.size),
            addedAt: Date.now(),
            content: text,
          });
        }
      } catch (err) {
        console.error('Error reading uploaded file:', err);
      }
    }

    if (newSources.length > 0) {
      onUpdateSources([...sources, ...newSources]);
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        let result = (reader.result as string) || '';
        // Sanitize control characters
        result = result.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
        if (!result) {
          result = `[Document File Attachment: ${file.name} - ${formatFileSize(file.size)}]`;
        }
        resolve(result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle manual paste source
  const handleSavePastedSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    const newSource: NoteSource = {
      id: `src_pasted_${Date.now()}`,
      name: pasteTitle.trim() || `Pasted Source (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      type: 'text',
      fileSize: `${Math.round(pasteContent.length / 100) / 10} KB`,
      addedAt: Date.now(),
      content: pasteContent.trim(),
    };

    onUpdateSources([...sources, newSource]);
    setPasteTitle('');
    setPasteContent('');
    setIsPasteModalOpen(false);
  };

  // Delete source
  const handleDeleteSource = (id: string) => {
    onUpdateSources(sources.filter((s) => s.id !== id));
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Paperclip className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">
              Class & Note Files ({sources.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              Upload class slides, textbook chapters, or lecture notes to ground Slate AI questions
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.markdown,.csv,.json,.rtf,.html,.xml,.tex,.pdf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl text-xs font-bold transition-all cursor-pointer google-btn-press"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
            <span className="hidden sm:inline">Upload Files</span>
            <span className="sm:hidden">Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] rounded-xl text-xs font-semibold transition-all cursor-pointer google-btn-press"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paste Text</span>
          </button>
        </div>
      </div>

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="py-4 px-3 text-center bg-slate-50/70 dark:bg-[#0f0f10] border border-dashed border-slate-200 dark:border-[#26282a] rounded-xl text-xs text-slate-500 dark:text-[#9aa0a6]">
          <span>No external sources attached yet. The AI will generate questions strictly from your typed note above.</span>
        </div>
      ) : (
        <div
          className="w-full gap-2 pt-1"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          }}
        >
          {sources.map((src) => (
            <div
              key={src.id}
              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-[#0f0f10] hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 border border-slate-200/80 dark:border-[#26282a] rounded-xl text-xs group transition-colors min-w-0"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-slate-800 dark:text-[#e8eaed] truncate block">
                    {src.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-[#9aa0a6]">
                    {src.fileSize || 'Text'} &bull; {src.content.length.toLocaleString()} chars
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingSource(src)}
                  title="View Source Content"
                  className="p-1 text-slate-400 dark:text-[#9aa0a6] hover:text-blue-600 dark:hover:text-[#8ab4f8] rounded-md transition-colors cursor-pointer google-btn-press"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSource(src.id)}
                  title="Delete Source"
                  className="p-1 text-slate-400 dark:text-[#9aa0a6] hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer google-btn-press"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paste Text Modal */}
      <ModalPortal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        maxWidth="max-w-2xl"
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-white/10 flex-shrink-0 bg-slate-50/70 dark:bg-white/5">
          <h3 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]">Add Text Source</h3>
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(false)}
            className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg google-btn-press"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSavePastedSource} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs sm:text-sm">
            <div>
              <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">
                Source Title / Name:
              </label>
              <input
                type="text"
                required
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="e.g. Chapter 4 Reading Excerpt, Lecture 2 Slides..."
                className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">
                Source Content (Paste any article, reading, or notes):
              </label>
              <textarea
                rows={10}
                required
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="Paste lecture notes, study guide text, textbook definitions..."
                className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl text-xs sm:text-sm font-mono focus:outline-hidden leading-relaxed"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 p-4 border-t border-slate-100 dark:border-[#26282a] bg-slate-50/70 dark:bg-[#252628] flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#202123] rounded-xl cursor-pointer google-btn-press"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer google-btn-press shadow-xs"
            >
              Add Source
            </button>
          </div>
        </form>
      </ModalPortal>

      {/* View Source Modal */}
      <ModalPortal
        isOpen={!!viewingSource}
        onClose={() => setViewingSource(null)}
        maxWidth="max-w-4xl"
      >
        {viewingSource && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-[#26282a] flex-shrink-0 bg-slate-50/70 dark:bg-white/5">
              <div className="flex items-center gap-2.5 truncate">
                <FileCode className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <h3 className="font-bold text-slate-900 dark:text-[#e8eaed] text-base truncate">
                  {viewingSource.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSource(null)}
                className="p-1.5 text-slate-400 dark:text-[#9aa0a6] hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg cursor-pointer google-btn-press"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 dark:bg-[#0f0f10] p-5 sm:p-6 text-xs sm:text-sm font-mono text-slate-700 dark:text-[#c4c7c5] whitespace-pre-wrap leading-relaxed">
              {viewingSource.content}
            </div>

            <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-[#26282a] flex-shrink-0 text-xs sm:text-sm text-slate-400 dark:text-[#9aa0a6] bg-slate-50/70 dark:bg-[#252628]">
              <span>{viewingSource.content.length.toLocaleString()} characters &bull; {viewingSource.fileSize}</span>
              <button
                type="button"
                onClick={() => setViewingSource(null)}
                className="px-4 py-2 bg-slate-200/80 dark:bg-[#202123] hover:bg-slate-300 dark:hover:bg-[#26282a] text-slate-800 dark:text-[#e8eaed] font-bold rounded-xl cursor-pointer google-btn-press text-xs sm:text-sm"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
};
