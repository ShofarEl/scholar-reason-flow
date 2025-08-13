import { FileTextExtractor } from '@/utils/fileTextExtractor';

export interface FileAnalysisResult {
  success: boolean;
  content: string;
  error?: string;
}

export class FileAnalysisService {
  static async analyzeFile(file: File): Promise<FileAnalysisResult> {
    try {
      const fileType = file.type;
      const fileName = file.name;
      const fileSize = file.size;

      console.log(`🔍 Analyzing file: ${fileName} (${fileType}, ${this.formatFileSize(fileSize)})`);

      // Handle different file types with actual content extraction
      if (fileType.startsWith('image/')) {
        return this.analyzeImage(file);
      } else if (fileType.includes('pdf')) {
        return this.analyzePDF(file);
      } else if (fileType.includes('spreadsheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.csv')) {
        return this.analyzeSpreadsheet(file);
      } else if (fileType.includes('text') || fileType.includes('code') || FileTextExtractor.isTextExtractable(fileType, fileName)) {
        return this.analyzeTextFile(file);
      } else {
        return {
          success: true,
          content: `**File Analysis Report**

**File Details:**
- **Name:** ${fileName}
- **Type:** ${fileType}
- **Size:** ${this.formatFileSize(fileSize)}

**Analysis:** This file type (${fileType}) has been uploaded for analysis. Please provide specific instructions on what aspects of this file you'd like me to analyze or process.

**Note:** For optimal analysis, please describe what you're looking for in this file or what questions you have about its contents.`
        };
      }
    } catch (error) {
      return {
        success: false,
        content: '',
        error: `Failed to analyze file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async analyzeImage(file: File): Promise<FileAnalysisResult> {
    return {
      success: true,
      content: `**Image Analysis Report**

**File Details:**
- **Name:** ${file.name}
- **Type:** ${file.type}
- **Size:** ${this.formatFileSize(file.size)}

**Analysis:** This is an image file that has been uploaded. I can help you analyze:
- Image content and descriptions
- Visual elements and composition
- Text extraction (if any text is visible)
- Color schemes and patterns
- Technical specifications

**Please specify:** What would you like me to analyze about this image? For example:
- Describe what you see in the image
- Extract any text or data
- Analyze the visual composition
- Identify objects or elements
- Provide insights about the image content`
    };
  }

  private static async analyzeTextFile(file: File): Promise<FileAnalysisResult> {
    try {
      console.log(`📄 Extracting text content from: ${file.name}`);
      
      // Use FileTextExtractor for proper text extraction
      const extractedText = await FileTextExtractor.extractText(file);
      
      if (extractedText && extractedText.trim()) {
        console.log(`✅ Successfully extracted ${extractedText.length} characters from ${file.name}`);
        
        return {
          success: true,
          content: `**File Content Analysis**

**File Details:**
- **Name:** ${file.name}
- **Type:** ${file.type}
- **Size:** ${this.formatFileSize(file.size)}
- **Character Count:** ${extractedText.length}
- **Word Count:** ${extractedText.split(/\s+/).filter(word => word.length > 0).length}

**EXTRACTED CONTENT:**
\`\`\`
${extractedText}
\`\`\`

**Analysis Ready:** The complete file content has been extracted and is ready for analysis. Please provide your specific questions or analysis requirements for this content.`
        };
      } else {
        return {
          success: false,
          content: '',
          error: `Failed to extract meaningful content from ${file.name}`
        };
      }
    } catch (error) {
      console.error(`❌ Text file analysis failed for ${file.name}:`, error);
      return {
        success: false,
        content: '',
        error: `Failed to analyze text file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async analyzePDF(file: File): Promise<FileAnalysisResult> {
    try {
      console.log(`📄 Extracting PDF content from: ${file.name}`);
      
      // Use FileTextExtractor for PDF text extraction
      const extractedText = await FileTextExtractor.extractText(file);
      
      if (extractedText && extractedText.trim()) {
        console.log(`✅ Successfully extracted ${extractedText.length} characters from PDF: ${file.name}`);
        
        return {
          success: true,
          content: `**PDF Content Analysis**

**File Details:**
- **Name:** ${file.name}
- **Type:** ${file.type}
- **Size:** ${this.formatFileSize(file.size)}
- **Character Count:** ${extractedText.length}
- **Word Count:** ${extractedText.split(/\s+/).filter(word => word.length > 0).length}

**EXTRACTED PDF CONTENT:**
\`\`\`
${extractedText}
\`\`\`

**Analysis Ready:** The complete PDF content has been extracted and is ready for analysis. Please provide your specific questions or analysis requirements for this document.`
        };
      } else {
        return {
          success: false,
          content: '',
          error: `Failed to extract meaningful content from PDF: ${file.name}`
        };
      }
    } catch (error) {
      console.error(`❌ PDF analysis failed for ${file.name}:`, error);
      return {
        success: false,
        content: '',
        error: `Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private static async analyzeSpreadsheet(file: File): Promise<FileAnalysisResult> {
    return {
      success: true,
      content: `**Spreadsheet Analysis Report**

**File Details:**
- **Name:** ${file.name}
- **Type:** ${file.type}
- **Size:** ${this.formatFileSize(file.size)}

**Analysis:** This is a spreadsheet file that has been uploaded. I can help you analyze:
- Data structure and organization
- Statistical analysis and insights
- Data visualization recommendations
- Pattern identification
- Data quality assessment

**Please specify:** What would you like me to analyze about this spreadsheet? For example:
- Analyze the data structure
- Provide statistical insights
- Identify trends or patterns
- Suggest visualizations
- Assess data quality`
    };
  }

  private static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static async processMultipleFiles(files: File[]): Promise<string> {
    console.log(`📁 Processing ${files.length} files for analysis...`);
    
    const analysisPromises = files.map(file => this.analyzeFile(file));
    const results = await Promise.all(analysisPromises);
    
    const successfulAnalyses = results.filter(result => result.success);
    const failedAnalyses = results.filter(result => !result.success);

    console.log(`✅ Successfully processed ${successfulAnalyses.length}/${files.length} files`);

    let combinedContent = `**Multiple File Analysis Report**

**Files Processed:** ${files.length}
**Successful:** ${successfulAnalyses.length}
**Failed:** ${failedAnalyses.length}

`;

    if (successfulAnalyses.length > 0) {
      combinedContent += `\n## **File Analysis Results**\n\n`;
      successfulAnalyses.forEach((result, index) => {
        combinedContent += `### File ${index + 1}\n${result.content}\n\n`;
      });
    }

    if (failedAnalyses.length > 0) {
      combinedContent += `\n## **Failed Analyses**\n\n`;
      failedAnalyses.forEach((result, index) => {
        combinedContent += `- **Error:** ${result.error}\n`;
      });
    }

    combinedContent += `\n**Next Steps:** Please provide specific instructions on what you'd like me to analyze or process from these files.`;

    return combinedContent;
  }
} 