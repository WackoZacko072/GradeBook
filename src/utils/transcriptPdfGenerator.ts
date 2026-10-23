import jsPDF from 'jspdf';
import type { ClassItem } from '../types/grade';
import {
  calculateClassAverage,
  calculateOverallAverage,
  calculateCumulativeGPA,
  getGradePoint,
} from './gradeCalculations';

export interface TranscriptOptions {
  studentName?: string;
  studentId?: string;
  institutionName?: string;
  programName?: string;
  termName?: string;
  dateIssued?: string;
}

/**
 * Generates an official, beautifully designed Academic Transcript PDF using jsPDF.
 */
export function generateTranscriptPdf(
  classes: ClassItem[],
  options: TranscriptOptions = {}
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 15;
  const rightMargin = 15;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 180mm

  const studentName = (options.studentName || 'Student').trim();
  const studentId = (options.studentId || `GB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`).trim();
  const institutionName = (options.institutionName || 'Academic Institution').trim();
  const programName = (options.programName || 'Undergraduate Degree Program').trim();
  const dateIssued = options.dateIssued || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate statistics
  const overall = calculateOverallAverage(classes);
  const gpaInfo = calculateCumulativeGPA(classes);

  let academicStanding = 'Good Academic Standing';
  if (gpaInfo.gpa >= 3.85) {
    academicStanding = "Dean's Honours List (Highest Distinction)";
  } else if (gpaInfo.gpa >= 3.5) {
    academicStanding = 'First Class Standing (Distinction)';
  } else if (gpaInfo.gpa < 2.0 && classes.length > 0) {
    academicStanding = 'Academic Review Required';
  }

  // Draw header decorations
  function drawPageDecorations(pageNum: number, totalPagesPlaceholder: boolean = false) {
    // Top dual-tone accent bars
    doc.setFillColor(30, 58, 138); // Deep Navy (#1E3A8A)
    doc.rect(0, 0, pageWidth, 5, 'F');

    doc.setFillColor(217, 119, 6); // Warm Amber Gold (#D97706)
    doc.rect(0, 5, pageWidth, 1.2, 'F');

    // Bottom dual-tone accent bars
    doc.setFillColor(217, 119, 6);
    doc.rect(0, pageHeight - 6.2, pageWidth, 1.2, 'F');

    doc.setFillColor(30, 58, 138);
    doc.rect(0, pageHeight - 5, pageWidth, 5, 'F');

    // Bottom confidential footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      'CONFIDENTIAL • OFFICIAL ACADEMIC TRANSCRIPT • GRADEBOOK VERIFIED RECORD',
      leftMargin,
      pageHeight - 9
    );

    const pageStr = totalPagesPlaceholder ? `Page ${pageNum}` : `Page ${pageNum}`;
    doc.text(pageStr, pageWidth - rightMargin - 15, pageHeight - 9);
  }

  // Draw first page
  drawPageDecorations(1);

  // Institution & Title Section
  let curY = 17;

  // Institution title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(30, 58, 138); // Deep Navy
  doc.text(institutionName.toUpperCase(), leftMargin, curY);

  curY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('OFFICE OF THE REGISTRAR • OFFICIAL ACADEMIC RECORD', leftMargin, curY);

  // Official badge in top right
  doc.setFillColor(239, 246, 255); // Soft blue background
  doc.setDrawColor(191, 219, 254); // Blue border
  doc.setLineWidth(0.3);
  doc.roundedRect(pageWidth - rightMargin - 52, 12, 52, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(29, 78, 216); // Blue 700
  doc.text('OFFICIAL TRANSCRIPT', pageWidth - rightMargin - 47, 16.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('AUTHENTICATED STUDENT DOSSIER', pageWidth - rightMargin - 50, 21);

  // Divider
  curY += 6;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, curY, pageWidth - rightMargin, curY);

  // Student Profile Card
  curY += 4;
  const profileCardHeight = 25;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, curY, contentWidth, profileCardHeight, 2, 2, 'FD');

  // Left Column: Student Details
  const col1X = leftMargin + 5;
  const col2X = leftMargin + 95;

  let rowY = curY + 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STUDENT NAME:', col1X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(studentName, col1X + 28, rowY);

  // Right Column: Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('ISSUE DATE:', col2X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(dateIssued, col2X + 24, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STUDENT ID:', col1X, rowY);
  doc.setFont('courier', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 58, 138);
  doc.text(studentId, col1X + 28, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('STANDING:', col2X, rowY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // Emerald 700
  doc.text(academicStanding, col2X + 24, rowY);

  rowY += 6.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('PROGRAM:', col1X, rowY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(programName, col1X + 28, rowY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFICATION:', col2X, rowY);
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  const authCode = `TR-${studentId.replace(/[^A-Z0-9]/gi, '').slice(-4) || 'GB'}-${Math.abs(Math.round(gpaInfo.gpa * 100))}${Math.abs(Math.round(overall.overallAverage))}`;
  doc.text(authCode, col2X + 24, rowY);

  curY += profileCardHeight + 5;

  // 4 Performance Stat Cards
  const statCardWidth = (contentWidth - 9) / 4; // 4 cards with 3mm gaps
  const statCardHeight = 15;

  const statData = [
    { label: 'CUMULATIVE GPA', value: `${gpaInfo.gpa.toFixed(2)}`, sub: 'Scale of 4.00', color: [30, 58, 138] },
    { label: 'WEIGHTED AVG', value: `${overall.overallAverage.toFixed(1)}%`, sub: `Letter: ${overall.letterGrade}`, color: [2, 132, 199] },
    { label: 'TOTAL CREDITS', value: `${gpaInfo.totalCredits}`, sub: `${classes.length} Courses`, color: [13, 148, 136] },
    { label: 'UNWEIGHTED GPA', value: `${gpaInfo.unweightedGpa.toFixed(2)}`, sub: 'Unweighted 4.00', color: [99, 102, 241] },
  ];

  statData.forEach((stat, idx) => {
    const cardX = leftMargin + idx * (statCardWidth + 3);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.roundedRect(cardX, curY, statCardWidth, statCardHeight, 1.5, 1.5, 'FD');

    // Colored top pill
    doc.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.rect(cardX, curY, statCardWidth, 1.2, 'F');

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(stat.label, cardX + statCardWidth / 2, curY + 4.5, { align: 'center' });

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(stat.color[0], stat.color[1], stat.color[2]);
    doc.text(stat.value, cardX + statCardWidth / 2, curY + 9.5, { align: 'center' });

    // Sub
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(stat.sub, cardX + statCardWidth / 2, curY + 13, { align: 'center' });
  });

  curY += statCardHeight + 7;

  // Course Record Table Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text('COURSE-BY-COURSE ACADEMIC RECORD', leftMargin, curY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Total Recorded Enrollments: ${classes.length}`, pageWidth - rightMargin, curY, { align: 'right' });

  curY += 2.5;

  // Table Columns
  // Total width: 180mm
  // Course (65) + Categories (43) + Credits (16) + Avg (20) + Letter (16) + Points (20) = 180mm
  const colCourseX = leftMargin;
  const colCatX = leftMargin + 65;
  const colCredX = leftMargin + 108;
  const colAvgX = leftMargin + 124;
  const colLetX = leftMargin + 144;
  const colPtsX = leftMargin + 160;

  // Table Header Bar
  const tableHeaderHeight = 6.5;
  doc.setFillColor(30, 58, 138); // Deep Navy Header
  doc.rect(leftMargin, curY, contentWidth, tableHeaderHeight, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);

  doc.text('COURSE CODE & TITLE', colCourseX + 2, curY + 4.5);
  doc.text('CATEGORIES & WEIGHTS', colCatX + 2, curY + 4.5);
  doc.text('CREDITS', colCredX + 8, curY + 4.5, { align: 'center' });
  doc.text('AVERAGE', colAvgX + 17, curY + 4.5, { align: 'right' });
  doc.text('LETTER', colLetX + 8, curY + 4.5, { align: 'center' });
  doc.text('POINTS (4.0)', colPtsX + 18, curY + 4.5, { align: 'right' });

  curY += tableHeaderHeight;

  // Table Rows
  let pageCount = 1;

  if (classes.length === 0) {
    doc.setFillColor(248, 250, 252);
    doc.rect(leftMargin, curY, contentWidth, 12, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No active course records found in this academic term.', leftMargin + contentWidth / 2, curY + 7, {
      align: 'center',
    });
    curY += 12;
  } else {
    classes.forEach((c, idx) => {
      const calc = calculateClassAverage(c);
      const credits = typeof c.credits === 'number' && c.credits > 0 ? c.credits : 3.0;
      const gradePoint = getGradePoint(calc.average);

      const rowHeight = 9.5;

      // Check if row exceeds page boundaries before drawing
      if (curY + rowHeight > pageHeight - 50) {
        doc.addPage();
        pageCount++;
        drawPageDecorations(pageCount);
        curY = 20;

        // Redraw table header on new page
        doc.setFillColor(30, 58, 138);
        doc.rect(leftMargin, curY, contentWidth, tableHeaderHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('COURSE CODE & TITLE', colCourseX + 2, curY + 4.5);
        doc.text('CATEGORIES & WEIGHTS', colCatX + 2, curY + 4.5);
        doc.text('CREDITS', colCredX + 8, curY + 4.5, { align: 'center' });
        doc.text('AVERAGE', colAvgX + 17, curY + 4.5, { align: 'right' });
        doc.text('LETTER', colLetX + 8, curY + 4.5, { align: 'center' });
        doc.text('POINTS (4.0)', colPtsX + 18, curY + 4.5, { align: 'right' });
        curY += tableHeaderHeight;
      }

      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(leftMargin, curY, contentWidth, rowHeight, 'F');

      // Light bottom border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, curY + rowHeight, pageWidth - rightMargin, curY + rowHeight);

      // Course Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      const courseTitle = c.name.length > 34 ? `${c.name.substring(0, 32)}...` : c.name;
      doc.text(courseTitle, colCourseX + 2, curY + 4);

      // Target note
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Target: ${c.targetGrade || 90}%`, colCourseX + 2, curY + 7.5);

      // Categories summary
      const catSummary = c.categories.map((cat) => `${cat.name} (${cat.weight}%)`).join(', ');
      const catText = catSummary.length > 28 ? `${catSummary.substring(0, 26)}...` : (catSummary || 'No categories defined');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(catText, colCatX + 2, curY + 5.5);

      // Credits
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(credits.toFixed(1), colCredX + 8, curY + 5.5, { align: 'center' });

      // Average %
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text(`${calc.average.toFixed(1)}%`, colAvgX + 17, curY + 5.5, { align: 'right' });

      // Letter Grade
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      let letterColor = [15, 23, 42];
      if (calc.letterGrade.startsWith('A')) letterColor = [4, 120, 87];
      else if (calc.letterGrade.startsWith('B')) letterColor = [2, 132, 199];
      else if (calc.letterGrade.startsWith('C')) letterColor = [217, 119, 6];
      else if (calc.letterGrade === 'F') letterColor = [225, 29, 72];

      doc.setTextColor(letterColor[0], letterColor[1], letterColor[2]);
      doc.text(calc.letterGrade, colLetX + 8, curY + 5.5, { align: 'center' });

      // Grade Points
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(gradePoint.toFixed(2), colPtsX + 18, curY + 5.5, { align: 'right' });

      curY += rowHeight;
    });

    // Summary Totals Row
    const totalsRowHeight = 8;
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(leftMargin, curY, contentWidth, totalsRowHeight, 'F');

    // Thicker border on totals row
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(leftMargin, curY, pageWidth - rightMargin, curY);
    doc.line(leftMargin, curY + totalsRowHeight, pageWidth - rightMargin, curY + totalsRowHeight);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 58, 138);
    doc.text('CUMULATIVE TOTALS & WEIGHTED GPA', leftMargin + 2, curY + 5.5);

    // Total Credits
    doc.text(`${gpaInfo.totalCredits.toFixed(1)} cr`, colCredX + 8, curY + 5.5, { align: 'center' });

    // Overall Average
    doc.text(`${overall.overallAverage.toFixed(1)}%`, colAvgX + 17, curY + 5.5, { align: 'right' });

    // Overall Letter
    doc.text(overall.letterGrade, colLetX + 8, curY + 5.5, { align: 'center' });

    // Cumulative GPA
    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87); // Emerald 700
    doc.text(`${gpaInfo.gpa.toFixed(2)} GPA`, colPtsX + 18, curY + 5.5, { align: 'right' });

    curY += totalsRowHeight + 5;
  }

  // Check if grading scale & signature fit on current page, otherwise new page
  if (curY + 38 > pageHeight - 35) {
    doc.addPage();
    pageCount++;
    drawPageDecorations(pageCount);
    curY = 20;
  }

  // Official Grading Scale Legend
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(leftMargin, curY, contentWidth, 12, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('OFFICIAL 4.0 GRADING & CONVERSION KEY:', leftMargin + 3, curY + 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'A+ (97-100% | 4.0)   •   A (93-96% | 4.0)   •   A- (90-92% | 3.7)   •   B+ (87-89% | 3.3)   •   B (83-86% | 3.0)   •   B- (80-82% | 2.7)',
    leftMargin + 3,
    curY + 7.5
  );
  doc.text(
    'C+ (77-79% | 2.3)   •   C (73-76% | 2.0)   •   C- (70-72% | 1.7)   •   D (60-69% | 1.0)   •   F (<60% | 0.0)   •   Cumulative GPA = Quality Points / Credits',
    leftMargin + 3,
    curY + 10.5
  );

  curY += 17;

  // Official Verification Seal & Registrar Signature Block
  const sigBoxY = curY;

  // Left: Decorative Verification Stamp
  const sealCenterX = leftMargin + 25;
  const sealCenterY = sigBoxY + 10;

  doc.setDrawColor(30, 58, 138); // Navy
  doc.setLineWidth(0.6);
  doc.circle(sealCenterX, sealCenterY, 9, 'D');

  doc.setDrawColor(217, 119, 6); // Gold Inner Circle
  doc.setLineWidth(0.3);
  doc.circle(sealCenterX, sealCenterY, 7.5, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  doc.setTextColor(30, 58, 138);
  doc.text('OFFICIAL SEAL', sealCenterX, sealCenterY - 1.5, { align: 'center' });
  doc.setFontSize(4.5);
  doc.setTextColor(217, 119, 6);
  doc.text('GRADEBOOK', sealCenterX, sealCenterY + 1, { align: 'center' });
  doc.setFontSize(4);
  doc.setTextColor(100, 116, 139);
  doc.text('VERIFIED RECORD', sealCenterX, sealCenterY + 3.2, { align: 'center' });

  // Seal certification text
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Certified as a true and official summary of academic records, grades, and cumulative GPA.',
    sealCenterX + 14,
    sigBoxY + 8
  );
  doc.text(
    `Compiled securely on ${dateIssued}. All course records conform to the Gradebook mathematical verification standard.`,
    sealCenterX + 14,
    sigBoxY + 12
  );

  // Right: Registrar Signature Line
  const sigLineX = pageWidth - rightMargin - 55;
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.line(sigLineX, sigBoxY + 12, pageWidth - rightMargin, sigBoxY + 12);

  // Stylized cursive-like script signature
  doc.setFont('times', 'italic');
  doc.setFontSize(11);
  doc.setTextColor(30, 58, 138);
  doc.text('Office of the Registrar', sigLineX + 8, sigBoxY + 10.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Registrar & Dean of Academic Records', sigLineX, sigBoxY + 15.5);

  return doc;
}

/**
 * Directly downloads the generated transcript PDF file to the user's computer.
 */
export function downloadTranscriptPdf(
  classes: ClassItem[],
  options: TranscriptOptions = {}
): void {
  const doc = generateTranscriptPdf(classes, options);
  const studentClean = (options.studentName || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Official_Transcript_${studentClean}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

/**
 * Returns a Blob URL for live in-browser previewing and printing.
 */
export function getTranscriptPdfBlobUrl(
  classes: ClassItem[],
  options: TranscriptOptions = {}
): string {
  const doc = generateTranscriptPdf(classes, options);
  const blob = doc.output('blob');
  return URL.createObjectURL(blob);
}
