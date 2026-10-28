/**
 * Extracts plain text from an uploaded PDF file in the browser.
 */
export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (typeof window !== 'undefined') {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
      } catch (err) {
        console.warn('Could not set pdfjs workerSrc:', err);
      }
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const textChunks: string[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');

      if (pageText.trim()) {
        textChunks.push(`--- Page ${pageNum} ---\n${pageText.trim()}`);
      }
    }

    const fullText = textChunks.join('\n\n');
    if (fullText.trim().length > 0) {
      return fullText;
    }
  } catch (err) {
    console.warn('PDF.js text extraction error, trying fallback parser:', err);
  }

  // Fallback: extract ASCII/UTF-8 readable text from buffer
  try {
    const text = await file.text();
    const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ').trim();
    if (cleaned.length > 50) {
      return cleaned;
    }
  } catch {
    // ignore
  }

  return `[PDF Document: ${file.name} - ${(file.size / 1024).toFixed(1)} KB]`;
}
