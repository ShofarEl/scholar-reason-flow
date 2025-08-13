export type AIModel = 'scholar-mind' | 'reason-core' | 'auto';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  aiModel?: AIModel;
  timestamp: Date;
  attachments?: FileAttachment[];
  responseTime?: number;
  tokensUsed?: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  preview?: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiStatus {
  'scholar-mind': 'online' | 'slow' | 'offline';
  'reason-core': 'online' | 'slow' | 'offline';
}

export interface ConversationState {
  messages: Message[];
  currentModel: AIModel;
  isTyping: boolean;
  activeModel?: AIModel;
}

export interface UserPreferences {
  autoRoute: boolean;
  theme: 'light' | 'dark';
  showPerformanceMetrics: boolean;
  preferredModel?: AIModel;
}

export interface PerformanceMetrics {
  averageResponseTime: number;
  totalTokensUsed: number;
  requestCount: number;
  successRate: number;
}

export type QueryType = 
  | 'multimodal'
  | 'creative'
  | 'quick-qa'
  | 'reasoning'
  | 'math'
  | 'code'
  | 'research'
  | 'general';