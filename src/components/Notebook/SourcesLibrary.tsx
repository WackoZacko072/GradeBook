import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  File,
  Trash2,
  FolderPlus,
  X,
  Copy,
  Check,
  Search,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  FilePlus,
  Sparkles,
  Presentation,
} from 'lucide-react';
import { ModalPortal } from '../ModalPortal';
import type { NoteSource } from '../../types/notebook';
import type { ClassItem } from '../../types/grade';
import { extractTextFromPdf } from '../../utils/pdfExtractor';
import { SourceSummarizerView } from './SourceSummarizerView';

interface SourcesLibraryProps {
  sources: NoteSource[];
  classes: ClassItem[];
  selectedSourceId?: string | null;
  onSelectSource?: (sourceId: string | null) => void;
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
  selectedSourceId = null,
  onSelectSource,
  onAddSource,
  onUpdateSource,
  onDeleteSource,
  onAddClass,
  onOpenCreateSlab,
}) => {
  // Navigation: null = show class cards grid; string = active class notebook library
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [internalSelectedSourceId, setInternalSelectedSourceId] = useState<string | null>(null);

  const activeSourceId = selectedSourceId !== undefined ? selectedSourceId : internalSelectedSourceId;
  const activeSource = sources.find((s) => s.id === activeSourceId) || null;

  const handleOpenSourceSummarizer = (source: NoteSource) => {
    const updatedSource: NoteSource = {
      ...source,
      lastOpenedAt: Date.now(),
    };
    onUpdateSource(updatedSource);
    if (onSelectSource) {
      onSelectSource(source.id);
    } else {
      setInternalSelectedSourceId(source.id);
    }
  };

  const handleCloseSourceSummarizer = () => {
    if (onSelectSource) {
      onSelectSource(null);
    } else {
      setInternalSelectedSourceId(null);
    }
  };

  // Search filter inside active class library
  const [searchQuery, setSearchQuery] = useState('');

  // "Create Note" modal state (formerly copied text)
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');

  // Add Class modal state
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#2563EB');

  // Preview extracted content modal state
  const [previewingSource, setPreviewingSource] = useState<NoteSource | null>(null);
  const [copiedPreview, setCopiedPreview] = useState(false);

  // Delete source confirmation state
  const [sourceToDelete, setSourceToDelete] = useState<NoteSource | null>(null);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Count words helper
  const countWords = (text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Active class entity
  const activeClass =
    activeClassId && activeClassId !== 'unassigned'
      ? classes.find((c) => c.id === activeClassId)
      : null;

  // Sources belonging to active class
  const classSources = activeClassId
    ? sources.filter((s) =>
        activeClassId === 'unassigned' ? !s.classId : s.classId === activeClassId
      )
    : [];

  // Filtered sources within active class
  const filteredClassSources = classSources.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.content.toLowerCase().includes(q);
  });

  // Handle Drag & Drop / File Input inside the active class
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
          extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
        }

        if (extractedText && extractedText.trim().length > 0) {
          const lowerFile = file.name.toLowerCase();
          const isSlides =
            lowerFile.includes('slide') ||
            lowerFile.includes('lecture') ||
            lowerFile.endsWith('.ppt') ||
            lowerFile.endsWith('.pptx');

          const newSource: NoteSource = {
            id: `source_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            type: isSlides ? 'slides' : isPdf ? 'pdf' : 'file',
            content: extractedText,
            fileSize: formatFileSize(file.size),
            classId: activeClass?.id,
            className: activeClass?.name,
            extractedWordCount: countWords(extractedText),
            addedAt: Date.now(),
            lastOpenedAt: Date.now(),
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
      setUploadFeedback(`Successfully uploaded ${successCount} file${successCount === 1 ? '' : 's'}!`);
      setTimeout(() => setUploadFeedback(null), 3500);
    }
  };

  // Handle Create Note (formerly copied text)
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    const newSource: NoteSource = {
      id: `source_note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name:
        noteTitle.trim() ||
        `Note (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      type: 'text',
      content: noteContent.trim(),
      fileSize: `${(noteContent.length / 1024).toFixed(1)} KB`,
      classId: activeClass?.id,
      className: activeClass?.name,
      extractedWordCount: countWords(noteContent),
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
    };

    onAddSource(newSource);
    setNoteTitle('');
    setNoteContent('');
    setIsCreateNoteModalOpen(false);
  };

  // Handle Quick Add Class
  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim() || !onAddClass) return;
    onAddClass(newClassName.trim(), newClassColor);
    setNewClassName('');
    setIsAddClassModalOpen(false);
  };

  // Copy Preview Text
  const handleCopyPreview = () => {
    if (!previewingSource) return;
    navigator.clipboard.writeText(previewingSource.content);
    setCopiedPreview(true);
    setTimeout(() => setCopiedPreview(false), 2000);
  };

  // Check if unassigned sources exist
  const unassignedCount = sources.filter((s) => !s.classId).length;

  // If a specific source is selected for AI Summarization & Study, render SourceSummarizerView
  if (activeSource) {
    return (
      <SourceSummarizerView
        source={activeSource}
        classes={classes}
        onBack={handleCloseSourceSummarizer}
        onUpdateSource={onUpdateSource}
        onDeleteSource={(id) => {
          onDeleteSource(id);
          handleCloseSourceSummarizer();
        }}
        onOpenCreateSlab={(opts) => {
          if (onOpenCreateSlab) {
            onOpenCreateSlab(opts);
          }
        }}
      />
    );
  }

  return (
    <div className="space-y-6 animate-fade-scale">
      {/* Hidden File Input for uploading files into active class */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.docx,.doc,.md,.rtf,.csv,.json"
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
      />

      {/* Upload Feedback Toast */}
      {uploadFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300 font-semibold animate-in slide-in-from-top-1">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{uploadFeedback}</span>
        </div>
      )}

      {/* =================================================================== */}
      {/* VIEW A: CLASS CARDS GRID (When no specific class is open)           */}
      {/* =================================================================== */}
      {activeClassId === null ? (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-8 border border-slate-200/90 dark:border-[#26282a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-[#8ab4f8] bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-900/40">
                  Notebook
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                Class Notebooks
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] leading-relaxed">
                Select a class card to open its notebook library. Upload PDFs, slides, and create notes specifically for that class.
              </p>
            </div>

            {/* Add Class Button */}
            {onAddClass && (
              <button
                type="button"
                onClick={() => setIsAddClassModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:text-[#202124] dark:hover:bg-[#a8c7fa] shadow-sm hover:shadow-md transition-all cursor-pointer google-btn-press self-start md:self-auto"
              >
                <FolderPlus className="w-4 h-4 stroke-[2.4]" />
                <span>Add Class</span>
              </button>
            )}
          </div>

          {/* Grid of Class Cards */}
          {classes.length === 0 && unassignedCount === 0 ? (
            <div className="bg-white dark:bg-[#18191b] rounded-3xl p-10 sm:p-14 border border-dashed border-slate-200 dark:border-[#26282a] text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mx-auto">
                <BookOpen className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                  No class notebooks yet
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                  Create your first class to start uploading course materials, slides, and lecture notes.
                </p>
              </div>
              {onAddClass && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddClassModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 mx-auto cursor-pointer google-btn-press"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Create Your First Class</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              className="w-full gap-4 sm:gap-5"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              }}
            >
              {classes.map((cls) => {
                const count = sources.filter((s) => s.classId === cls.id).length;
                const totalWords = sources
                  .filter((s) => s.classId === cls.id)
                  .reduce((acc, s) => acc + (s.extractedWordCount || countWords(s.content)), 0);

                return (
                  <div
                    key={cls.id}
                    onClick={() => {
                      setActiveClassId(cls.id);
                      setSearchQuery('');
                    }}
                    className="bg-white dark:bg-[#18191b] rounded-3xl p-6 border border-slate-200/90 dark:border-[#26282a] shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-[#5f6368] transition-all cursor-pointer group flex flex-col justify-between space-y-4 google-card min-w-0"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3.5 h-3.5 rounded-full ring-2 ring-white dark:ring-[#18191b] shadow-xs flex-shrink-0"
                            style={{ backgroundColor: cls.color || '#2563EB' }}
                          />
                          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9aa0a6]">
                            Class Notebook
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5]">
                          {count} {count === 1 ? 'source' : 'sources'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900 dark:text-[#e8eaed] group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors line-clamp-1">
                          {cls.name}
                        </h3>
                        {cls.code && (
                          <p className="text-xs text-slate-400 dark:text-[#9aa0a6] mt-0.5">
                            {cls.code}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-[#9aa0a6] font-medium text-[11px]">
                        {totalWords.toLocaleString()} total words
                      </span>
                      <span className="text-blue-600 dark:text-[#8ab4f8] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open Library</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Unassigned Sources Card (if any exist) */}
              {unassignedCount > 0 && (
                <div
                  onClick={() => {
                    setActiveClassId('unassigned');
                    setSearchQuery('');
                  }}
                  className="bg-white dark:bg-[#18191b] rounded-3xl p-6 border border-dashed border-slate-300 dark:border-[#26282a] shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4 google-card"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-400 flex-shrink-0" />
                        <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-[#9aa0a6]">
                          Unassigned
                        </span>
                      </div>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#26282a] text-slate-600 dark:text-[#c4c7c5]">
                        {unassignedCount} {unassignedCount === 1 ? 'source' : 'sources'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 dark:text-[#e8eaed] group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors">
                        General / Unassigned Sources
                      </h3>
                      <p className="text-xs text-slate-400 dark:text-[#9aa0a6] mt-0.5">
                        Sources not assigned to any specific class
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-[#9aa0a6] font-medium text-[11px]">
                      View general sources
                    </span>
                    <span className="text-blue-600 dark:text-[#8ab4f8] font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Open Library</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* =================================================================== */
        /* VIEW B: CLASS NOTEBOOK LIBRARY (Upload files & create notes)        */
        /* =================================================================== */
        <div className="space-y-6">
          {/* Top Bar with Back Button & Class Info */}
          <div className="bg-white dark:bg-[#18191b] rounded-3xl p-6 sm:p-7 border border-slate-200/90 dark:border-[#26282a] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setActiveClassId(null)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-[#9aa0a6] hover:text-blue-600 dark:hover:text-[#8ab4f8] transition-colors cursor-pointer w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Notebooks</span>
              </button>

              <div className="flex items-center gap-3">
                <span
                  className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-[#18191b] shadow-xs flex-shrink-0"
                  style={{ backgroundColor: activeClass?.color || '#2563EB' }}
                />
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#e8eaed] tracking-tight">
                  {activeClass ? activeClass.name : 'Unassigned Sources'}
                </h1>
              </div>

              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6]">
                {classSources.length} {classSources.length === 1 ? 'source' : 'sources'} in this class notebook
              </p>
            </div>

            {/* Action Buttons: Upload Files & Create Note */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              <button
                type="button"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:text-[#202124] dark:hover:bg-[#a8c7fa] shadow-sm hover:shadow-md transition-all cursor-pointer google-btn-press"
              >
                <Upload className="w-4 h-4 stroke-[2.4]" />
                <span>{isUploading ? 'Extracting Text...' : 'Upload Files'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCreateNoteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 dark:text-[#e8eaed] bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] border border-slate-200 dark:border-[#26282a] transition-all cursor-pointer google-btn-press"
              >
                <FilePlus className="w-4 h-4" />
                <span>Create Note</span>
              </button>
            </div>
          </div>

          {/* Search bar inside this class if more than 3 sources */}
          {classSources.length > 3 && (
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#9aa0a6]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sources in this notebook..."
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-white dark:bg-[#18191b] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] placeholder-slate-400 dark:placeholder-[#5f6368] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Minimalist Sources Grid */}
          {classSources.length === 0 ? (
            <div className="bg-white dark:bg-[#18191b] rounded-3xl p-10 sm:p-14 border border-dashed border-slate-200 dark:border-[#26282a] text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center mx-auto">
                <Upload className="w-8 h-8 stroke-[2.2]" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-[#e8eaed]">
                  This library is empty
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#9aa0a6]">
                  Upload lecture PDFs, reading materials, or create a note for {activeClass ? activeClass.name : 'this class'}.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer google-btn-press"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Files</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateNoteModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-[#202123] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] text-xs font-bold transition-all border border-slate-200 dark:border-[#26282a] flex items-center gap-2 cursor-pointer google-btn-press"
                >
                  <FilePlus className="w-4 h-4" />
                  <span>Create Note</span>
                </button>
              </div>
            </div>
          ) : (
            <div
              className="w-full gap-4"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
              }}
            >
              {filteredClassSources.map((source) => {
                const words = source.extractedWordCount || countWords(source.content);
                const size = source.fileSize || 'Note';
                const hasSummary = Boolean(source.aiSummary);

                return (
                  <div
                    key={source.id}
                    onClick={() => handleOpenSourceSummarizer(source)}
                    className="bg-white dark:bg-[#18191b] rounded-2xl p-4 sm:p-5 border border-slate-200/90 dark:border-[#26282a] shadow-xs hover:shadow-md hover:border-blue-300 dark:hover:border-[#8ab4f8] transition-all flex flex-col justify-between space-y-3 group google-card min-w-0 cursor-pointer"
                  >
                    {/* Top: Icon + Title + Delete */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center flex-shrink-0">
                          {source.type === 'slides' ? (
                            <Presentation className="w-4 h-4 stroke-[2.2]" />
                          ) : source.type === 'pdf' ? (
                            <FileText className="w-4 h-4 stroke-[2.2]" />
                          ) : (
                            <File className="w-4 h-4 stroke-[2.2]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3
                            className="text-sm font-extrabold text-slate-900 dark:text-[#e8eaed] truncate group-hover:text-blue-600 dark:group-hover:text-[#8ab4f8] transition-colors"
                            title={source.name}
                          >
                            {source.name}
                          </h3>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                            <span>{words.toLocaleString()} words</span>
                            <span>&bull;</span>
                            <span>{size}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSourceToDelete(source);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete source"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* AI Summarizer Preview / Status */}
                    {hasSummary && source.aiSummary ? (
                      <p className="text-xs text-slate-600 dark:text-[#c4c7c5] line-clamp-2 leading-relaxed">
                        {source.aiSummary.conciseSummary}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400 dark:text-[#80868b] line-clamp-2 leading-relaxed">
                        Click to generate AI summary, key concepts, definitions & flashcards.
                      </p>
                    )}

                    {/* Bottom actions */}
                    <div className="pt-2.5 border-t border-slate-100 dark:border-[#26282a] flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewingSource(source);
                        }}
                        className="text-[11px] text-slate-500 dark:text-[#9aa0a6] hover:text-slate-800 dark:hover:text-[#e8eaed] hover:underline cursor-pointer font-medium"
                      >
                        Raw text
                      </button>

                      <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-[#8ab4f8] group-hover:translate-x-0.5 transition-transform">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{hasSummary ? 'Open AI Summary' : 'AI Summarize'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* CREATE NOTE MODAL (Friendly name for copied text / note creation)      */}
      {/* ===================================================================== */}
      <ModalPortal
        isOpen={isCreateNoteModalOpen}
        onClose={() => setIsCreateNoteModalOpen(false)}
        maxWidth="max-w-3xl"
      >
        <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-[#8ab4f8] flex items-center justify-center">
              <FilePlus className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#e8eaed]">
                Create Note
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6]">
                Paste copied text or write study notes for {activeClass ? activeClass.name : 'this class'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateNoteModalOpen(false)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-[#e8eaed] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveNote} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 min-h-0">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                Note Title
              </label>
              <input
                type="text"
                required
                autoFocus
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Lecture 3: Key Formulas & Mechanisms"
                className="w-full text-sm sm:text-base p-3.5 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl focus:bg-white dark:focus:bg-[#0f0f10] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-[#e8eaed]"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-800 dark:text-[#e8eaed] mb-1.5">
                Note Content (or Paste Copied Text)
              </label>
              <textarea
                required
                rows={10}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Type notes or paste copied text, lecture transcripts, study summaries, or textbook sections here..."
                className="w-full text-sm sm:text-base p-3.5 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl focus:bg-white dark:focus:bg-[#0f0f10] focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-[#e8eaed] leading-relaxed font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-slate-100 dark:border-[#26282a] bg-slate-50/70 dark:bg-[#252628] flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsCreateNoteModalOpen(false)}
              className="px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-200/60 dark:hover:bg-[#202123] rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 dark:bg-[#8ab4f8] dark:text-[#202124] rounded-xl transition-all shadow-xs cursor-pointer google-btn-press"
            >
              Create Note
            </button>
          </div>
        </form>
      </ModalPortal>

      {/* ===================================================================== */}
      {/* QUICK ADD CLASS MODAL                                                 */}
      {/* ===================================================================== */}
      <ModalPortal
        isOpen={isAddClassModalOpen}
        onClose={() => setIsAddClassModalOpen(false)}
        maxWidth="max-w-md"
        className="p-6 space-y-4"
      >
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
              className="w-full text-xs sm:text-sm p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] rounded-xl text-slate-900 dark:text-[#e8eaed] focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
      </ModalPortal>

      {/* ===================================================================== */}
      {/* PREVIEW EXTRACTED CONTENT MODAL                                       */}
      {/* ===================================================================== */}
      <ModalPortal
        isOpen={!!previewingSource}
        onClose={() => setPreviewingSource(null)}
        maxWidth="max-w-4xl"
      >
        {previewingSource && (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-white/5 flex-shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#e8eaed] truncate max-w-md">
                  {previewingSource.name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#9aa0a6] mt-0.5">
                  <span className="uppercase font-bold">{previewingSource.type}</span>
                  {previewingSource.className && <span>&bull; Class: {previewingSource.className}</span>}
                  <span>&bull; {countWords(previewingSource.content).toLocaleString()} words</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPreview}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-[#26282a] hover:bg-slate-200 dark:hover:bg-[#26282a] text-slate-700 dark:text-[#e8eaed] rounded-xl text-xs font-bold transition-colors cursor-pointer"
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

            <div className="p-5 sm:p-7 overflow-y-auto flex-1 font-mono text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-[#e8eaed] whitespace-pre-wrap select-text">
              {previewingSource.content}
            </div>

            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-[#26282a] bg-slate-50/70 dark:bg-[#242526] flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-slate-400 dark:text-[#9aa0a6]">
                Added {new Date(previewingSource.addedAt).toLocaleDateString()}
              </span>
              <button
                type="button"
                onClick={() => setPreviewingSource(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-[#202123] text-slate-700 dark:text-[#e8eaed] rounded-xl text-xs sm:text-sm font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalPortal>

      {/* ===================================================================== */}
      {/* DELETE CONFIRMATION DIALOG                                            */}
      {/* ===================================================================== */}
      <ModalPortal
        isOpen={!!sourceToDelete}
        onClose={() => setSourceToDelete(null)}
        maxWidth="max-w-md"
        className="p-6 text-center"
      >
        {sourceToDelete && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-[#e8eaed]">
                Delete Source?
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-[#9aa0a6] mt-1.5">
                Are you sure you want to remove &quot;{sourceToDelete.name}&quot;? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-5">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteSource(sourceToDelete.id);
                  setSourceToDelete(null);
                }}
                className="px-5 py-2 text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-all shadow-xs cursor-pointer google-btn-press"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </ModalPortal>
    </div>
  );
};
