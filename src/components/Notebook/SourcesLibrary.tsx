import React, { useState, useRef } from 'react';
import {
  Upload,
  Clipboard,
  FileText,
  File,
  Trash2,
  Eye,
  Sparkles,
  BookCheck,
  Layers,
  Search,
  FolderPlus,
  Tag,
  X,
  Copy,
  Check,
} from 'lucide-react';
import type { NoteSource } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { extractTextFromPdf } from '../../utils/pdfExtractor';

interface SourcesLibraryProps {
  sources: NoteSource[];
  classes: ClassItem[];
  onAddSource: (source: NoteSource) => void;
  onUpdateSource: (source: NoteSource) => void;
  onDeleteSource: (sourceId: string) => void;
  onAddClass?: (name: string, color?: string) => void;
  onOpenSlateAi?: (prompt?: string) => void;
  onOpenCreateSlab?: (options: {
    prompt: string;
    type: 'flashcards' | 'mcq' | 'both';
    sourceId: string;
  }) => void;
}

export const SourcesLibrary: React.FC<SourcesLibraryProps> = ({
  sources,
  classes,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onAddClass,
  onOpenSlateAi,
  onOpenCreateSlab,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('all');

  // Modals state
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteClassId, setPasteClassId] = useState<string>('');
  const [pasteContent, setPasteContent] = useState('');

  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#2563EB');

  const [previewingSource, setPreviewingSource] = useState<NoteSource | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  const [sourceToDelete, setSourceToDelete] = useState<NoteSource | null>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter sources
  const filteredSources = sources.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.className && s.className.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClass =
      selectedClassFilter === 'all'
        ? true
        : selectedClassFilter === 'unassigned'
        ? !s.classId
        : s.classId === selectedClassFilter;

    return matchesSearch && matchesClass;
  });

  // Calculate words in text
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle Drag & Drop / File Input
  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadFeedback(null);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        let extractedText = '';
        const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';

        if (isPdf) {
          extractedText = await extractTextFromPdf(file);
        } else {
          extractedText = await file.text();
          // Sanitize control characters
          extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
        }

        if (extractedText && extractedText.trim().length > 0) {
          const matchedClass = selectedClassFilter !== 'all' && selectedClassFilter !== 'unassigned'
            ? classes.find((c) => c.id === selectedClassFilter)
            : undefined;

          const newSource: NoteSource = {
            id: `source_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: isPdf ? 'pdf' : 'file',
            content: extractedText,
            fileSize: formatFileSize(file.size),
            classId: matchedClass?.id,
            className: matchedClass?.name,
            extractedWordCount: countWords(extractedText),
            addedAt: Date.now(),
          };

          onAddSource(newSource);
          successCount++;
        }
      } catch (err) {
        console.error('Error reading uploaded file:', err);
      }
    }

    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (successCount > 0) {
      setUploadFeedback(`Successfully added ${successCount} source${successCount === 1 ? '' : 's'}!`);
      setTimeout(() => setUploadFeedback(null), 3500);
    }
  };

  // Handle Save Pasted Copied Text
  const handleSavePasted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteContent.trim()) return;

    const matchedClass = classes.find((c) => c.id === pasteClassId);
    const newSource: NoteSource = {
      id: `source_paste_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: pasteTitle.trim() || `Copied Text (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      type: 'text',
      content: pasteContent.trim(),
      fileSize: `${(pasteContent.length / 1024).toFixed(1)} KB`,
      classId: matchedClass?.id,
      className: matchedClass?.name,
      extractedWordCount: countWords(pasteContent),
      addedAt: Date.now(),
    };

    onAddSource(newSource);
    setPasteTitle('');
    setPasteClassId('');
    setPasteContent('');
    setIsPasteModalOpen(false);
  };

  // Handle Quick Add Class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !onAddClass) return;
    onAddClass(newClassName.trim(), newClassColor);
    setNewClassName('');
    setIsAddClassModalOpen(false);
  };

  // Handle Copy Preview Text
  const handleCopyPreview = () => {
    if (!previewingSource) return;
    navigator.clipboard.writeText(previewingSource.content);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-scale">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#282a2c] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-[#3c4043] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900/40">
              Class Sources & Knowledge Base
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
            Sources Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] leading-relaxed">
            Upload PDF readings, lecture slides, and paste notes. Slate AI analyzes your files by class to generate 20+ flashcards and MCQs in Slab.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.docx,.doc,.md,.rtf,.csv,.json"
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />

          {/* Upload Documents Button */}
          <button
            type="button"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:text-[#202124] dark:hover:bg-[#a8c7fa] shadow-sm hover:shadow-md transition-all cursor-pointer google-btn-press"
          >
            <Upload className="w-4 h-4 stroke-[2.4]" />
            <span>{isUploading ? 'Extracting Text...' : 'Upload Files / PDFs'}</span>
          </button>

          {/* Paste Copied Text Button */}
          <button
            type="button"
            onClick={() => {
              setPasteClassId(selectedClassFilter !== 'all' && selectedClassFilter !== 'unassigned' ? selectedClassFilter : '');
              setIsPasteModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-[#e8eaed] bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] border border-slate-200 dark:border-[#3c4043] transition-all cursor-pointer google-btn-press"
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste Copied Text</span>
          </button>

          {/* Add Class Button */}
          {onAddClass && (
            <button
              type="button"
              onClick={() => setIsAddClassModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-[#c4c7c5] hover:text-slate-900 dark:hover:text-[#e8eaed] hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200/80 dark:border-[#3c4043] transition-all cursor-pointer google-btn-press"
              title="Add a new class"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Add Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Upload Feedback Toast Banner */}
      {uploadFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-in slide-in-from-top-1">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* Class Filtering Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        {/* Class Filter Scrollable Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedClassFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
              selectedClassFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white dark:bg-[#282a2c] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043]'
            }`}
          >
            <span>All Sources</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              selectedClassFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#353739]'
            }`}>
              {sources.length}
            </span>
          </button>

          {classes.map((cls) => {
            const count = sources.filter((s) => s.classId === cls.id).length;
            const isSelected = selectedClassFilter === cls.id;
            return (
              <button
                key={cls.id}
                type="button"
                onClick={() => setSelectedClassFilter(cls.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-[#282a2c] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043]'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cls.color || '#2563EB' }}
                />
                <span className="truncate max-w-[120px]">{cls.name}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#353739]'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}

          {sources.some((s) => !s.classId) && (
            <button
              type="button"
              onClick={() => setSelectedClassFilter('unassigned')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer google-btn-press ${
                selectedClassFilter === 'unassigned'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-white dark:bg-[#282a2c] text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#303134] border border-slate-200 dark:border-[#3c4043]'
              }`}
            >
              <span>Unassigned</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-[#353739]">
                {sources.filter((s) => !s.classId).length}
              </span>
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9aa0a6]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sources or text..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-white dark:bg-[#282a2c] border border-slate-200 dark:border-[#3c4043] rounded-xl text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Sources Grid */}
      {filteredSources.length === 0 ? (
        <div className="bg-white dark:bg-[#282a2c] rounded-3xl p-10 sm:p-14 border border-dashed border-slate-200 dark:border-[#3c4043] text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
              {searchQuery ? 'No sources match your search' : 'No sources uploaded yet'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
              Upload course PDFs, past exam reviews, textbook excerpts, or paste copied lecture notes.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer google-btn-press"
            >
              <Upload className="w-4 h-4" />
              <span>Upload PDF or File</span>
            </button>
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-[#e8eaed] text-xs font-bold transition-all border border-slate-200 dark:border-[#3c4043] flex items-center gap-2 cursor-pointer google-btn-press"
            >
              <Clipboard className="w-4 h-4" />
              <span>Paste Copied Text</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSources.map((source) => {
            const isPdf = source.type === 'pdf';
            const isText = source.type === 'text';
            const matchedClass = classes.find((c) => c.id === source.classId);

            return (
              <div
                key={source.id}
                className="bg-white dark:bg-[#282a2c] rounded-3xl p-5 border border-slate-200/90 dark:border-[#3c4043] shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 group google-card"
              >
                {/* Top: Icon + Title + Class Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                        isPdf
                          ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                          : isText
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-[#8ab4f8]'
                          : 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-[#c58af9]'
                      }`}>
                        {isPdf ? (
                          <FileText className="w-4 h-4 stroke-[2.2]" />
                        ) : isText ? (
                          <Clipboard className="w-4 h-4 stroke-[2.2]" />
                        ) : (
                          <File className="w-4 h-4 stroke-[2.2]" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-sm font-extrabold text-slate-900 dark:text-[#e8eaed] truncate group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors" title={source.name}>
                          {source.name}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-[#9aa0a6] mt-0.5">
                          <span className="uppercase font-bold tracking-wider">{source.type}</span>
                          <span>&bull;</span>
                          <span>{source.extractedWordCount || countWords(source.content)} words</span>
                          {source.fileSize && (
                            <>
                              <span>&bull;</span>
                              <span>{source.fileSize}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setSourceToDelete(source)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                      title="Delete source"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Class Badge Dropdown Selector */}
                  <div className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-[#9aa0a6]" />
                    <select
                      value={source.classId || ''}
                      onChange={(e) => {
                        const newId = e.target.value;
                        const targetCls = classes.find((c) => c.id === newId);
                        onUpdateSource({
                          ...source,
                          classId: newId || undefined,
                          className: targetCls?.name || undefined,
                        });
                      }}
                      className="text-xs font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-[#303134] text-slate-700 dark:text-[#e8eaed] border border-slate-200/80 dark:border-[#3c4043] focus:outline-hidden cursor-pointer"
                    >
                      <option value="">No Class Assigned</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Text Snippet Preview */}
                  <p className="text-xs text-slate-600 dark:text-[#9aa0a6] line-clamp-3 leading-relaxed bg-slate-50/80 dark:bg-[#1e1f20]/60 p-2.5 rounded-xl border border-slate-100 dark:border-[#3c4043]/60 font-mono text-[11px]">
                    {source.content.slice(0, 220)}...
                  </p>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-2 border-t border-slate-100 dark:border-[#3c4043] space-y-2">
                  {/* Slate AI Analysis Button */}
                  {onOpenSlateAi && (
                    <button
                      type="button"
                      onClick={() => {
                        const classLabel = matchedClass ? matchedClass.name : 'this class';
                        const promptText = `Please analyze the uploaded source "${source.name}" for ${classLabel}:
1. Summarize the key arguments and main concepts.
2. Identify core formulas, equations, or definitions.
3. Highlight high-yield questions likely to appear on exams.`;
                        onOpenSlateAi(promptText);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold text-violet-700 dark:text-[#c58af9] bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/40 border border-violet-200/80 dark:border-violet-800/40 transition-colors cursor-pointer google-btn-press"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Analyze with Slate AI</span>
                    </button>
                  )}

                  {/* Slab Study Generators: 20 Flashcards & MCQs */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {onOpenCreateSlab && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onOpenCreateSlab({
                              prompt: `Create 20 flashcards covering all definitions, core concepts, and formulas from ${source.name}`,
                              type: 'flashcards',
                              sourceId: source.id,
                            });
                          }}
                          className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold text-slate-700 dark:text-[#e8eaed] bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] transition-colors cursor-pointer border border-slate-200/60 dark:border-[#3c4043]"
                          title="Generate 20 Flashcards in Slab"
                        >
                          <Layers className="w-3 h-3 text-violet-600 dark:text-[#c58af9]" />
                          <span>Make Cards</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onOpenCreateSlab({
                              prompt: `Create 20 multiple choice questions with detailed explanations based on ${source.name}`,
                              type: 'mcq',
                              sourceId: source.id,
                            });
                          }}
                          className="flex items-center justify-center gap-1 py-1 px-2 rounded-lg text-[11px] font-bold text-slate-700 dark:text-[#e8eaed] bg-slate-100 dark:bg-[#303134] hover:bg-slate-200 dark:hover:bg-[#3c4043] transition-colors cursor-pointer border border-slate-200/60 dark:border-[#3c4043]"
                          title="Generate 20 MCQs in Slab"
                        >
                          <BookCheck className="w-3 h-3 text-purple-600 dark:text-[#c58af9]" />
                          <span>Make MCQs</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Read / Preview Full Text */}
                  <button
                    type="button"
                    onClick={() => setPreviewingSource(source)}
                    className="w-full flex items-center justify-center gap-1 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-[#9aa0a6] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Extracted Content</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PASTE COPIED TEXT MODAL                                               */}
      {/* ===================================================================== */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#282a2c] rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200/80 dark:border-[#3c4043] overflow-hidden flex flex-col max-h-[90vh] animate-fade-scale">
            <div className="p-5 border-b border-slate-100 dark:border-[#3c4043] flex items-center justify-between bg-slate-50/70 dark:bg-[#242526]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center">
                  <Clipboard className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                    Paste Copied Text
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                    Paste lecture transcripts, textbook excerpts, or syllabus notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePasted} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1">
                  Source Title / Name
                </label>
                <input
                  type="text"
                  required
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="e.g. Lecture 5: Monetary Policy & Inflation"
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-[#3c4043] rounded-xl focus:bg-white dark:focus:bg-[#1e1f20] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-[#e8eaed]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1">
                  Assign to Class
                </label>
                <select
                  value={pasteClassId}
                  onChange={(e) => setPasteClassId(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-[#3c4043] rounded-xl focus:bg-white dark:focus:bg-[#1e1f20] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-[#e8eaed] cursor-pointer"
                >
                  <option value="">No Class (General Source)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1">
                  Copied Text Content
                </label>
                <textarea
                  required
                  rows={8}
                  value={pasteContent}
                  onChange={(e) => setPasteContent(e.target.value)}
                  placeholder="Paste your copied text, lecture notes, textbook passages, or assignment prompt here..."
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-[#3c4043] rounded-xl focus:bg-white dark:focus:bg-[#1e1f20] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-[#e8eaed] leading-relaxed font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#303134] rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:text-[#202124] rounded-xl transition-all shadow-xs cursor-pointer google-btn-press"
                >
                  Save Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* QUICK ADD CLASS MODAL                                                 */}
      {/* ===================================================================== */}
      {isAddClassModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#282a2c] rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-[#3c4043] p-5 space-y-4 animate-fade-scale">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                Create Class
              </h3>
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1">
                  Class Name
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. ECON 101, MATH 200, BIOL 111"
                  className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-[#1e1f20] border border-slate-200 dark:border-[#3c4043] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                  Class Color
                </label>
                <div className="flex items-center gap-2">
                  {['#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706', '#0891B2'].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewClassColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                        newClassColor === color ? 'scale-115 border-white shadow-md' : 'border-transparent'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddClassModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-[#c4c7c5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs google-btn-press"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PREVIEW EXTRACTED CONTENT MODAL                                       */}
      {/* ===================================================================== */}
      {previewingSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#282a2c] rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200/80 dark:border-[#3c4043] overflow-hidden flex flex-col max-h-[90vh] animate-fade-scale">
            <div className="p-5 border-b border-slate-100 dark:border-[#3c4043] flex items-center justify-between bg-slate-50/70 dark:bg-[#242526]">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed] truncate max-w-md">
                  {previewingSource.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                  <span className="uppercase font-bold">{previewingSource.type}</span>
                  {previewingSource.className && <span>&bull; Class: {previewingSource.className}</span>}
                  <span>&bull; {countWords(previewingSource.content)} words</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#353739] hover:bg-slate-200 dark:hover:bg-[#3c4043] text-slate-700 dark:text-[#e8eaed] rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  {copiedPreview ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPreview ? 'Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewingSource(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-800 dark:text-[#e8eaed] whitespace-pre-wrap select-text">
              {previewingSource.content}
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-[#3c4043] bg-slate-50/70 dark:bg-[#242526] flex items-center justify-between">
              <span className="text-xs text-slate-400 dark:text-[#9aa0a6]">
                Added {new Date(previewingSource.addedAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={() => setPreviewingSource(null)}
                className="px-4 py-1.5 bg-slate-200 dark:bg-[#303134] text-slate-700 dark:text-[#e8eaed] rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION DIALOG                                            */}
      {/* ===================================================================== */}
      {sourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#282a2c] rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200/80 dark:border-[#3c4043] p-5 space-y-4 animate-fade-scale text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-[#e8eaed]">
                Delete Source?
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#9aa0a6] mt-1">
                Are you sure you want to remove &quot;{sourceToDelete.name}&quot;? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#303134] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSource(sourceToDelete.id);
                  setSourceToDelete(null);
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs cursor-pointer google-btn-press"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
