import React, { useState } from 'react';
import {
  X,
  Download,
  Printer,
  FileText,
  Award,
  GraduationCap,
  Building,
  User,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  getGradePoint,
} from '../utils/gradeCalculations';
import { downloadTranscriptPdf } from '../utils/transcriptPdfGenerator';

interface TranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassItem[];
  defaultStudentName?: string;
}

export const TranscriptModal: React.FC<TranscriptModalProps> = ({
  isOpen,
  onClose,
  classes,
  defaultStudentName,
}) => {
  const [studentName, setStudentName] = useState(defaultStudentName || 'Student');
  const [studentId, setStudentId] = useState(
    () => `GB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [institutionName, setInstitutionName] = useState('Academic Institution');
  const [programName, setProgramName] = useState('Undergraduate Degree Program');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);

  if (!isOpen) return null;

  const overall = calculateOverallAverage(classes);
  const gpaInfo = calculateCumulativeGPA(classes);

  let standingBadge = { label: 'Good Academic Standing', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (gpaInfo.gpa >= 3.85) {
    standingBadge = { label: "Dean's Honours List (Highest Distinction)", color: 'bg-blue-50 text-blue-700 border-blue-200' };
  } else if (gpaInfo.gpa >= 3.5) {
    standingBadge = { label: 'First Class Standing (Distinction)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  } else if (gpaInfo.gpa < 2.0 && classes.length > 0) {
    standingBadge = { label: 'Academic Review Required', color: 'bg-amber-50 text-amber-700 border-amber-200' };
  }

  const handleDownload = () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      downloadTranscriptPdf(classes, {
        studentName,
        studentId,
        institutionName,
        programName,
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="transcript-modal-title"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header Bar */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="transcript-modal-title" className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                Official Academic Transcript
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100/70 text-blue-700 border border-blue-200">
                  PDF Export
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Official verified record of course enrollments, grade calculations, and GPA.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#FAFBFD]">
          {/* Customization Accordion */}
          <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  Transcript Details & Customization
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure student information that will appear on the exported PDF.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomizing((prev) => !prev)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
              >
                {isCustomizing ? 'Hide Options' : 'Edit Details'}
              </button>
            </div>

            {isCustomizing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-4 pt-3.5 border-t border-slate-100">
                <div>
                  <label htmlFor="student-name-input" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Student Full Name
                  </label>
                  <input
                    id="student-name-input"
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="e.g., Alex Johnson"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                <div>
                  <label htmlFor="student-id-input" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Student ID / Roll Number
                  </label>
                  <input
                    id="student-id-input"
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="e.g., STU-2026-9042"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                <div>
                  <label htmlFor="institution-input" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Institution / University Name
                  </label>
                  <input
                    id="institution-input"
                    type="text"
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="e.g., University of British Columbia"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>

                <div>
                  <label htmlFor="program-input" className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Degree / Academic Program
                  </label>
                  <input
                    id="program-input"
                    type="text"
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="e.g., B.Sc. in Computer Science"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-hidden transition-all bg-slate-50/50"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Transcript Document Live Paper Preview */}
          <div className="bg-white rounded-xl border border-slate-300 shadow-md p-5 sm:p-7 relative overflow-hidden font-sans text-slate-800">
            {/* Top decorative dual accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-blue-900" />
            <div className="absolute top-1.5 left-0 right-0 h-0.5 bg-amber-500" />

            {/* University & Title Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg sm:text-xl font-black text-blue-900 tracking-tight flex items-center gap-2">
                  <Building className="w-5 h-5 text-blue-800" />
                  {institutionName.toUpperCase()}
                </h3>
                <p className="text-[11px] font-medium text-slate-500 tracking-wider">
                  OFFICE OF THE REGISTRAR • OFFICIAL ACADEMIC TRANSCRIPT
                </p>
              </div>

              <div className="text-left sm:text-right">
                <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-800 text-[11px] font-bold rounded-lg border border-blue-200">
                  OFFICIAL RECORD
                </span>
                <p className="text-[10px] text-slate-400 mt-1 flex items-center sm:justify-end gap-1">
                  <Calendar className="w-3 h-3" />
                  Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Student Dossier Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 my-4 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Student Name</span>
                <span className="font-bold text-slate-900 text-sm">{studentName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Student ID</span>
                <span className="font-mono font-bold text-blue-900">{studentId}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Program</span>
                <span className="font-medium text-slate-700 truncate block">{programName}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">Standing</span>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${standingBadge.color}`}>
                  {standingBadge.label}
                </span>
              </div>
            </div>

            {/* Summary Metrics Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-center">
                <span className="text-[10px] font-bold text-blue-700 block uppercase">Cumulative GPA</span>
                <span className="text-xl font-black text-blue-900">{gpaInfo.gpa.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block">Scale 4.00</span>
              </div>
              <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 text-center">
                <span className="text-[10px] font-bold text-sky-700 block uppercase">Weighted Average</span>
                <span className="text-xl font-black text-sky-900">{overall.overallAverage.toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 block">Grade: {overall.letterGrade}</span>
              </div>
              <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 text-center">
                <span className="text-[10px] font-bold text-teal-700 block uppercase">Total Credits</span>
                <span className="text-xl font-black text-teal-900">{gpaInfo.totalCredits}</span>
                <span className="text-[10px] text-slate-500 block">{classes.length} Courses</span>
              </div>
              <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
                <span className="text-[10px] font-bold text-indigo-700 block uppercase">Unweighted GPA</span>
                <span className="text-xl font-black text-indigo-900">{gpaInfo.unweightedGpa.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 block">Scale 4.00</span>
              </div>
            </div>

            {/* Course Table Preview */}
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-blue-900 text-white font-semibold text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Course Title</th>
                    <th className="py-2.5 px-2">Categories</th>
                    <th className="py-2.5 px-2 text-center">Credits</th>
                    <th className="py-2.5 px-2 text-right">Average</th>
                    <th className="py-2.5 px-2 text-center">Letter</th>
                    <th className="py-2.5 px-3 text-right">Points (4.0)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 italic">
                        No courses recorded yet. Add courses in Gradebook to populate this transcript.
                      </td>
                    </tr>
                  ) : (
                    classes.map((c, idx) => {
                      const calc = calculateClassAverage(c);
                      const credits = typeof c.credits === 'number' && c.credits > 0 ? c.credits : 3.0;
                      const gradePoint = getGradePoint(calc.average);

                      return (
                        <tr key={c.id} className={idx % 2 === 1 ? 'bg-slate-50/60' : 'bg-white'}>
                          <td className="py-2 px-3 font-semibold text-slate-900">{c.name}</td>
                          <td className="py-2 px-2 text-[10px] text-slate-500 truncate max-w-[150px]">
                            {c.categories.map((cat) => `${cat.name} (${cat.weight}%)`).join(', ') || 'No categories'}
                          </td>
                          <td className="py-2 px-2 text-center text-slate-700">{credits.toFixed(1)}</td>
                          <td className="py-2 px-2 text-right font-bold text-blue-900">{calc.average.toFixed(1)}%</td>
                          <td className="py-2 px-2 text-center font-bold text-slate-800">{calc.letterGrade}</td>
                          <td className="py-2 px-3 text-right font-mono font-semibold text-slate-800">{gradePoint.toFixed(2)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {classes.length > 0 && (
                  <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                    <tr>
                      <td colSpan={2} className="py-2 px-3 text-blue-900">
                        CUMULATIVE TOTALS & WEIGHTED GPA
                      </td>
                      <td className="py-2 px-2 text-center">{gpaInfo.totalCredits.toFixed(1)} cr</td>
                      <td className="py-2 px-2 text-right text-blue-900">{overall.overallAverage.toFixed(1)}%</td>
                      <td className="py-2 px-2 text-center">{overall.letterGrade}</td>
                      <td className="py-2 px-3 text-right text-emerald-700">{gpaInfo.gpa.toFixed(2)} GPA</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {/* Official Certification Seal & Signature Preview */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-blue-900 border-double flex items-center justify-center text-center p-1">
                  <div className="w-9 h-9 rounded-full border border-amber-500 flex flex-col items-center justify-center">
                    <Award className="w-4 h-4 text-blue-900" />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-900 uppercase block tracking-wider">
                    Official Gradebook Seal
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Certified mathematical transcript calculation • Verified record
                  </p>
                </div>
              </div>

              <div className="text-right w-full sm:w-auto">
                <div className="font-serif italic text-blue-900 text-sm border-b border-slate-400 pb-1 px-4">
                  Office of the Registrar
                </div>
                <span className="text-[10px] font-bold text-slate-600 block mt-0.5">
                  Registrar & Dean of Academic Records
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer with Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 w-full sm:w-auto justify-center sm:justify-start">
            {downloadSuccess ? (
              <span className="text-emerald-600 font-bold flex items-center gap-1 animate-fade-in">
                <CheckCircle2 className="w-4 h-4" />
                Transcript PDF downloaded successfully!
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                A4 printable PDF with certified 4.0 grading key
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-md shadow-blue-500/25 rounded-xl transition-all cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{isDownloading ? 'Generating PDF...' : 'Download Official Transcript (PDF)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
