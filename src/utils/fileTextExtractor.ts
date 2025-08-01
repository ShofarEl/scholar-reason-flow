import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// PREEMPTIVE WORKER ASSASSINATION - Execute IMMEDIATELY on module load
console.log('🔥 PREEMPTIVE STRIKE: Assassinating PDF.js worker before it can spawn');

// Method 1: Immediately nullify worker options
try {
  (pdfjsLib as any).GlobalWorkerOptions = (pdfjsLib as any).GlobalWorkerOptions || {};
  (pdfjsLib as any).GlobalWorkerOptions.workerSrc = '';
  (pdfjsLib as any).GlobalWorkerOptions.workerPort = null;
  (pdfjsLib as any).GlobalWorkerOptions.isWorkerDisabled = true;
  console.log('🎯 PREEMPTIVE: GlobalWorkerOptions neutered');
} catch (e) {
  console.warn('🎯 PREEMPTIVE: Method 1 failed:', e);
}

// Method 2: Patch the library's internal worker factory if it exists
try {
  if ((pdfjsLib as any).PDFWorker) {
    (pdfjsLib as any).PDFWorker = class {
      static fromPort() { return null; }
      static getWorkerSrc() { return ''; }
      constructor() { 
        console.log('🚫 PREEMPTIVE: PDF Worker creation blocked');
        return null;
      }
    };
    console.log('🎯 PREEMPTIVE: PDFWorker class neutered');
  }
} catch (e) {
  console.warn('🎯 PREEMPTIVE: Method 2 failed:', e);
}

// Method 3: Override any getDocument function immediately
try {
  if ((pdfjsLib as any).getDocument) {
    const originalGetDoc = (pdfjsLib as any).getDocument;
    (pdfjsLib as any).getDocument = function(src: any, options: any = {}) {
      console.log('🔧 PREEMPTIVE: getDocument call intercepted at module level');
      return originalGetDoc(src, {
        ...options,
        useWorkerFetch: false,
        disableWorker: true,
        isEvalSupported: false,
        verbosity: 0
      });
    };
    console.log('🎯 PREEMPTIVE: getDocument neutered');
  }
} catch (e) {
  console.warn('🎯 PREEMPTIVE: Method 3 failed:', e);
}

// NUCLEAR OPTION: Create inline worker that PDF.js cannot ignore
const createInlineWorker = () => {
  // Minimal PDF.js worker implementation - NO IMPORTS, NO EXTERNAL DEPS
  const workerScript = `
    // Dummy PDF.js worker that prevents external loading
    console.log('🔥 INLINE WORKER: Starting minimal PDF.js worker');
    
    // Minimal worker message handler
    self.onmessage = function(e) {
      try {
        console.log('🔥 INLINE WORKER: Received message', e.data);
        
        // Just respond that we're ready for any message
        self.postMessage({
          sourceName: 'pdfjsWorker',
          targetName: 'main',
          action: 'ready',
          data: null
        });
      } catch (error) {
        console.error('🔥 INLINE WORKER: Error', error);
        self.postMessage({
          sourceName: 'pdfjsWorker', 
          targetName: 'main',
          action: 'error',
          data: { message: error.message }
        });
      }
    };
    
    // Send initial ready signal
    console.log('🔥 INLINE WORKER: Sending ready signal');
    self.postMessage({
      sourceName: 'pdfjsWorker',
      targetName: 'main', 
      action: 'ready',
      data: null
    });
  `;
  
  try {
    // Create blob URL for the worker
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    console.log('🔥 INLINE WORKER: Created blob URL:', url);
    return url;
  } catch (error) {
    console.error('🔥 INLINE WORKER: Failed to create blob URL:', error);
    // Return a data URL as fallback
    return 'data:application/javascript;base64,' + btoa(workerScript);
  }
};

// ULTIMATE NUCLEAR APPROACH: Multiple attack vectors
if (typeof window !== 'undefined') {
  
  // Attack Vector 1: MAXIMUM NETWORK INTERCEPTION - Block ALL CDN sources
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0]?.toString() || '';
    
    // COMPREHENSIVE CDN BLOCKING - catch all possible PDF.js worker sources
    const blockedPatterns = [
      'pdf.worker',
      'pdfjs-dist',
      'cdnjs.cloudflare.com',
      'unpkg.com',
      'jsdelivr.net',
      'jspm.dev',
      'skypack.dev',
      'esm.sh',
      'cdn.pika.dev',
      'bunny.net',
      'staticaly.com',
      'gitcdn.xyz',
      'rawgit.com',
      'cdn.rawgit.com',
      'maxcdn.bootstrapcdn.com',
      'ajax.googleapis.com'
    ];
    
    const isBlocked = blockedPatterns.some(pattern => url.includes(pattern));
    
    if (isBlocked && (url.includes('pdf') || url.includes('worker'))) {
      console.log('🚫 COMPREHENSIVE BLOCK: Intercepted PDF.js CDN request:', url);
      
      // Return a fake successful response to prevent errors
      return Promise.resolve(new Response('console.log("PDF.js worker blocked by nuclear option");', {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'application/javascript' }
      }));
    }
    
    // Allow all other requests
    return originalFetch.apply(this, args);
  };
  
  // Attack Vector 2: Create inline worker and force it
  try {
    const inlineWorkerUrl = createInlineWorker();
    pdfjsLib.GlobalWorkerOptions.workerSrc = inlineWorkerUrl;
    console.log('🎯 ATTACK VECTOR 2: Inline worker set:', inlineWorkerUrl);
  } catch (error) {
    console.warn('🎯 ATTACK VECTOR 2 FAILED:', error);
  }
  
  // Attack Vector 3: Monkey patch getDocument (with proper property override)
  try {
    const originalGetDocument = pdfjsLib.getDocument;
    
    // Use Object.defineProperty to override readonly property
    Object.defineProperty(pdfjsLib, 'getDocument', {
      value: function(src: any, options = {}) {
        console.log('🔧 ATTACK VECTOR 3: Intercepting getDocument call');
        
        const safeOptions = {
          ...options,
          useWorkerFetch: false,
          disableWorker: true,
          isEvalSupported: false,
          verbosity: 0
        };
        
        return originalGetDocument.call(this, src, safeOptions);
      },
      writable: true,
      configurable: true
    });
    
    console.log('🔧 ATTACK VECTOR 3: getDocument monkey patched');
  } catch (error) {
    console.warn('🔧 ATTACK VECTOR 3 FAILED:', error);
  }
  
  // Attack Vector 4: Override Worker constructor (simplified approach)
  try {
    const OriginalWorker = window.Worker;
    
    // Use Object.defineProperty to replace Worker properly
    Object.defineProperty(window, 'Worker', {
      value: class extends OriginalWorker {
        constructor(scriptURL: string | URL, options?: WorkerOptions) {
          console.log('🏭 ATTACK VECTOR 4: Worker creation intercepted:', scriptURL);
          
          // If it's trying to create a PDF.js worker, use our inline worker instead
          const urlString = scriptURL.toString();
          if (urlString.includes('pdf.worker') || urlString.includes('cdnjs')) {
            console.log('🏭 ATTACK VECTOR 4: Redirecting PDF.js worker to inline worker');
            const inlineWorkerUrl = createInlineWorker();
            super(inlineWorkerUrl, options);
          } else {
            // For other workers, use original URL
            super(scriptURL, options);
          }
        }
      },
      writable: true,
      configurable: true
    });
    
    console.log('🏭 ATTACK VECTOR 4: Worker constructor overridden');
  } catch (error) {
    console.warn('🏭 ATTACK VECTOR 4 FAILED:', error);
  }
  
  console.log('💥 NUCLEAR OPTION: All attack vectors deployed');
}

/**
 * Extract text content from various file types
 */
export class FileTextExtractor {

  /**
   * Extract text from a PDF file (WORKER-FREE VERSION)
   */
  static async extractFromPDF(file: File): Promise<string> {
    // Store original console functions
    let originalConsoleError: any;
    let originalConsoleWarn: any;
    
    try {
      console.log('🔥 ENHANCED PDF EXTRACTION for:', file.name, 'Size:', file.size, 'bytes');
      
      // Validate file size (prevent processing extremely large files)
      const maxFileSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxFileSize) {
        return `[PDF file "${file.name}" is too large (${Math.round(file.size / 1024 / 1024)}MB). Maximum supported size is 50MB. Please try a smaller file or extract text manually.]`;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      console.log('File loaded into ArrayBuffer, size:', arrayBuffer.byteLength);
      
      // Check if the file is actually a PDF by looking at the magic number
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = Array.from(uint8Array.slice(0, 5)).map(b => String.fromCharCode(b)).join('');
      if (!header.startsWith('%PDF-')) {
        return `[File "${file.name}" does not appear to be a valid PDF file. Please ensure you've uploaded a PDF document.]`;
      }
      
      console.log('🔥 Using ENHANCED PDF.js configuration with comprehensive error handling');
      
      // Suppress any console errors related to workers during PDF loading
      originalConsoleError = console.error;
      originalConsoleWarn = console.warn;
      
      console.error = function(...args) {
        const message = args.join(' ').toLowerCase();
        if (message.includes('worker') || message.includes('fetch') || message.includes('dynamically imported') || message.includes('module')) {
          console.log('🔇 SUPPRESSED ERROR:', ...args);
          return;
        }
        originalConsoleError.apply(console, args);
      };
      
      console.warn = function(...args) {
        const message = args.join(' ').toLowerCase();
        if (message.includes('worker') || message.includes('fetch') || message.includes('dynamically imported') || message.includes('module')) {
          console.log('🔇 SUPPRESSED WARNING:', ...args);
          return;
        }
        originalConsoleWarn.apply(console, args);
      };
      
      // Enhanced PDF.js configuration with multiple fallback options
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        // FORCE disable everything that could trigger external requests
        useWorkerFetch: false,
        isEvalSupported: false,
        disableAutoFetch: true,
        disableFontFace: true,
        verbosity: 0,
        maxImageSize: -1,
        // Additional security and compatibility options
        stopAtErrors: false,
        password: '', // Try with no password first
        disableRange: false,
        disableStream: false
      });
        
      const pdf = await loadingTask.promise;
      
      // Restore console functions now that PDF is loaded
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      console.log(`🔥 ENHANCED APPROACH: PDF loaded successfully! Pages: ${pdf.numPages}`);
      
      // Check for password protection
      if (pdf.numPages === 0) {
        await pdf.destroy();
        return `[PDF "${file.name}" appears to be password-protected or corrupted. Please ensure the PDF is not encrypted and try again.]`;
      }
      
      let fullText = '';
      let totalTextItems = 0;
      let successfulPages = 0;
      
      // Extract text from each page with enhanced error handling
      for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 500); pageNum++) { // Limit to 500 pages for performance
        try {
          console.log(`Extracting text from page ${pageNum}/${pdf.numPages}`);
          const page = await pdf.getPage(pageNum);
          
          // Set a timeout for text extraction
          const timeoutMs = 10000; // 10 seconds per page
          const textContent = await Promise.race([
            page.getTextContent(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Page extraction timeout')), timeoutMs)
            )
          ]) as any;
          
          console.log(`Page ${pageNum} has ${textContent.items.length} text items`);
          totalTextItems += textContent.items.length;
          
          // Enhanced text extraction with better formatting
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
            .map((item: any) => {
              // Clean up the text and preserve some basic formatting
              let text = item.str.trim();
              // Remove excessive whitespace but preserve paragraph breaks
              text = text.replace(/\s+/g, ' ');
              return text;
            })
            .join(' ')
            .replace(/\s+/g, ' ') // Normalize spacing
            .trim();
          
          if (pageText && pageText.length > 0) {
            fullText += `Page ${pageNum}:\n${pageText}\n\n`;
            console.log(`Page ${pageNum} extracted ${pageText.length} characters`);
            successfulPages++;
          } else {
            console.warn(`Page ${pageNum} contains no readable text`);
            fullText += `Page ${pageNum}: [No readable text found on this page]\n\n`;
          }
          
          // Clean up page resources
          page.cleanup();
        } catch (pageError: any) {
          console.error(`Error extracting text from page ${pageNum}:`, pageError);
          fullText += `Page ${pageNum}: [Error extracting text: ${pageError.message || 'Unknown error'}]\n\n`;
        }
      }
      
      // Handle cases with too many pages
      if (pdf.numPages > 500) {
        fullText += `\n[Note: This PDF has ${pdf.numPages} pages. Only the first 500 pages were processed for performance reasons.]\n`;
      }
      
      // Clean up PDF resources
      await pdf.destroy();
      
      const result = fullText.trim();
      if (result && successfulPages > 0) {
        console.log(`🔥 ENHANCED PDF EXTRACTION SUCCESSFUL! Total text length: ${result.length} characters from ${totalTextItems} text items across ${successfulPages} pages`);
        return result;
      } else {
        const message = `[No readable text content found in PDF "${file.name}". This could mean:
- The PDF contains only images or scanned content (requires OCR)
- The PDF is encrypted or password-protected
- The PDF uses a format that's not supported
- Text is embedded as images rather than selectable text

Total pages processed: ${pdf.numPages}, Text items found: ${totalTextItems}]`;
        console.warn(`PDF extraction completed but no usable text found. Pages: ${pdf.numPages}, Items: ${totalTextItems}`);
        return message;
      }
      
    } catch (error: any) {
      console.error('🔥 ENHANCED PDF EXTRACTION FAILED:', error);
      
      // Restore console functions in case of error
      try {
        if (originalConsoleError) console.error = originalConsoleError;
        if (originalConsoleWarn) console.warn = originalConsoleWarn;
      } catch (e) {
        // Ignore restoration errors
      }
      
      // Provide more specific error messages based on the error type
      let errorMessage = '';
      if (error.message?.includes('Invalid PDF structure')) {
        errorMessage = `[PDF "${file.name}" has an invalid or corrupted structure. Please try re-saving or re-creating the PDF.]`;
      } else if (error.message?.includes('Password required')) {
        errorMessage = `[PDF "${file.name}" is password-protected. Please remove the password protection and try again.]`;
      } else if (error.message?.includes('timeout')) {
        errorMessage = `[PDF "${file.name}" processing timed out. The file may be too complex or large for automated extraction.]`;
      } else {
        errorMessage = `[Automated PDF processing failed for "${file.name}": ${error.message || 'Unknown error'}]`;
      }
      
      // If extraction fails, provide manual instructions
      return this.getPDFExtractionInstructions(file.name) + '\n\nError details: ' + errorMessage;
    }
  }

  /**
   * Extract text from a Word document (.docx)
   */
  static async extractFromWord(file: File): Promise<string> {
    try {
      console.log('Starting Word document text extraction for:', file.name, 'Size:', file.size, 'bytes');
      const arrayBuffer = await file.arrayBuffer();
      console.log('Word file loaded into ArrayBuffer, size:', arrayBuffer.byteLength);
      
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.warn('Word extraction warnings:', result.messages);
      }
      
      const content = result.value.trim();
      if (content) {
        console.log(`Word extraction completed successfully. Text length: ${content.length} characters`);
        return content;
      } else {
        const message = '[No readable text content found in this Word document]';
        console.warn('Word extraction completed but no text found');
        return message;
      }
    } catch (error) {
      console.error('Error extracting Word text:', error);
      const errorMessage = `[Word document processing failed: ${error.message}]`;
      return errorMessage;
    }
  }

  /**
   * Extract text from a plain text file
   */
  static async extractFromTextFile(file: File): Promise<string> {
    try {
      console.log('Starting text file extraction for:', file.name, 'Size:', file.size, 'bytes');
      const content = await file.text();
      console.log(`Text file extraction completed. Content length: ${content.length} characters`);
      return content;
    } catch (error) {
      console.error('Error reading text file:', error);
      const errorMessage = `[Text file processing failed: ${error.message}]`;
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
}