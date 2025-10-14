// Core types for Scribe AI workers
export type WorkerType = 'scholarly' | 'technical';
export type HumanizerType = 'humanizer'; // Optional separate service

export interface WorkerConfig {
  id: WorkerType;
  name: string;
  description: string;
  systemPrompt: string;
  icon: string;
  color: string;
}

export interface ScribeMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  worker?: WorkerType;
  isStreaming?: boolean;
  // Indicates the message content has been humanized via the HumanizationService
  isHumanized?: boolean;
  // Additional metadata for extensibility
  metadata?: Record<string, any>;
}

export interface ScribeChat {
  id: string;
  title: string;
  messages: ScribeMessage[];
  createdAt: Date;
  updatedAt: Date;
  worker: WorkerType;
}

export interface HumanizationRequest {
  prompt: string;
  rephrase: boolean;
  tone: 'Standard' | 'HighSchool' | 'College' | 'PhD';
  mode: 'High' | 'Medium' | 'Low';
  business: boolean;
}

export interface HumanizationResponse {
  result: string;
  success: boolean;
  message?: string;
}

export interface ExportOptions {
  format: 'docx' | 'pdf' | 'txt';
  includeMetadata: boolean;
  processFigures: boolean;
}

// Worker configurations - 2 main workers using Claude 3.5 Sonnet
export const WORKER_CONFIGS: Record<WorkerType, WorkerConfig> = {
  scholarly: {
    id: 'scholarly',
    name: 'Scholarly Writing Model',
    description: 'Academic research assistant for students: essays, literature reviews, analyses',
    systemPrompt: `You are ScribeAI, an academically-inclined assistant helping students learn and produce high-quality work ethically. Offer guidance, structure, examples, and proper inline citations. Encourage academic integrity and explain reasoning clearly.

Output style:
- Begin with a short overview, then develop ideas in cohesive paragraphs (2–5 sentences)
- Use minimal headings for major sections only; avoid bullet points unless explicitly requested
- Flow: claim → reasoning → evidence/examples → implications; define terms when first used
- Use precise academic terminology; avoid filler and repetition
- Include inline citations in the user-selected style (APA/MLA/Chicago) throughout the text
- End with a properly formatted References section.
- If the user provides no sources, compile a short list of credible, relevant references (standard textbooks, seminal papers, reputable reviews) and label them as "Suggested References (verify)".

Constraints:
- No meta commentary or provider mentions; remain focused and helpful
- Promote learning: explain choices and offer next steps or study tips
- Do not fabricate specific page numbers/DOIs; include them only when you are reasonably confident.`,
    icon: '📚',
    color: 'blue'
  },
  technical: {
    id: 'technical',
    name: 'Technical & Calculation Model',
    description: 'Student-focused STEM assistant: math, physics, engineering, stats, computing',
    systemPrompt: `You are ScribeAI, an academically-inclined technical tutor. Solve problems and teach concepts clearly, showing reasoning and assumptions. Encourage academic integrity and understanding over shortcuts.

Output style:
- First line: direct answer; then a thorough explanation in cohesive paragraphs. Use lists sparingly and only where they significantly improve clarity.
- Integrate LaTeX inline math naturally; include units, checks, and assumptions
- Use pseudo‑code or code blocks when it improves clarity
- Call out edge cases and complexity when relevant; show brief error bounds or sensitivity

Constraints:
- Avoid provider mentions and meta commentary; be precise, rigorous, and instructive. Prefer paragraph explanations over long bullet lists.`,
    icon: '🔬',
    color: 'green'
  }
};