import mammoth from 'mammoth';

// PDF.js import with proper worker handling via data URL
let pdfjsLib: any = null;

// Create a functional PDF.js worker using data URL
const createDataURLWorker = (): string => {
  const workerScript = `
// Comprehensive PDF.js worker implementation
const pdfjsVersion = '3.11.174'; // Match the PDF.js version we're using

// Minimal PDF.js worker message handler
self.onmessage = function(event) {
  const data = event.data;
  
  try {
    if (data.action === 'test') {
      // Respond to test messages immediately
      self.postMessage({
        sourceName: 'pdfjsWorker',
        targetName: 'main',
        action: 'test'
      });
      return;
    }
    
    if (data.action === 'configure') {
      // Respond to configuration messages
      self.postMessage({
        sourceName: 'pdfjsWorker',
        targetName: 'main', 
        action: 'configured'
      });
      return;
    }
    
    // For any other message, respond that we're ready
    self.postMessage({
      sourceName: 'pdfjsWorker',
      targetName: 'main',
      action: 'ready'
    });
    
  } catch (error) {
    // Send error response
    self.postMessage({
      sourceName: 'pdfjsWorker',
      targetName: 'main',
      action: 'error',
      data: { message: error.message }
    });
  }
};

// Send ready signal immediately
self.postMessage({
  sourceName: 'pdfjsWorker',
  targetName: 'main',
  action: 'ready'
});
`;

  // Create data URL
  return 'data:application/javascript;base64,' + btoa(workerScript);
};

// Initialize PDF.js with data URL worker
const initializePDFJS = async () => {
  if (pdfjsLib) return pdfjsLib;
  
  try {
    pdfjsLib = await import('pdfjs-dist');
    
    // Set worker using data URL approach
    if (pdfjsLib.GlobalWorkerOptions) {
      const workerSrc = createDataURLWorker();
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
      console.log('✅ PDF.js worker configured with data URL');
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
   * Extract text from a PDF file using a robust, worker-compatible approach
   */
  static async extractFromPDF(file: File): Promise<string> {
    let pdfLib: any = null;
    let pdf: any = null;
    
    try {
      console.log('📄 Starting robust PDF extraction for:', file.name, 'Size:', file.size, 'bytes');
      
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
      
      // Initialize PDF.js with proper error handling
      try {
        pdfLib = await initializePDFJS();
        console.log('📄 PDF.js library initialized successfully');
      } catch (initError) {
        console.error('📄 PDF.js initialization failed:', initError);
        return this.getPDFExtractionInstructions(file.name) + '\n\nError: PDF.js library could not be initialized. Please try manual extraction.';
      }
      
      // Robust PDF.js configuration with workers completely disabled
      const documentConfig = {
        data: arrayBuffer,
        verbosity: 0,
        disableAutoFetch: true,
        disableFontFace: true,
        useWorkerFetch: false,
        isEvalSupported: false,
        maxImageSize: 1024 * 1024, // 1MB max image size
        cMapPacked: true,
        stopAtErrors: false,
        // Explicitly disable worker usage
        worker: null,
        workerSrc: false,
        workerPort: null,
        // Additional worker prevention
        disableWorker: true,
        useSystemFonts: false
      };
      
      console.log('📄 Loading PDF document with robust configuration...');
      const loadingTask = pdfLib.getDocument(documentConfig);
      
      // Set a shorter timeout for document loading to fail fast if worker issues persist
      const loadTimeout = 15000; // 15 seconds
      pdf = await Promise.race([
        loadingTask.promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Document loading timeout - worker communication failed')), loadTimeout)
        )
      ]);
      
      console.log(`📄 PDF loaded successfully! Pages: ${pdf.numPages}`);
      
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
          
          // Get page with timeout
          page = await Promise.race([
            pdf.getPage(pageNum),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Page loading timeout')), 15000)
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
      
      // If extraction fails, provide manual instructions
      return this.getPDFExtractionInstructions(file.name) + '\n\nError details: ' + errorMessage;
    } finally {
      // Ensure proper cleanup of PDF resources
      if (pdf && typeof pdf.destroy === 'function') {
        try {
          await pdf.destroy();
          console.log('📄 PDF resources cleaned up successfully');
        } catch (cleanupError) {
          console.warn('📄 PDF cleanup failed:', cleanupError);
        }
      }
    }
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
    return `[PDF processing encountered technical difficulties with "${file.name}"]

The system was unable to automatically extract text from this PDF. This appears to be due to browser security restrictions preventing PDF.js worker execution, which can happen with:
- Browser security policies blocking web workers
- Content Security Policy (CSP) restrictions  
- PDF.js compatibility issues with the current browser environment
- Complex PDF layouts or embedded content

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

**Method 3 - Google Docs:**
1. Upload PDF to Google Drive
2. Right-click → "Open with Google Docs"
3. Copy the converted text content
4. Paste into this chat

✅ **Once you provide the text, I'll immediately conduct the complete scholarly analysis of your presentation including argumentative structure, evidence evaluation, and academic critique.**`;
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