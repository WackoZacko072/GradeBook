import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Send,
  Loader2,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type {
  MultipleChoiceQuestion,
  LongAnswerQuestion,
  NoteSource,
} from '../../types/notebook';
import {
  generateMultipleChoiceQuestions,
  generateLongAnswerQuestions,
  gradeLongAnswerSubmission,
} from '../../utils/notebookAiService';
import { LatexRenderer } from '../LatexRenderer';
import { ModalPortal } from '../ModalPortal';

interface QuestionBankViewProps {
  noteTitle: string;
  noteContent: string;
  sources: NoteSource[];
  multipleChoice: MultipleChoiceQuestion[];
  longAnswer: LongAnswerQuestion[];
  onUpdateQuestions: (
    mc: MultipleChoiceQuestion[],
    la: LongAnswerQuestion[]
  ) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  noteTitle,
  noteContent,
  sources,
  multipleChoice,
  longAnswer,
  onUpdateQuestions,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'mc' | 'la'>('mc');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Multiple Choice Quiz State
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({});

  // Long Answer Student Input & Grading State
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [revealedRubrics, setRevealedRubrics] = useState<Record<string, boolean>>({});
  const [gradingQuestionId, setGradingQuestionId] = useState<string | null>(null);

  // Manual Add Modal State
  const [isAddMcModalOpen, setIsAddMcModalOpen] = useState(false);
  const [isAddLaModalOpen, setIsAddLaModalOpen] = useState(false);

  // Form states
  const [newMcQuestion, setNewMcQuestion] = useState('');
  const [newMcOptions, setNewMcOptions] = useState(['', '', '', '']);
  const [newMcCorrect, setNewMcCorrect] = useState(0);
  const [newMcExplanation, setNewMcExplanation] = useState('');

  const [newLaQuestion, setNewLaQuestion] = useState('');
  const [newLaSampleAnswer, setNewLaSampleAnswer] = useState('');
  const [newLaRubric, setNewLaRubric] = useState('');

  // Handle AI generation for Multiple Choice
  const handleGenerateMc = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const generated = await generateMultipleChoiceQuestions(
        noteTitle,
        noteContent,
        sources,
        5
      );
      onUpdateQuestions([...multipleChoice, ...generated], longAnswer);
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate questions. Check your Gemini API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle AI generation for Long Answer
  const handleGenerateLa = async () => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const generated = await generateLongAnswerQuestions(
        noteTitle,
        noteContent,
        sources,
        3
      );
      onUpdateQuestions(multipleChoice, [...longAnswer, ...generated]);
    } catch (err: any) {
      setGenerateError(err.message || 'Failed to generate questions. Check your Gemini API key.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Select option in MC quiz
  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
    setShowExplanations((prev) => ({ ...prev, [questionId]: true }));
  };

  // Reset MC quiz
  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setShowExplanations({});
  };

  // Delete MC Question
  const handleDeleteMc = (id: string) => {
    onUpdateQuestions(
      multipleChoice.filter((q) => q.id !== id),
      longAnswer
    );
  };

  // Delete LA Question
  const handleDeleteLa = (id: string) => {
    onUpdateQuestions(
      multipleChoice,
      longAnswer.filter((q) => q.id !== id)
    );
  };

  // Grade student's long answer with Gemini
  const handleGradeStudentAnswer = async (q: LongAnswerQuestion) => {
    const studentText = studentAnswers[q.id]?.trim();
    if (!studentText) return;

    setGradingQuestionId(q.id);
    try {
      const result = await gradeLongAnswerSubmission(
        q.question,
        q.sampleAnswer,
        q.keyRubricPoints,
        studentText
      );

      const updatedLa = longAnswer.map((item) =>
        item.id === q.id
          ? {
              ...item,
              userResponse: studentText,
              aiFeedback: result,
            }
          : item
      );
      onUpdateQuestions(multipleChoice, updatedLa);
    } catch (err: any) {
      alert('Grading error: ' + (err.message || 'Failed to evaluate response'));
    } finally {
      setGradingQuestionId(null);
    }
  };

  // Add MC Manually
  const handleSaveManualMc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMcQuestion.trim()) return;

    const newQ: MultipleChoiceQuestion = {
      id: `mc_${Date.now()}`,
      question: newMcQuestion.trim(),
      options: newMcOptions.map((opt, i) => opt.trim() || `Option ${i + 1}`),
      correctIndex: newMcCorrect,
      explanation: newMcExplanation.trim(),
    };

    onUpdateQuestions([...multipleChoice, newQ], longAnswer);
    setNewMcQuestion('');
    setNewMcOptions(['', '', '', '']);
    setNewMcCorrect(0);
    setNewMcExplanation('');
    setIsAddMcModalOpen(false);
  };

  // Add LA Manually
  const handleSaveManualLa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaQuestion.trim()) return;

    const rubricList = newLaRubric
      .split('\n')
      .map((r) => r.trim())
      .filter(Boolean);

    const newQ: LongAnswerQuestion = {
      id: `la_${Date.now()}`,
      question: newLaQuestion.trim(),
      sampleAnswer: newLaSampleAnswer.trim(),
      keyRubricPoints: rubricList,
    };

    onUpdateQuestions(multipleChoice, [...longAnswer, newQ]);
    setNewLaQuestion('');
    setNewLaSampleAnswer('');
    setNewLaRubric('');
    setIsAddLaModalOpen(false);
  };

  // Calculate score for MC quiz
  const answeredMcCount = Object.keys(selectedAnswers).length;
  const correctMcCount = multipleChoice.filter(
    (q) => selectedAnswers[q.id] === q.correctIndex
  ).length;

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation (Multiple Choice vs Long Answer) */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSubTab('mc')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'mc'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Multiple Choice ({multipleChoice.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('la')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'la'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Long Answer ({longAnswer.length})
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {activeSubTab === 'mc' && multipleChoice.length > 0 && answeredMcCount > 0 && (
            <button
              type="button"
              onClick={handleResetQuiz}
              title="Reset Quiz"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => (activeSubTab === 'mc' ? setIsAddMcModalOpen(true) : setIsAddLaModalOpen(true))}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>

          <button
            type="button"
            disabled={isGenerating}
            onClick={activeSubTab === 'mc' ? handleGenerateMc : handleGenerateLa}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <img src="/gemini-icon.png" alt="Gemini" className="w-3.5 h-3.5 object-contain" />
            )}
            <span>{isGenerating ? 'Generating...' : 'Generate with Gemini'}</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {generateError && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{generateError}</span>
          <button
            type="button"
            onClick={() => setGenerateError(null)}
            className="text-xs font-bold underline ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* MULTIPLE CHOICE VIEW */}
      {activeSubTab === 'mc' && (
        <div className="space-y-4">
          {/* Quiz Score Summary Banner */}
          {multipleChoice.length > 0 && answeredMcCount > 0 && (
            <div className="p-3 bg-blue-50/80 border border-blue-200/80 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-blue-900 font-semibold">
                <Award className="w-4 h-4 text-blue-600" />
                <span>
                  Quiz Score: {correctMcCount} / {answeredMcCount} Correct ({Math.round((correctMcCount / answeredMcCount) * 100)}%)
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetQuiz}
                className="text-blue-700 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}

          {multipleChoice.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Multiple Choice Questions Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Click "AI Generate" to extract exam-style questions with LaTeX math directly from your notes and sources.
              </p>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateMc}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
              >
                <img src="/gemini-icon.png" alt="Gemini" className="w-3.5 h-3.5 object-contain" />
                <span>Generate with Gemini</span>
              </button>
            </div>
          ) : (
            multipleChoice.map((q, qIndex) => {
              const selectedOpt = selectedAnswers[q.id];
              const isAnswered = selectedOpt !== undefined;
              const isCorrect = selectedOpt === q.correctIndex;
              const isExplShowing = showExplanations[q.id];

              return (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xs transition-all"
                >
                  {/* Question Stem */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-extrabold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <div className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                        <LatexRenderer content={q.question} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteMc(q.id)}
                      title="Delete Question"
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Options */}
                  <div className="space-y-3 mt-4">
                    {q.options.map((optionText, optIndex) => {
                      const isOptionSelected = selectedOpt === optIndex;
                      const isOptionCorrect = optIndex === q.correctIndex;

                      let btnStyle = 'bg-slate-50/80 hover:bg-slate-100/90 text-slate-800 border-slate-200/80';
                      if (isAnswered) {
                        if (isOptionCorrect) {
                          btnStyle = 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold';
                        } else if (isOptionSelected && !isCorrect) {
                          btnStyle = 'bg-rose-50 text-rose-900 border-rose-300';
                        } else {
                          btnStyle = 'bg-slate-50/60 text-slate-400 border-slate-200/50 opacity-70';
                        }
                      }

                      return (
                        <button
                          key={optIndex}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIndex)}
                          className={`w-full text-left p-4 sm:p-5 rounded-2xl border-2 text-base sm:text-lg transition-all flex items-start justify-between gap-3 cursor-pointer ${btnStyle}`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-bold text-slate-500 uppercase mt-0.5">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <div className="leading-relaxed">
                              <LatexRenderer content={optionText} />
                            </div>
                          </div>

                          {isAnswered && (
                            <div className="flex-shrink-0 mt-0.5">
                              {isOptionCorrect && (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                              )}
                              {isOptionSelected && !isCorrect && (
                                <XCircle className="w-5 h-5 text-rose-500 stroke-[2.5]" />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation Toggle & Content */}
                  {q.explanation && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() =>
                          setShowExplanations((prev) => ({
                            ...prev,
                            [q.id]: !prev[q.id],
                          }))
                        }
                        className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isExplShowing ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{isExplShowing ? 'Hide Explanation' : 'Show Explanation & Derivation'}</span>
                      </button>

                      {isExplShowing && (
                        <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-sm sm:text-base text-slate-700 leading-relaxed animate-in fade-in duration-150">
                          <p className="font-bold text-slate-900 mb-1.5 flex items-center gap-1.5">
                            <span className="text-emerald-600">Correct Answer:</span>
                            <span>Option {String.fromCharCode(65 + q.correctIndex)}</span>
                          </p>
                          <LatexRenderer content={q.explanation} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* LONG ANSWER VIEW */}
      {activeSubTab === 'la' && (
        <div className="space-y-4">
          {longAnswer.length === 0 ? (
            <div className="py-12 px-4 text-center bg-white rounded-2xl border border-dashed border-slate-300">
              <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-800">No Long Answer Questions Yet</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Generate free-response analytical questions with step-by-step LaTeX sample answers and grading rubrics.
              </p>
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateLa}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer"
              >
                <img src="/gemini-icon.png" alt="Gemini" className="w-3.5 h-3.5 object-contain" />
                <span>Generate with Gemini</span>
              </button>
            </div>
          ) : (
            longAnswer.map((q, qIndex) => {
              const isRubricRevealed = revealedRubrics[q.id];
              const isCurrentlyGrading = gradingQuestionId === q.id;
              const feedback = q.aiFeedback;

              return (
                <div
                  key={q.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5"
                >
                  {/* Header: Prompt */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 font-extrabold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                        {qIndex + 1}
                      </span>
                      <div className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                        <LatexRenderer content={q.question} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteLa(q.id)}
                      title="Delete Question"
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Student Answer Typing Box */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Your Written Answer:
                    </label>
                    <textarea
                      rows={3}
                      value={studentAnswers[q.id] !== undefined ? studentAnswers[q.id] : q.userResponse || ''}
                      onChange={(e) =>
                        setStudentAnswers((prev) => ({
                          ...prev,
                          [q.id]: e.target.value,
                        }))
                      }
                      placeholder="Type your derivation or analytical response here to practice..."
                      className="w-full text-xs p-3 bg-slate-50/80 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800"
                    />

                    <div className="mt-2 flex items-center justify-between">
                      <button
                        type="button"
                        disabled={isCurrentlyGrading || !(studentAnswers[q.id] || q.userResponse)?.trim()}
                        onClick={() => handleGradeStudentAnswer(q)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        {isCurrentlyGrading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5" />
                        )}
                        <span>{isCurrentlyGrading ? 'AI Grading...' : 'Grade My Response'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setRevealedRubrics((prev) => ({
                            ...prev,
                            [q.id]: !prev[q.id],
                          }))
                        }
                        className="text-xs font-bold text-slate-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        {isRubricRevealed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        <span>{isRubricRevealed ? 'Hide Model Answer & Rubric' : 'Reveal Model Answer & Rubric'}</span>
                      </button>
                    </div>
                  </div>

                  {/* AI Tutor Feedback Banner if evaluated */}
                  {feedback && (
                    <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl space-y-1 text-xs text-emerald-950 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5 text-emerald-800">
                          <Award className="w-4 h-4 text-emerald-600" />
                          <span>AI Tutor Evaluation:</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-xs font-extrabold">
                          {feedback.scorePercentage}%
                        </span>
                      </div>
                      <div className="text-slate-800 leading-relaxed pt-1">
                        <LatexRenderer content={feedback.feedback} />
                      </div>
                    </div>
                  )}

                  {/* Revealed Model Answer & Rubric Checklist */}
                  {isRubricRevealed && (
                    <div className="p-4 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
                      {q.sampleAnswer && (
                        <div>
                          <span className="font-extrabold text-blue-700 block mb-1">
                            Model Sample Answer:
                          </span>
                          <div className="text-slate-800 leading-relaxed whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200/80">
                            <LatexRenderer content={q.sampleAnswer} />
                          </div>
                        </div>
                      )}

                      {q.keyRubricPoints && q.keyRubricPoints.length > 0 && (
                        <div>
                          <span className="font-extrabold text-slate-700 block mb-1">
                            Grading Criteria & Rubric:
                          </span>
                          <ul className="space-y-1 pl-2">
                            {q.keyRubricPoints.map((point, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2 text-slate-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                <div>
                                  <LatexRenderer content={point} />
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Manual Add MC Modal */}
      <ModalPortal
        isOpen={isAddMcModalOpen}
        onClose={() => setIsAddMcModalOpen(false)}
        maxWidth="max-w-2xl"
        className="p-6 space-y-5"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
          Add Multiple Choice Question
        </h3>
        <form onSubmit={handleSaveManualMc} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">
              Question Prompt (LaTeX formulas supported via $...$):
            </label>
            <textarea
              rows={3}
              required
              value={newMcQuestion}
              onChange={(e) => setNewMcQuestion(e.target.value)}
              placeholder="e.g. Find the derivative of $f(x) = 3x^2 + 5x$..."
              className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2.5">
            <label className="block font-bold text-slate-700 dark:text-[#e8eaed]">Options (Select the correct one):</label>
            {newMcOptions.map((opt, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <input
                  type="radio"
                  name="correctOption"
                  checked={newMcCorrect === i}
                  onChange={() => setNewMcCorrect(i)}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
                <span className="font-bold text-slate-500 dark:text-[#9aa0a6] w-5">{String.fromCharCode(65 + i)}:</span>
                <input
                  type="text"
                  required
                  value={opt}
                  onChange={(e) => {
                    const next = [...newMcOptions];
                    next[i] = e.target.value;
                    setNewMcOptions(next);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="flex-1 p-2.5 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl text-xs sm:text-sm"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">Explanation (Optional):</label>
            <textarea
              rows={2}
              value={newMcExplanation}
              onChange={(e) => setNewMcExplanation(e.target.value)}
              placeholder="Explain why the answer is correct with $LaTeX$ steps..."
              className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#26282a]">
            <button
              type="button"
              onClick={() => setIsAddMcModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer google-btn-press shadow-xs"
            >
              Save Question
            </button>
          </div>
        </form>
      </ModalPortal>

      {/* Manual Add LA Modal */}
      <ModalPortal
        isOpen={isAddLaModalOpen}
        onClose={() => setIsAddLaModalOpen(false)}
        maxWidth="max-w-2xl"
        className="p-6 space-y-5"
      >
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#e8eaed]" style={{ fontFamily: "'Google Sans', sans-serif" }}>
          Add Long Answer Question
        </h3>
        <form onSubmit={handleSaveManualLa} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">Question Prompt:</label>
            <textarea
              rows={3}
              required
              value={newLaQuestion}
              onChange={(e) => setNewLaQuestion(e.target.value)}
              placeholder="e.g. Derive the kinematic equation for position..."
              className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">Model Sample Answer:</label>
            <textarea
              rows={4}
              required
              value={newLaSampleAnswer}
              onChange={(e) => setNewLaSampleAnswer(e.target.value)}
              placeholder="Step-by-step complete solution with $LaTeX$..."
              className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl focus:outline-hidden font-mono text-xs sm:text-sm leading-relaxed"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-[#e8eaed] mb-1.5">Key Rubric Points (One per line):</label>
            <textarea
              rows={3}
              value={newLaRubric}
              onChange={(e) => setNewLaRubric(e.target.value)}
              placeholder="e.g. Defines initial conditions&#10;Integrates acceleration&#10;Accounts for integration constant"
              className="w-full p-3 bg-slate-50 dark:bg-[#0f0f10] border border-slate-200 dark:border-[#26282a] text-slate-900 dark:text-[#e8eaed] rounded-xl focus:outline-hidden"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-[#26282a]">
            <button
              type="button"
              onClick={() => setIsAddLaModalOpen(false)}
              className="px-4 py-2 text-xs sm:text-sm text-slate-600 dark:text-[#c4c7c5] hover:bg-slate-100 dark:hover:bg-[#202123] rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold cursor-pointer google-btn-press shadow-xs"
            >
              Save Question
            </button>
          </div>
        </form>
      </ModalPortal>
    </div>
  );
};
