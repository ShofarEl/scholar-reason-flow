import mammoth from 'mammoth';

// Simple PDF.js import - we'll handle worker configuration properly
let pdfjsLib: any = null;

// Initialize PDF.js with minimal configuration
const initializePDFJS = async () => {
  if (pdfjsLib) return pdfjsLib;
  
  try {
    pdfjsLib = await import('pdfjs-dist');
    
    // Disable workers completely for compatibility
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
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
   * Extract text from a PDF file using a simple, reliable approach
   */
  static async extractFromPDF(file: File): Promise<string> {
    try {
      console.log('📄 Starting PDF extraction for:', file.name, 'Size:', file.size, 'bytes');
      
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
      
      // Initialize PDF.js
      const pdfLib = await initializePDFJS();
      console.log('📄 PDF.js library loaded successfully');
      
      // Simple PDF.js configuration - minimal and reliable
      const loadingTask = pdfLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Minimize logging
        disableAutoFetch: true,
        disableFontFace: true,
        useWorkerFetch: false,
        isEvalSupported: false
      });
      
      console.log('📄 Loading PDF document...');
      const pdf = await loadingTask.promise;
      console.log(`📄 PDF loaded successfully! Pages: ${pdf.numPages}`);
      
      // Check for password protection or corruption
      if (pdf.numPages === 0) {
        await pdf.destroy();
        return `[PDF "${file.name}" appears to be password-protected or corrupted. Please ensure the PDF is not encrypted and try again.]`;
      }
      
      let fullText = '';
      let totalTextItems = 0;
      let successfulPages = 0;
      
      // Extract text from each page (limit to 500 pages for performance)
      const maxPages = Math.min(pdf.numPages, 500);
      
      for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
        try {
          console.log(`📄 Extracting text from page ${pageNum}/${maxPages}`);
          const page = await pdf.getPage(pageNum);
          
          // Extract text content with timeout protection
          const timeoutMs = 10000; // 10 seconds per page
          const textContent = await Promise.race([
            page.getTextContent(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Page extraction timeout')), timeoutMs)
            )
          ]) as any;
          
          console.log(`📄 Page ${pageNum} has ${textContent.items.length} text items`);
          totalTextItems += textContent.items.length;
          
          // Extract and clean up text
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
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
          
          // Clean up page resources
          page.cleanup();
        } catch (pageError: any) {
          console.error(`📄 Error extracting text from page ${pageNum}:`, pageError);
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
}