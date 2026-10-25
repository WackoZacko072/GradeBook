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
      reader.onload = () => resolve(reader.result as string);
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
              AI Grounding Sources ({sources.length})
            </h4>
            <p className="text-[11px] text-slate-500">
              Upload textbook excerpts, slides, or notes to ground AI questions & flashcards
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.markdown,.csv,.json,.rtf,.html,.xml,.tex"
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">Upload Files</span>
            <span className="sm:hidden">Upload</span>
          </button>

          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Paste Text</span>
          </button>
        </div>
      </div>

      {/* Sources List */}
      {sources.length === 0 ? (
        <div className="py-4 px-3 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
          <span>No external sources attached yet. The AI will generate questions strictly from your typed note above.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {sources.map((src) => (
            <div
              key={src.id}
              className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-emerald-50/40 border border-slate-200/80 rounded-xl text-xs group transition-colors"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                <FileText className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="truncate">
                  <span className="font-bold text-slate-800 truncate block">
                    {src.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {src.fileSize || 'Text'} &bull; {src.content.length.toLocaleString()} chars
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewingSource(src)}
                  title="View Source Content"
                  className="p-1 text-slate-400 hover:text-blue-600 rounded-md transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSource(src.id)}
                  title="Delete Source"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paste Text Modal */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setIsPasteModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 z-10 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">Add Text Source</h3>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePastedSource} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Source Title / Name:
                </label>
                <input
                  type="text"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="e.g. Chapter 4 Reading Excerpt, Lecture 2 Slides..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Source Content (Paste any article, reading, or notes):
                </label>
                <textarea
                  rows={8}
                  required
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste lecture notes, study guide text, textbook definitions..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Add Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Source Modal */}
      {viewingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs"
            onClick={() => setViewingSource(null)}
          />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl border border-slate-200 z-10 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2 truncate">
                <FileCode className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <h3 className="font-extrabold text-slate-900 text-sm truncate">
                  {viewingSource.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingSource(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
              {viewingSource.content}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-shrink-0 text-xs text-slate-400">
              <span>{viewingSource.content.length.toLocaleString()} characters &bull; {viewingSource.fileSize}</span>
              <button
                type="button"
                onClick={() => setViewingSource(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
