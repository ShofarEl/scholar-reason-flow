import { AIModel, QueryType } from '@/types/chat';

// Keywords that suggest complex reasoning tasks
const REASONING_KEYWORDS = [
  'analyze', 'prove', 'logic', 'reasoning', 'theorem', 'philosophy',
  'algorithm', 'architecture', 'design pattern', 'optimization',
  'mathematics', 'calculus', 'algebra', 'statistics', 'research',
  'compare', 'evaluate', 'pros and cons', 'trade-offs', 'strategy'
];

// Keywords that suggest creative or quick tasks
const CREATIVE_KEYWORDS = [
  'create', 'generate', 'write', 'story', 'poem', 'creative',
  'brainstorm', 'idea', 'suggestion', 'quick', 'fast', 'simple',
  'what is', 'how to', 'explain', 'summary', 'translate'
];

// Keywords that suggest document analysis and writing works
const DOCUMENT_ANALYSIS_KEYWORDS = [
  'image', 'picture', 'photo', 'visual', 'diagram', 'chart',
  'document', 'pdf', 'file', 'upload', 'attachment', 'scan',
  'analyze document', 'read document', 'extract text', 'document analysis',
  'writing', 'essay', 'article', 'paper', 'report', 'summary',
  'review', 'edit', 'proofread', 'grammar', 'style', 'content analysis'
];

// Math and code keywords
const MATH_KEYWORDS = [
  'calculate', 'solve', 'equation', 'formula', 'mathematical',
  'derivative', 'integral', 'matrix', 'vector', 'probability',
  'statistics', 'algebra', 'calculus', 'geometry', 'trigonometry'
];

const CODE_KEYWORDS = [
  'code', 'programming', 'function', 'class', 'debug', 'refactor',
  'algorithm', 'data structure', 'api', 'framework', 'library',
  'javascript', 'python', 'java', 'css', 'html', 'sql', 'database'
];

export function detectQueryType(input: string, hasAttachments: boolean = false): QueryType {
  const lowerInput = input.toLowerCase();

  // Always prioritize multimodal if there are attachments or document analysis
  if (hasAttachments || DOCUMENT_ANALYSIS_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
    return 'multimodal';
  }

  // Check for math-specific content
  if (MATH_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
    return 'math';
  }

  // Check for code-specific content
  if (CODE_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
    return 'code';
  }

  // Check for complex reasoning
  if (REASONING_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
    return 'reasoning';
  }

  // Check for creative tasks
  if (CREATIVE_KEYWORDS.some(keyword => lowerInput.includes(keyword))) {
    return 'creative';
  }

  // Check for research-style questions (longer, complex queries)
  if (input.length > 200 || input.split('?').length > 2) {
    return 'research';
  }

  // Simple questions or short queries
  if (input.length < 50 || lowerInput.startsWith('what') || lowerInput.startsWith('how')) {
    return 'quick-qa';
  }

  return 'general';
}

export function routeToOptimalModel(queryType: QueryType, userPreference?: AIModel): AIModel {
  if (userPreference && userPreference !== 'auto') {
    return userPreference;
  }

  switch (queryType) {
    case 'multimodal':
    case 'creative':
    case 'quick-qa':
      return 'scholar-mind'; // Gemini 2.0 Flash

    case 'reasoning':
    case 'math':
    case 'code':
    case 'research':
      return 'reason-core'; // DeepSeek R1

    case 'general':
    default:
      return 'scholar-mind'; // Default to faster model
  }
}

export function getModelDisplayName(model: AIModel): string {
  switch (model) {
    case 'scholar-mind':
      return 'ScribeMaster';
    case 'reason-core':
      return 'Lightning Thinq';
    case 'auto':
      return 'Auto-Select';
    default:
      return 'Unknown Model';
  }
}

export function getModelDescription(model: AIModel): string {
  switch (model) {
    case 'scholar-mind':
      return 'Academic writing specialist for essays, research, literature, and scholarly analysis';
    case 'reason-core':
      return 'STEM expert for mathematics, coding, physics, and computational problems';
    case 'auto':
      return 'Automatically selects the best AI model based on your query';
    default:
      return '';
  }
}

export function getQueryTypeDescription(queryType: QueryType): string {
  switch (queryType) {
    case 'multimodal':
      return 'Document analysis/writing work detected - routing to ScribeMaster';
    case 'creative':
      return 'Academic writing task detected - routing to ScribeMaster';
    case 'quick-qa':
      return 'Question detected - routing to ScribeMaster';
    case 'reasoning':
      return 'Complex reasoning task detected - routing to Lightning Thinq';
    case 'math':
      return 'Mathematical problem detected - routing to Lightning Thinq';
    case 'code':
      return 'Programming task detected - routing to Lightning Thinq';
    case 'research':
      return 'STEM research query detected - routing to Lightning Thinq';
    case 'general':
      return 'General query - routing to ScribeMaster';
    default:
      return 'Processing query...';
  }
}