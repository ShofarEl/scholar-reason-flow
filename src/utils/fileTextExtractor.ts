import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set the worker source for PDF.js - Vite compatible
const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

/**
 * Extract text content from various file types
 */
export class FileTextExtractor {
  /**
   * Extract text from a PDF file
   */
  static async extractFromPDF(file: File): Promise<string> {
    try {
      console.log('Starting PDF text extraction for:', file.name);
      const arrayBuffer = await file.arrayBuffer();
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        verbosity: 0, // Reduce console spam
        disableAutoFetch: false,
        disableFontFace: false,
        useSystemFonts: true,
        standardFontDataUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/standard_fonts/`,
        cMapUrl: `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/cmaps/`,
        cMapPacked: true
      });
      
      const pdf = await loadingTask.promise;
      console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      // Extract text from each page
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          console.log(`Extracting text from page ${pageNum}`);
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .filter((item: any) => item.str && item.str.trim())
            .map((item: any) => item.str)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += `Page ${pageNum}:\n${pageText}\n\n`;
          }
          
          // Clean up page resources
          page.cleanup();
        } catch (pageError) {
          console.warn(`Error extracting text from page ${pageNum}:`, pageError);
          fullText += `Page ${pageNum}: [Could not extract text from this page]\n\n`;
        }
      }
      
      // Clean up PDF resources
      await pdf.destroy();
      
      const result = fullText.trim() || '[No readable text content found in this PDF]';
      console.log(`PDF extraction completed. Text length: ${result.length}`);
      return result;
      
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return `[PDF processing failed: This PDF may be image-based, password-protected, or corrupted. Please try converting it to text format first.]`;
    }
  }

  /**
   * Extract text from a Word document (.docx)
   */
  static async extractFromWord(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      if (result.messages.length > 0) {
        console.warn('Word extraction warnings:', result.messages);
      }
      
      return result.value.trim();
    } catch (error) {
      console.error('Error extracting Word text:', error);
      throw new Error('Failed to extract text from Word document');
    }
  }

  /**
   * Extract text from a plain text file
   */
  static async extractFromTextFile(file: File): Promise<string> {
    try {
      return await file.text();
    } catch (error) {
      console.error('Error reading text file:', error);
      throw new Error('Failed to read text file');
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