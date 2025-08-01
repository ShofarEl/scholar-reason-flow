import { FileTextExtractor } from './fileTextExtractor';

/**
 * Test utility for debugging PDF extraction issues
 */
export class PDFTest {
  
  /**
   * Test PDF extraction and log detailed results
   */
  static async testPDFFile(file: File): Promise<void> {
    console.log('🧪 Starting PDF extraction test...');
    console.log('File info:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    try {
      // Test the extraction
      const result = await FileTextExtractor.testPDFExtraction(file);
      
      console.log('🧪 Test Results:', {
        success: result.success,
        method: result.method,
        error: result.error,
        contentLength: result.content.length,
        sampleContent: result.content.substring(0, 200),
        debugInfo: result.debugInfo
      });
      
      if (result.success) {
        console.log('✅ PDF extraction successful!');
        console.log('📄 Sample content:', result.content.substring(0, 500));
      } else {
        console.log('❌ PDF extraction failed:', result.error);
        console.log('🔍 Debug info:', result.debugInfo);
      }
      
    } catch (error) {
      console.error('🧪 Test failed with error:', error);
    }
  }
  
  /**
   * Test regular extraction method
   */
  static async testRegularExtraction(file: File): Promise<void> {
    console.log('🧪 Testing regular extraction method...');
    
    try {
      const content = await FileTextExtractor.extractText(file);
      
      console.log('📄 Extracted content length:', content.length);
      console.log('📄 Sample content:', content.substring(0, 500));
      
      // Check if content is readable
      const isReadable = /[a-zA-Z]{3,}/.test(content);
      console.log('📄 Is readable text:', isReadable);
      
      if (!isReadable) {
        console.log('⚠️  Warning: Content appears to be binary/metadata');
        console.log('📄 Full content preview:', content);
      }
      
    } catch (error) {
      console.error('🧪 Regular extraction failed:', error);
    }
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  (window as any).PDFTest = PDFTest;
}