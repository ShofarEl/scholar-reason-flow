import mammoth from 'mammoth';

// PDF.js for reliable PDF text extraction
let pdfjsLib: any = null;

const initializePDFJS = async () => {
  if (pdfjsLib) return pdfjsLib;
  
  try {
    // Import PDF.js
    pdfjsLib = await import('pdfjs-dist');
    
    // Configure PDF.js to work in main thread (no workers)
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;
    }
    
    console.log('✅ PDF.js initialized successfully');
    return pdfjsLib;
  } catch (error) {
    console.error('❌ Failed to initialize PDF.js:', error);
    throw new Error('PDF.js initialization failed');
  }
};

/**
 * Simple fallback PDF text extraction for when PDF.js fails
 */
const extractPDFTextFallback = async (arrayBuffer: ArrayBuffer): Promise<string> => {
  console.log('📄 Using fallback PDF text extraction method');
  
  const uint8Array = new Uint8Array(arrayBuffer);
  let text = '';
  
  // Convert binary to string, focusing on printable characters
  for (let i = 0; i < uint8Array.length; i++) {
    const char = uint8Array[i];
    if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
      text += String.fromCharCode(char);
    }
  }
  
  // Look for actual text content patterns in PDF
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
            .replace(/\\'/g, "'");
          if (cleanText.length > 2 && /[a-zA-Z]/.test(cleanText)) {
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
      textParts.forEach(part => {
        const extracted = part.match(/\((.*?)\)/);
        if (extracted && extracted[1]) {
          const cleanText = extracted[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\\/g, '\\')
            .trim();
          if (cleanText.length > 2 && /[a-zA-Z]/.test(cleanText)) {
            contentLines.push(cleanText);
          }
        }
      });
    }
  }
  
  // Method 3: Look for simple text patterns in parentheses (common in PDFs)
  const simpleTextPattern = /\(([^)]{3,})\)/g;
  while ((match = simpleTextPattern.exec(text)) !== null) {
    const extracted = match[1];
    if (extracted && /[a-zA-Z]/.test(extracted) && extracted.length > 2) {
      // Enhanced filtering to exclude metadata and binary data
      const isMetadata = extracted.includes('Adobe') || 
                        extracted.includes('Illustrator') || 
                        extracted.includes('RGB') || 
                        extracted.includes('CMYK') ||
                        extracted.includes('.jpeg') ||
                        extracted.includes('xmp') ||
                        extracted.includes('FlateDecode') ||
                        extracted.includes('Filter') ||
                        extracted.includes('DecodeParms') ||
                        extracted.includes('ColorSpace') ||
                        extracted.includes('Font') ||
                        extracted.includes('ProcSet') ||
                        extracted.includes('MediaBox') ||
                        extracted.includes('Resources') ||
                        extracted.includes('Contents') ||
                        extracted.includes('Type') ||
                        extracted.includes('Subtype') ||
                        extracted.includes('Length') ||
                        extracted.includes('Stream') ||
                        extracted.includes('endstream') ||
                        extracted.includes('endobj') ||
                        extracted.includes('xref') ||
                        extracted.includes('trailer') ||
                        extracted.includes('startxref') ||
                        extracted.match(/^[A-Z0-9_-]+$/) || // All caps/numbers/underscores
                        extracted.match(/^[0-9\s.,-]+$/) || // Just numbers/punctuation
                        extracted.match(/^[0-9]+$/) || // Just numbers
                        extracted.length < 3; // Too short
      
      if (!isMetadata) {
        contentLines.push(extracted.trim());
      }
    }
  }
  
  // Method 4: Look for text in stream content (less common but sometimes works)
  const streamPattern = /stream\s+(.*?)\s+endstream/gs;
  while ((match = streamPattern.exec(text)) !== null) {
    const streamContent = match[1];
    // Look for readable text in streams
    const words = streamContent.match(/[a-zA-Z]{3,}/g);
    if (words && words.length > 0) {
      // Filter out metadata words
      const filteredWords = words.filter(word => 
        !word.includes('Adobe') && 
        !word.includes('Filter') && 
        !word.includes('Decode') &&
        word.length > 2
      );
      if (filteredWords.length > 0) {
        contentLines.push(filteredWords.join(' '));
      }
    }
  }
  
  // Remove duplicates and filter meaningful content
  const uniqueLines = [...new Set(contentLines)]
    .filter(line => {
      return line.length > 2 && 
             /[a-zA-Z]/.test(line) &&
             line.split(' ').length > 0 && // Has actual words
             !line.match(/^[0-9\s.,-]+$/) && // Not just numbers/punctuation
             !line.match(/^[A-Z0-9_-]+$/) && // Not just caps/numbers/underscores
             line.length < 1000; // Not too long (likely binary data)
    });
  
  const result = uniqueLines.join('\n').trim();
  console.log(`📄 Fallback extraction found ${uniqueLines.length} text lines`);
  
  // Additional validation to ensure we have meaningful content
  if (result.length > 0) {
    const wordCount = result.split(/\s+/).length;
    const avgWordLength = result.replace(/[^a-zA-Z]/g, '').length / Math.max(wordCount, 1);
    
    console.log(`📄 Fallback validation: ${wordCount} words, avg length: ${avgWordLength.toFixed(1)}`);
    
    // If average word length is too short or too long, it's likely not real text
    if (avgWordLength < 2 || avgWordLength > 15) {
      console.warn('📄 Warning: Average word length suggests binary/metadata content');
      return '';
    }
  }
  
  return result;
};

/**
 * Extract text content from various file types
 */
export class FileTextExtractor {

  /**
   * Extract text from a PDF file using PDF.js with fallback
   */
  static async extractFromPDF(file: File): Promise<string> {
    try {
      console.log('📄 Starting PDF text extraction for:', file.name, 'Size:', file.size, 'bytes');
      
      // Validate file size
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
      console.log('📄 PDF header check:', header);
      if (!header.startsWith('%PDF-')) {
        return `[File "${file.name}" does not appear to be a valid PDF file. Please ensure you've uploaded a PDF document.]`;
      }
      
      // Try PDF.js first
      try {
        console.log('📄 Attempting PDF.js extraction...');
        const pdfLib = await initializePDFJS();
        
        // Configure PDF loading with minimal settings
        const loadingTask = pdfLib.getDocument({
          data: arrayBuffer,
          verbosity: 0,
          disableAutoFetch: true,
          disableFontFace: true,
          useWorkerFetch: false,
          isEvalSupported: false,
          stopAtErrors: false,
          maxImageSize: -1,
          cMapPacked: false
        });
        
        console.log('📄 Loading PDF document...');
        
        // Load PDF with timeout
        const pdf = await Promise.race([
          loadingTask.promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('PDF loading timeout')), 15000)
          )
        ]);
        
        console.log(`📄 PDF loaded successfully! Pages: ${pdf.numPages}`);
        
        // Check for password protection or corruption
        if (!pdf || pdf.numPages === 0) {
          if (pdf) await pdf.destroy();
          throw new Error('PDF appears to be password-protected or corrupted');
        }
        
        let fullText = '';
        let successfulPages = 0;
        let totalTextItems = 0;
        const maxPages = Math.min(pdf.numPages, 500); // Limit for performance
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
          let page: any = null;
          
          try {
            console.log(`📄 Extracting text from page ${pageNum}/${maxPages}`);
            
            // Get page with timeout
            page = await Promise.race([
              pdf.getPage(pageNum),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Page loading timeout')), 10000)
              )
            ]);
            
            // Extract text content with timeout protection
            const textContent = await Promise.race([
              page.getTextContent({
                normalizeWhitespace: true,
                disableCombineTextItems: false
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Text extraction timeout')), 10000)
              )
            ]) as any;
            
            console.log(`📄 Page ${pageNum} has ${textContent.items.length} text items`);
            totalTextItems += textContent.items.length;
            
            // Extract and clean up text
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
              
              // Log a sample of the extracted text for debugging
              if (pageNum === 1) {
                const sample = pageText.substring(0, 200);
                console.log(`📄 Sample text from page ${pageNum}:`, sample);
              }
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
          console.log(`📄 PDF.js extraction successful! Total text length: ${result.length} characters from ${successfulPages} pages, ${totalTextItems} text items`);
          
          // Additional validation to ensure we're not getting binary/metadata
          const hasReadableText = /[a-zA-Z]{3,}/.test(result);
          if (!hasReadableText) {
            console.warn('📄 Warning: Extracted content appears to be binary/metadata, not readable text');
            throw new Error('Extracted content appears to be binary/metadata, not readable text');
          }
          
          return result;
        } else {
          throw new Error('PDF.js extraction completed but no usable text found');
        }
        
      } catch (pdfjsError: any) {
        console.warn('📄 PDF.js extraction failed, trying fallback method:', pdfjsError);
        
        // Try fallback method
        try {
          const fallbackText = await extractPDFTextFallback(arrayBuffer);
          if (fallbackText && fallbackText.length > 50) {
            console.log(`📄 Fallback extraction successful! Extracted ${fallbackText.length} characters`);
            
            // Additional validation for fallback method
            const hasReadableText = /[a-zA-Z]{3,}/.test(fallbackText);
            if (!hasReadableText) {
              console.warn('📄 Warning: Fallback extracted content appears to be binary/metadata');
              throw new Error('Fallback extracted content appears to be binary/metadata');
            }
            
            return fallbackText;
          } else {
            throw new Error('Fallback extraction yielded insufficient content');
          }
        } catch (fallbackError) {
          console.error('📄 Fallback extraction also failed:', fallbackError);
          throw pdfjsError; // Throw the original error for better error handling
        }
      }
      
    } catch (error: any) {
      console.error('📄 All PDF extraction methods failed:', error);
      
      // Provide specific error messages based on the error type
      let errorMessage = '';
      const errorMsg = error.message || '';
      
      if (errorMsg.includes('Invalid PDF structure') || errorMsg.includes('PDF header')) {
        errorMessage = `[PDF "${file.name}" has an invalid or corrupted structure. Please try re-saving or re-creating the PDF.]`;
      } else if (errorMsg.includes('Password required') || errorMsg.includes('password')) {
        errorMessage = `[PDF "${file.name}" is password-protected. Please remove the password protection and try again.]`;
      } else if (errorMsg.includes('timeout')) {
        errorMessage = `[PDF "${file.name}" processing timed out. The file may be too complex or corrupted.]`;
      } else if (errorMsg.includes('No readable text content found') || errorMsg.includes('no usable text found')) {
        errorMessage = `[PDF "${file.name}" contains no extractable text content. This could be:
- A scanned document (requires OCR)
- A visual presentation with text embedded as images
- A corrupted or unsupported PDF format

Please try copying the text manually or converting the PDF to text format.]`;
      } else if (errorMsg.includes('binary/metadata')) {
        errorMessage = `[PDF "${file.name}" appears to contain binary data or metadata instead of readable text. This often happens with:
- Visual presentations created in design software
- PDFs with text embedded as images
- Corrupted or improperly formatted PDFs

Please try:
1. Opening the PDF in a PDF viewer and copying the text manually
2. Converting the PDF to text format using online tools
3. Describing the content if it's a visual presentation]`;
      } else {
        errorMessage = `[PDF processing failed for "${file.name}": ${errorMsg}]`;
      }
      
      return errorMessage + '\n\n' + this.getPDFExtractionInstructions(file.name);
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

    // Handle PDF files
    if (mimeType === 'application/pdf') {
      return await this.extractFromPDF(file);
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

  /**
   * Test method to debug PDF extraction issues
   */
  static async testPDFExtraction(file: File): Promise<{
    success: boolean;
    method: string;
    content: string;
    error?: string;
    debugInfo: any;
  }> {
    const debugInfo = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      timestamp: new Date().toISOString()
    };

    try {
      console.log('🧪 Testing PDF extraction for:', file.name);
      
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8Array.slice(0, 5)).map(b => String.fromCharCode(b)).join('');
      
      debugInfo.pdfHeader = header;
      debugInfo.isValidPDF = header.startsWith('%PDF-');
      
      if (!header.startsWith('%PDF-')) {
        return {
          success: false,
          method: 'validation',
          content: '',
          error: 'Not a valid PDF file',
          debugInfo
        };
      }

      // Try PDF.js first
      try {
        console.log('🧪 Testing PDF.js extraction...');
        const pdfLib = await initializePDFJS();
        
        const loadingTask = pdfLib.getDocument({
          data: arrayBuffer,
          verbosity: 0,
          disableAutoFetch: true,
          disableFontFace: true,
          useWorkerFetch: false,
          isEvalSupported: false,
          stopAtErrors: false,
          maxImageSize: -1,
          cMapPacked: false
        });
        
        const pdf = await loadingTask.promise;
        debugInfo.pdfPages = pdf.numPages;
        
        if (pdf.numPages === 0) {
          await pdf.destroy();
          return {
            success: false,
            method: 'pdfjs',
            content: '',
            error: 'PDF has no pages',
            debugInfo
          };
        }
        
        // Try to extract text from first page only for testing
        const page = await pdf.getPage(1);
        const textContent = await page.getTextContent({
          normalizeWhitespace: true,
          disableCombineTextItems: false
        });
        
        const textItems = textContent.items || [];
        const pageText = textItems
          .filter((item: any) => item && item.str && typeof item.str === 'string' && item.str.trim())
          .map((item: any) => item.str.trim())
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        debugInfo.textItemsCount = textItems.length;
        debugInfo.extractedTextLength = pageText.length;
        debugInfo.sampleText = pageText.substring(0, 100);
        
        await pdf.destroy();
        
        if (pageText && pageText.length > 0) {
          const hasReadableText = /[a-zA-Z]{3,}/.test(pageText);
          if (hasReadableText) {
            return {
              success: true,
              method: 'pdfjs',
              content: pageText,
              debugInfo
            };
          } else {
            return {
              success: false,
              method: 'pdfjs',
              content: pageText,
              error: 'Extracted content appears to be binary/metadata',
              debugInfo
            };
          }
        } else {
          return {
            success: false,
            method: 'pdfjs',
            content: '',
            error: 'No text content found',
            debugInfo
          };
        }
        
      } catch (pdfjsError: any) {
        debugInfo.pdfjsError = pdfjsError.message;
        console.log('🧪 PDF.js failed, trying fallback...');
        
        // Try fallback method
        try {
          const fallbackText = await extractPDFTextFallback(arrayBuffer);
          debugInfo.fallbackTextLength = fallbackText.length;
          debugInfo.fallbackSampleText = fallbackText.substring(0, 100);
          
          if (fallbackText && fallbackText.length > 50) {
            const hasReadableText = /[a-zA-Z]{3,}/.test(fallbackText);
            if (hasReadableText) {
              return {
                success: true,
                method: 'fallback',
                content: fallbackText,
                debugInfo
              };
            } else {
              return {
                success: false,
                method: 'fallback',
                content: fallbackText,
                error: 'Fallback extracted content appears to be binary/metadata',
                debugInfo
              };
            }
          } else {
            return {
              success: false,
              method: 'fallback',
              content: fallbackText,
              error: 'Fallback extraction yielded insufficient content',
              debugInfo
            };
          }
        } catch (fallbackError: any) {
          debugInfo.fallbackError = fallbackError.message;
          return {
            success: false,
            method: 'fallback',
            content: '',
            error: `Fallback extraction failed: ${fallbackError.message}`,
            debugInfo
          };
        }
      }
      
    } catch (error: any) {
      debugInfo.generalError = error.message;
      return {
        success: false,
        method: 'general',
        content: '',
        error: error.message,
        debugInfo
      };
    }
  }
}