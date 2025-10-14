import mammoth from 'mammoth';

// Alternative PDF text extraction using a completely different approach
// We'll try to bypass PDF.js entirely and use a simpler method

// Improved PDF text extraction that focuses on actual content
const extractPDFTextSimple = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  const uint8Array = new Uint8Array(arrayBuffer);
  let text = '';
  
  // Convert binary to string first
  for (let i = 0; i < uint8Array.length; i++) {
    const char = uint8Array[i];
    if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
      text += String.fromCharCode(char);
    } else {
      text += ' '; // Replace non-printable with space
    }
  }
  
  // Look for PDF text content patterns - PDF stores text in specific ways
  const contentLines = [];
  
  // Method 1: Look for text between BT (Begin Text) and ET (End Text) operators
  const btEtPattern = /BT\s+(.*?)\s+ET/gs;
  let match;
  while ((match = btEtPattern.exec(text)) !== null) {
    const textBlock = match[1];
    // Extract text from PDF text showing operators like (text) Tj or [(text)] TJ
    const textMatches = textBlock.match(/\((.*?)\)\s*T[jJ]/g);
    if (textMatches) {
      textMatches.forEach(tm => {
        const extracted = tm.match(/\((.*?)\)/);
        if (extracted && extracted[1]) {
          const cleanText = extracted[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\050/g, '(')
            .replace(/\\051/g, ')')
            .replace(/\\([0-9]{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
          
          // Better content filtering
          if (cleanText.length > 5 && 
              /[a-zA-Z]/.test(cleanText) &&
              !cleanText.match(/^[A-Z0-9_\-\/]+$/) && // Skip constants
              !cleanText.includes('obj') &&
              !cleanText.includes('endobj')) {
            contentLines.push(cleanText.trim());
          }
        }
      });
    }
  }
  
  // Method 2: Look for text in array format [(text) spacing (more text)] TJ
  const arrayTextPattern = /\[(.*?)\]\s*TJ/gs;
  while ((match = arrayTextPattern.exec(text)) !== null) {
    const arrayContent = match[1];
    const textParts = arrayContent.match(/\((.*?)\)/g);
    if (textParts) {
      const lineText = [];
      textParts.forEach(part => {
        const extracted = part.match(/\((.*?)\)/);
        if (extracted && extracted[1]) {
          const cleanText = extracted[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\050/g, '(')
            .replace(/\\051/g, ')')
            .replace(/\\([0-9]{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
          
          if (cleanText.trim() && !cleanText.match(/^[0-9\s\-\.]+$/)) {
            lineText.push(cleanText);
          }
        }
      });
      
      if (lineText.length > 0) {
        const fullLine = lineText.join('').trim();
        if (fullLine.length > 5 && /[a-zA-Z]/.test(fullLine)) {
          contentLines.push(fullLine);
        }
      }
    }
  }
  
  // Remove duplicates and filter meaningful content
  const uniqueLines = [...new Set(contentLines)]
    .filter(line => {
      // More lenient filtering to capture more content
      return line.length > 5 && // Shorter minimum length
             /[a-zA-Z]/.test(line) &&
             !line.match(/^[0-9\s.,-]+$/) &&
             line.split(/\s+/).filter(word => word.length > 1).length >= 1 && // At least 1 word
             !line.includes('Type') &&
             !line.includes('Subtype') &&
             !line.includes('Font') &&
             !line.includes('Encoding') &&
             !line.includes('stream') &&
             !line.includes('endstream') &&
             !line.includes('Adobe') &&
             !line.includes('Producer') &&
             !line.includes('Creator') &&
             !line.includes('xref') &&
             !line.includes('%%EOF');
    });
  
  // Additional extraction: Look for text in stream objects
  const streamPattern = /stream\s+(.*?)\s+endstream/gs;
  let streamMatch;
  while ((streamMatch = streamPattern.exec(text)) !== null) {
    const streamContent = streamMatch[1];
    // Look for text in stream content
    const streamTextMatches = streamContent.match(/\((.*?)\)/g);
    if (streamTextMatches) {
      streamTextMatches.forEach(tm => {
        const extracted = tm.match(/\((.*?)\)/);
        if (extracted && extracted[1]) {
          const cleanText = extracted[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .replace(/\\"/g, '"')
            .replace(/\\'/g, "'")
            .replace(/\\050/g, '(')
            .replace(/\\051/g, ')')
            .replace(/\\([0-9]{3})/g, (match, octal) => String.fromCharCode(parseInt(octal, 8)));
          
          if (cleanText.length > 3 && /[a-zA-Z]/.test(cleanText)) {
            contentLines.push(cleanText.trim());
          }
        }
      });
    }
  }
  
  // Final filtering and deduplication
  const finalLines = [...new Set([...uniqueLines, ...contentLines])]
    .filter(line => line.length > 3 && /[a-zA-Z]/.test(line))
    .filter(line => !line.match(/^[0-9\s.,-]+$/));
  
  return finalLines.join('\n').trim();
};

// PDF.js library instance
let pdfjsLib: any = null;

const initializePDFJS = async () => {
  if (pdfjsLib) return pdfjsLib;
  
  try {
    // Import PDF.js
    pdfjsLib = await import('pdfjs-dist');
    
    // Properly configure the worker
    if (pdfjsLib.GlobalWorkerOptions) {
      // Set the worker source to the file in public directory
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    
    console.log('✅ PDF.js initialized successfully');
    return pdfjsLib;
  } catch (error) {
    console.error('❌ Failed to initialize PDF.js:', error);
    throw new Error('PDF.js initialization failed');
  }
};

/**
 * Extract text content from various file types
 */
export class FileTextExtractor {

  /**
   * Extract text from a PDF file using multiple approaches
   */
  static async extractFromPDF(file: File): Promise<string> {
    try {
      console.log('📄 Starting multi-approach PDF extraction for:', file.name, 'Size:', file.size, 'bytes');
      
      // Validate file size (prevent processing extremely large files)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        return `[PDF file "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum supported size is 50MB. Please try a smaller file or extract text manually.]`;
      }
      
      // Load the PDF file into an ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      console.log('📄 File loaded into ArrayBuffer, size:', arrayBuffer.byteLength);
      
      // Check if the file is actually a PDF by looking at the magic number
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8Array.slice(0, 5)).map(b => String.fromCharCode(b)).join('');
      if (!header.startsWith('%PDF-')) {
        return `[File "${file.name}" does not appear to be a valid PDF file. Please ensure you've uploaded a PDF document.]`;
      }
      
      // APPROACH 1: Try PDF.js first (more reliable for actual content)
      console.log('📄 Attempting PDF.js extraction...');
      try {
        const pdfjsText = await this.extractFromPDFWithPDFJS(file, arrayBuffer);
        // Check if PDF.js extraction was successful and contains actual content
        if (pdfjsText && 
            pdfjsText.length > 100 && 
            !pdfjsText.includes('[PDF') && // Not an error message
            !pdfjsText.includes('[No readable text') &&
            /[a-zA-Z]/.test(pdfjsText)) {
          console.log(`📄 PDF.js extraction successful! Extracted ${pdfjsText.length} characters`);
          return pdfjsText;
        } else {
          console.log(`📄 PDF.js extraction yielded insufficient content, trying simple extraction...`);
        }
      } catch (pdfjsError) {
        console.warn('📄 PDF.js extraction failed:', pdfjsError);
      }
      
      // APPROACH 1.5: Try direct binary text extraction first (more reliable)
      console.log('📄 Attempting direct binary text extraction...');
      try {
        const directText = await extractPDFTextSimple(arrayBuffer);
        
        if (directText && 
            directText.length > 200 && 
            directText.split('\n').filter(line => line.trim().length > 10).length > 5 &&
            !this.isLikelyMetadata(directText) &&
            this.isValidTextContent(directText)) {
          console.log(`📄 Direct extraction successful! Extracted ${directText.length} characters`);
          return `Text extracted from ${file.name}:\n\n${directText}`;
        } else {
          console.log(`📄 Direct extraction yielded insufficient content`);
        }
      } catch (directError) {
        console.warn('📄 Direct extraction failed:', directError);
      }
      
      // APPROACH 2: Try simple binary text extraction as fallback
      console.log('📄 Attempting simple binary text extraction...');
      try {
        const simpleText = await extractPDFTextSimple(arrayBuffer);
        
        // More lenient quality checks for simple extraction
        if (simpleText && 
            simpleText.length > 100 && // Lower threshold
            simpleText.split('\n').filter(line => line.trim().length > 5).length > 3 && // Fewer meaningful lines
            !this.isLikelyMetadata(simpleText) && // Check if it looks like metadata
            this.isValidTextContent(simpleText)) { // Check if content is valid
          console.log(`📄 Simple extraction successful! Extracted ${simpleText.length} characters`);
          return `Text extracted from ${file.name}:\n\n${simpleText}`;
        } else {
          console.log(`📄 Simple extraction yielded insufficient or poor quality content`);
        }
      } catch (simpleError) {
        console.warn('📄 Simple extraction failed:', simpleError);
      }
      
      // APPROACH 3: Try raw binary text extraction (only if other methods failed)
      console.log('📄 Attempting raw binary text extraction...');
      try {
        const rawText = this.extractRawTextFromPDF(arrayBuffer);
        if (rawText && rawText.length > 100 && this.isValidTextContent(rawText)) {
          console.log(`📄 Raw extraction successful! Extracted ${rawText.length} characters`);
          return `Text extracted from ${file.name}:\n\n${rawText}`;
        } else {
          console.log(`📄 Raw extraction yielded invalid or corrupted content`);
        }
      } catch (rawError) {
        console.warn('📄 Raw extraction failed:', rawError);
      }
      
      // If all methods fail, return fallback instructions
      console.log('📄 All extraction methods failed, using fallback instructions');
      return await this.extractFromPDFFallback(file);
      
    } catch (error: any) {
      console.error('📄 All PDF extraction methods failed:', error);
      return this.getPDFExtractionInstructions(file.name) + '\n\nError details: All extraction methods failed.';
    }
  }
  
  /**
   * Extract text using PDF.js library
   */
  private static async extractFromPDFWithPDFJS(file: File, arrayBuffer: ArrayBuffer): Promise<string> {
    let pdfLib: any = null;
    let pdf: any = null;
    
    try {
      // Initialize PDF.js with proper error handling
      try {
        pdfLib = await initializePDFJS();
        console.log('📄 PDF.js library initialized successfully');
      } catch (initError) {
        console.error('📄 PDF.js initialization failed:', initError);
        throw new Error('PDF.js initialization failed');
      }
      
      // Ultra-minimal PDF.js configuration to avoid worker issues entirely
      const documentConfig = {
        data: arrayBuffer,
        verbosity: 0,
        disableAutoFetch: true,
        disableFontFace: true,
        useWorkerFetch: false,
        isEvalSupported: false,
        stopAtErrors: false,
        maxImageSize: -1,
        cMapPacked: false
      };
      
      console.log('📄 Loading PDF document with minimal configuration...');
      const loadingTask = pdfLib.getDocument(documentConfig);
      
      // Much shorter timeout for better performance
      const loadTimeout = 3000; // 3 seconds
      pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('PDF.js timeout')), loadTimeout)
        )
      ]);
      
      console.log(`📄 PDF.js loaded successfully! Pages: ${pdf.numPages}`);
      
      // Check for password protection or corruption
      if (!pdf || pdf.numPages === 0) {
        if (pdf) await pdf.destroy();
        return `[PDF "${file.name}" appears to be password-protected or corrupted. Please ensure the PDF is not encrypted and try again.]`;
      }
      
      let fullText = '';
      let totalTextItems = 0;
      let successfulPages = 0;
      const maxPages = Math.min(pdf.numPages, 500); // Limit for performance
      
      // Extract text from each page with comprehensive error handling
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        let page: any = null;
        
        try {
          console.log(`📄 Extracting text from page ${pageNum}/${maxPages}`);
          
          // Get page with much shorter timeout
          page = await Promise.race([
            pdf.getPage(pageNum),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Page loading timeout')), 2000) // 2 seconds
            )
          ]);
          
          // Extract text content with shorter timeout
          const textContent = await Promise.race([
            page.getTextContent({
              normalizeWhitespace: true,
              disableCombineTextItems: false
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Text extraction timeout')), 2000) // 2 seconds
            )
          ]) as any;
          
          console.log(`📄 Page ${pageNum} has ${textContent.items.length} text items`);
          totalTextItems += textContent.items.length;
          
          // Extract and clean up text with improved formatting
          const textItems = textContent.items || [];
          const pageText = textItems
            .filter((item: any) => item && item.str && typeof item.str === 'string' && item.str.trim())
            .map((item: any) => item.str.trim())
            .join(' ')
            .replace(/\s+/g, ' ') // Normalize spacing
            .trim();
          
          if (pageText && pageText.length > 0) {
            fullText += `Page ${pageNum}:\n${pageText}\n\n`;
            console.log(`📄 Page ${pageNum} extracted ${pageText.length} characters`);
            successfulPages++;
          } else {
            console.warn(`📄 Page ${pageNum} contains no readable text`);
            fullText += `Page ${pageNum}: [No readable text found on this page]\n\n`;
          }
          
        } catch (pageError: any) {
          console.error(`📄 Error extracting text from page ${pageNum}:`, pageError);
          fullText += `Page ${pageNum}: [Error extracting text: ${pageError.message || 'Unknown error'}]\n\n`;
        } finally {
          // Clean up page resources
          if (page && typeof page.cleanup === 'function') {
            try {
              page.cleanup();
            } catch (cleanupError) {
              console.warn(`📄 Page ${pageNum} cleanup failed:`, cleanupError);
            }
          }
        }
      }
      
      // Handle cases with too many pages
      if (pdf.numPages > 500) {
        fullText += `\n[Note: This PDF has ${pdf.numPages} pages. Only the first 500 pages were processed for performance reasons.]\n`;
      }
      
      const result = fullText.trim();
      if (result && successfulPages > 0) {
        console.log(`📄 PDF extraction successful! Total text length: ${result.length} characters from ${totalTextItems} text items across ${successfulPages} pages`);
        return result;
      } else {
        const message = `[No readable text content found in PDF "${file.name}". This could mean:
- The PDF contains only images or scanned content (requires OCR)
- The PDF is encrypted or password-protected
- The PDF uses a format that's not supported
- Text is embedded as images rather than selectable text

Total pages processed: ${pdf.numPages}, Text items found: ${totalTextItems}]`;
        console.warn(`📄 PDF extraction completed but no usable text found. Pages: ${pdf.numPages}, Items: ${totalTextItems}`);
        return message;
      }
      
    } catch (error: any) {
      console.error('📄 PDF extraction failed:', error);
      
      // Provide more specific error messages based on the error type
      let errorMessage = '';
      const errorMsg = error.message || '';
      
      if (errorMsg.includes('Invalid PDF structure') || errorMsg.includes('PDF header')) {
        errorMessage = `[PDF "${file.name}" has an invalid or corrupted structure. Please try re-saving or re-creating the PDF.]`;
      } else if (errorMsg.includes('Password required') || errorMsg.includes('password')) {
        errorMessage = `[PDF "${file.name}" is password-protected. Please remove the password protection and try again.]`;
      } else if (errorMsg.includes('timeout') || errorMsg.includes('worker communication failed')) {
        errorMessage = `[PDF "${file.name}" processing timed out due to worker communication issues. The browser may be blocking PDF.js worker execution.]`;
      } else if (errorMsg.includes('workerSrc') || errorMsg.includes('worker')) {
        errorMessage = `[PDF.js worker configuration issue. Browser security settings may be preventing PDF processing.]`;
      } else {
        errorMessage = `[Automated PDF processing failed for "${file.name}": ${errorMsg}]`;
      }
      
      // If extraction fails, throw error to trigger fallback
      throw new Error(`PDF.js extraction failed: ${errorMessage}`);
    } finally {
      // Ensure proper cleanup of PDF resources
      if (pdf && typeof pdf.destroy === 'function') {
        try {
          await pdf.destroy();
          console.log('📄 PDF.js resources cleaned up successfully');
        } catch (cleanupError) {
          console.warn('📄 PDF.js cleanup failed:', cleanupError);
        }
      }
    }
  }

  /**
   * Check if extracted text content is valid and not corrupted
   */
  private static isValidTextContent(text: string): boolean {
    if (!text || text.length < 50) return false;
    
    // Check for excessive special characters (indicating binary data)
    const specialCharCount = (text.match(/[^\w\s.,!?;:'"()-]/g) || []).length;
    const totalCharCount = text.length;
    const specialCharRatio = specialCharCount / totalCharCount;
    
    if (specialCharRatio > 0.3) {
      console.log(`📄 Text rejected: too many special characters (${specialCharRatio.toFixed(2)})`);
      return false;
    }
    
    // Check for readable word patterns
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const readableWords = words.filter(word => /^[a-zA-Z]+$/.test(word));
    const readableWordRatio = readableWords.length / words.length;
    
    if (readableWordRatio < 0.5) {
      console.log(`📄 Text rejected: too few readable words (${readableWordRatio.toFixed(2)})`);
      return false;
    }
    
    // Check for coherent sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const coherentSentences = sentences.filter(s => 
      s.split(' ').filter(word => word.length > 2).length >= 3
    );
    
    if (coherentSentences.length < 2) {
      console.log(`📄 Text rejected: insufficient coherent sentences`);
      return false;
    }
    
    return true;
  }

  /**
   * Extract raw text from PDF binary content
   */
  private static extractRawTextFromPDF(arrayBuffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(arrayBuffer);
    let text = '';
    
    // Extract all printable ASCII characters
    for (let i = 0; i < uint8Array.length; i++) {
      const char = uint8Array[i];
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        text += String.fromCharCode(char);
      }
    }
    
    // Look for text patterns that indicate actual content
    const lines = text.split('\n');
    const contentLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 10 && 
             /[a-zA-Z]/.test(trimmed) &&
             !trimmed.match(/^[0-9\s.,-]+$/) &&
             !trimmed.includes('obj') &&
             !trimmed.includes('endobj') &&
             !trimmed.includes('stream') &&
             !trimmed.includes('endstream') &&
             !trimmed.includes('xref') &&
             !trimmed.includes('%%EOF') &&
             // Additional filters to remove binary data
             !trimmed.match(/[^\x20-\x7E]/) && // Only printable ASCII
             !trimmed.includes('\\') &&
             !trimmed.includes('~') &&
             !trimmed.includes('`') &&
             !trimmed.includes('|') &&
             !trimmed.includes('#') &&
             !trimmed.includes('$') &&
             !trimmed.includes('%') &&
             !trimmed.includes('^') &&
             !trimmed.includes('&') &&
             !trimmed.includes('*') &&
             !trimmed.includes('(') &&
             !trimmed.includes(')') &&
             !trimmed.includes('_') &&
             !trimmed.includes('+') &&
             !trimmed.includes('=') &&
             !trimmed.includes('{') &&
             !trimmed.includes('}') &&
             !trimmed.includes('[') &&
             !trimmed.includes(']') &&
             !trimmed.includes('|') &&
             !trimmed.includes('\\') &&
             !trimmed.includes(':') &&
             !trimmed.includes(';') &&
             !trimmed.includes('"') &&
             !trimmed.includes("'") &&
             !trimmed.includes('<') &&
             !trimmed.includes('>') &&
             !trimmed.includes(',') &&
             !trimmed.includes('.') &&
             !trimmed.includes('?') &&
             !trimmed.includes('/');
    });
    
    return contentLines.join('\n').trim();
  }

  /**
   * Check if extracted text looks like PDF metadata rather than actual content
   */
  private static isLikelyMetadata(text: string): boolean {
    const metadataIndicators = [
      '/Type',
      '/Subtype', 
      '/Font',
      '/Encoding',
      'obj',
      'endobj',
      'stream',
      'endstream',
      '/Length',
      '/Filter',
      'xref',
      '%%EOF',
      '/Root',
      '/Info',
      '/Size',
      'startxref',
      '/Pages',
      '/Kids',
      '/Count',
      '/MediaBox',
      '/Resources',
      'Adobe',
      'Illustrator',
      'PDF-1.',
      '/Creator',
      '/Producer',
      'RGB',
      'CMYK'
    ];
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    let metadataCount = 0;
    let totalLines = lines.length;
    
    for (const line of lines.slice(0, 20)) { // Check first 20 lines
      for (const indicator of metadataIndicators) {
        if (line.includes(indicator)) {
          metadataCount++;
          break;
        }
      }
    }
    
    // If more than 40% of lines contain metadata indicators, it's likely metadata
    return totalLines > 0 && (metadataCount / Math.min(totalLines, 20)) > 0.4;
  }

  /**
   * Fallback PDF extraction method when primary method fails
   */
  static async extractFromPDFFallback(file: File): Promise<string> {
    console.log('📄 Using fallback PDF extraction method for:', file.name);
    
    // Basic file validation
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxFileSize) {
      return `[PDF file "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum supported size is 50MB. Please try a smaller file or extract text manually.]`;
    }
    
    // Check if it's actually a PDF
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8Array.slice(0, 5)).map(b => String.fromCharCode(b)).join('');
      
      if (!header.startsWith('%PDF-')) {
        return `[File "${file.name}" does not appear to be a valid PDF file. Please ensure you've uploaded a PDF document.]`;
      }
    } catch (error) {
      console.error('Fallback PDF validation failed:', error);
    }
    
    // Return helpful instructions for manual extraction
    // Check if this appears to be a visual/design-heavy PDF
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let pdfContent = '';
    for (let i = 0; i < Math.min(uint8Array.length, 10000); i++) {
      if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
        pdfContent += String.fromCharCode(uint8Array[i]);
      }
    }
    
    const isVisualPDF = pdfContent.includes('Illustrator') || 
                       pdfContent.includes('Adobe') ||
                       pdfContent.includes('.jpeg') ||
                       pdfContent.includes('Image') ||
                       (pdfContent.match(/RGB|CMYK/g) || []).length > 5;
    
    if (isVisualPDF) {
      return `[Visual presentation detected: "${file.name}"]

This appears to be a visual presentation created in Adobe Illustrator or similar design software, containing primarily images, graphics, and design elements rather than extractable text content.

**ANALYSIS APPROACH FOR VISUAL PRESENTATIONS:**

Since this is a visual presentation, I can still provide analysis, but I'll need you to describe the content. Here are two ways to proceed:

**Option 1 - Quick Description (Recommended):**
Simply describe what you see in the presentation:
- What is the main topic/message?
- What key points are presented on each slide?
- What images or graphics are used?
- Any data, statistics, or evidence shown?

**Option 2 - Text Extraction (If there is readable text):**
1. 📂 Open the PDF in your browser or PDF viewer
2. 📋 Try to select and copy any visible text (some may be embedded in images)
3. 💬 Paste any text you can copy into this chat

**Option 3 - Slide-by-Slide Summary:**
Go through each slide and tell me:
- Slide 1: [describe content]
- Slide 2: [describe content]
- etc.

✅ **Once you provide the content description, I'll conduct a complete scholarly analysis of the presentation's:**
- Visual argument and persuasive design choices
- Content structure and logical flow  
- Evidence presentation and credibility
- Target audience alignment
- Design effectiveness and recommendations`;
    } else {
      return `[PDF processing encountered technical difficulties with "${file.name}"]

The system was unable to automatically extract text from this PDF. This can happen with:
- Browser security restrictions preventing PDF.js worker execution
- Complex PDF layouts or embedded content
- Encrypted or password-protected PDFs

**IMMEDIATE SOLUTION: Manual text extraction (very simple!)**

**Method 1 - Copy/Paste (Takes 30 seconds):**
1. 📂 Open the PDF file in your browser or any PDF viewer
2. 📋 Select all text (Ctrl+A on Windows, Cmd+A on Mac)
3. 📝 Copy the text (Ctrl+C on Windows, Cmd+C on Mac) 
4. 💬 Paste it directly into this chat

**Method 2 - Online Conversion:**
1. Go to SmallPDF.com or ILovePDF.com
2. Use their "PDF to Text" converter
3. Upload your PDF and download as TXT
4. Upload the TXT file here instead

✅ **Once you provide the text, I'll immediately conduct the complete scholarly analysis including argumentative structure, evidence evaluation, and academic critique.**`;
    }
  }

  /**
   * Extract text from a Word document (.docx)
   */
  static async extractFromWord(file: File): Promise<string> {
    try {
      console.log('Extracting text from Word document:', file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.value && result.value.trim()) {
        console.log(`Word extraction successful: ${result.value.length} characters`);
        return result.value.trim();
      } else {
        return `[Word document "${file.name}" appears to be empty or text extraction failed]`;
      }
    } catch (error: any) {
      console.error('Word extraction failed:', error);
      return `[Word document processing failed: ${error.message}]`;
    }
  }

  /**
   * Extract text from plain text files
   */
  static async extractFromTextFile(file: File): Promise<string> {
    try {
      console.log('Reading text file:', file.name);
      
      const text = await file.text();
      
      if (text && text.trim()) {
        console.log(`Text file read successfully: ${text.length} characters`);
        return text.trim();
      } else {
        return `[Text file "${file.name}" appears to be empty]`;
      }
    } catch (error: any) {
      console.error('Text file reading failed:', error);
      const errorMessage = `[Text file processing failed: ${error.message}]`;
      console.error(errorMessage);
      return errorMessage;
    }
  }

  /**
   * Determine if a file type is supported for text extraction
   */
  static isTextExtractable(mimeType: string, fileName: string): boolean {
    const textTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'application/javascript',
      'text/javascript',
      'text/css',
      'text/html'
    ];

    const fileExtension = fileName.toLowerCase().split('.').pop();
    const documentTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword' // .doc (limited support)
    ];

    const supportedExtensions = [
      'txt', 'md', 'csv', 'json', 'xml', 'js', 'ts', 'jsx', 'tsx', 
      'css', 'html', 'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 
      'go', 'rs', 'sql', 'yaml', 'yml', 'toml', 'ini', 'log',
      'vue', 'svelte', 'dart', 'kt', 'swift', 'scala', 'clj', 'hs',
      'elm', 'ex', 'exs', 'erl', 'r', 'R', 'matlab', 'm', 'sh', 'bash',
      'zsh', 'fish', 'ps1', 'psm1', 'bat', 'cmd', 'dockerfile', 'makefile',
      'cmake', 'ninja', 'gradle', 'sbt', 'ant', 'pom', 'config', 'conf',
      'properties', 'env', 'gitignore', 'gitattributes', 'editorconfig',
      'prettierrc', 'eslintrc', 'babelrc', 'webpack', 'vite', 'rollup',
      'tsconfig', 'jsconfig', 'package', 'lock', 'requirements', 'poetry',
      'cargo', 'gemfile', 'podfile', 'mod', 'sum'
    ];

    // Also check for image files (they can be processed but not text extracted)
    const imageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'image/svg+xml', 'image/bmp', 'image/tiff'
    ];

    return (
      textTypes.includes(mimeType) ||
      documentTypes.includes(mimeType) ||
      imageTypes.includes(mimeType) ||
      (fileExtension && supportedExtensions.includes(fileExtension))
    );
  }

  /**
   * Get instructions for manual text extraction when automated processing fails
   */
  static getPDFExtractionInstructions(fileName: string): string {
    return `[Automated PDF processing failed for "${fileName}"]

Alternative options to extract the content:

1. **Convert PDF to Text:**
   - Use online tools like SmallPDF, ILovePDF, or PDF24 to convert to .txt
   - Upload the converted text file instead

2. **Copy-Paste Method:**
   - Open the PDF in a PDF viewer
   - Select all text (Ctrl+A / Cmd+A)
   - Copy and paste the content directly into the chat

3. **Google Docs Conversion:**
   - Upload PDF to Google Drive
   - Open with Google Docs (it will convert to text)
   - Copy the text content

4. **Screenshot to Text:**
   - If the PDF contains images/scanned text, use OCR tools
   - Google Lens or Adobe's built-in OCR can help

Please provide the text content using one of these methods for analysis.`;
  }

  /**
   * Extract text from any supported file type
   */
  static async extractText(file: File): Promise<string> {
    const mimeType = file.type;
    const fileName = file.name;

    if (!this.isTextExtractable(mimeType, fileName)) {
      throw new Error(`File type not supported for text extraction: ${mimeType || 'unknown'}`);
    }

    // Handle images (return metadata, actual analysis happens in AI)
    if (mimeType.startsWith('image/')) {
      return `[Image file: ${fileName} (${mimeType})]`;
    }

    // Handle PDF files with fallback approach
    if (mimeType === 'application/pdf') {
      try {
        return await this.extractFromPDF(file);
      } catch (error) {
        console.warn('Primary PDF extraction failed, trying fallback method:', error);
        return await this.extractFromPDFFallback(file);
      }
    }

    // Handle Word documents
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword' ||
      fileName.toLowerCase().endsWith('.docx') ||
      fileName.toLowerCase().endsWith('.doc')
    ) {
      return await this.extractFromWord(file);
    }

    // Handle plain text files
    return await this.extractFromTextFile(file);
  }

  /**
   * Get a preview of the extracted text (first 500 characters)
   */
  static getTextPreview(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) {
      return text;
    }
    
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Get file type description for UI
   */
  static getFileTypeDescription(file: File): string {
    const mimeType = file.type;
    const fileName = file.name;
    const extension = fileName.toLowerCase().split('.').pop();

    if (mimeType === 'application/pdf') {
      return 'PDF Document';
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === 'docx'
    ) {
      return 'Word Document';
    }

    if (mimeType === 'application/msword' || extension === 'doc') {
      return 'Word Document (Legacy)';
    }

    if (mimeType.startsWith('text/') || ['txt', 'md', 'csv'].includes(extension || '')) {
      return 'Text File';
    }

    if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'php', 'rb', 'go', 'rs', 'vue', 'svelte'].includes(extension || '')) {
      return 'Code File';
    }

    if (mimeType.startsWith('image/')) {
      return 'Image File';
    }

    return 'Document';
  }
}