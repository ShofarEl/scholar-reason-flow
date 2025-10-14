import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WorkerType, WORKER_CONFIGS, ScribeMessage } from '@/types/scribe';
import { useAuth } from '@/hooks/useAuth';
import { useScribeChatSupabase } from '@/hooks/useScribeChatSupabase';
import { ScribeAIService } from '@/services/scribeAIService';
import { HumanizationService } from '@/services/humanizationService';
// Batch mode removed
import { ExportService } from '@/services/exportService';
import { FileAnalysisService } from '@/services/fileAnalysisService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Send, 
  Upload, 
  Download, 
  Sparkles, 
  Bot, 
  User, 
  FileText, 
  Image, 
  Code, 
  X,
  Plus,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  Search,
  Trash2,
  Wand2,
  Copy,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateEnvironment } from '@/lib/appConfig';
import { PaymentService } from '@/services/paymentService';
import { SubscriptionStatus } from '@/components/subscription/SubscriptionStatus';
import { useNavigate } from 'react-router-dom';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

type ScribeAIChatProps = {
  injectedFiles?: File[];
  onFilesConsumed?: () => void;
  selectedWorker?: WorkerType;
  onSelectedWorkerChange?: (worker: WorkerType) => void;
  citationStyle?: 'APA' | 'MLA' | 'Chicago';
  onCitationStyleChange?: (style: 'APA' | 'MLA' | 'Chicago') => void;
  hideWorkerSelectorOnMobile?: boolean;
  // When true, hides the internal mobile header (for embedded mobile shells)
  hideMobileHeader?: boolean;
  // When true, disables the internal sidebar/backdrop (mobile shell will handle chats)
  disableSidebar?: boolean;
  // When true, shows only the sidebar (for desktop chat history view)
  sidebarOnly?: boolean;
};

export const ScribeAIChat: React.FC<ScribeAIChatProps> = ({ 
  injectedFiles = [], 
  onFilesConsumed, 
  selectedWorker: selectedWorkerProp, 
  onSelectedWorkerChange, 
  citationStyle: citationStyleProp, 
  onCitationStyleChange, 
  hideWorkerSelectorOnMobile,
  hideMobileHeader,
  disableSidebar,
  sidebarOnly
}) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const {
    chats,
    currentChatId,
    getCurrentChat,
    createNewChat,
    updateChat,
    addMessageToChat,
    updateMessage,
    deleteChat,
    switchToChat,
    clearAllChats,
    getChatsByWorker,
    getConversationHistory,
    isLoading,
    isMigrating
  } = useScribeChatSupabase();
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [trialUsage, setTrialUsage] = useState<{ remaining: number; limit: number; used: number } | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<WorkerType>(selectedWorkerProp || 'scholarly');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'Chicago'>(citationStyleProp || 'APA');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const lastMessageCountRef = useRef<number>(0);
  
  // Optimized streaming update for better responsiveness and layout stability
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingChatIdRef = useRef<string | null>(null);

  const updateStreamingContent = useCallback((content: string) => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }

    // Use a small debounce to prevent excessive re-renders while maintaining responsiveness
    streamingTimeoutRef.current = setTimeout(() => {
      setStreamingContent(content);

      // Update only the current streaming assistant placeholder message
      const chatId = streamingChatIdRef.current;
      const messageId = streamingMessageIdRef.current;
      if (chatId && messageId) {
        updateMessage(chatId, messageId, { content });
      }

      // Always scroll to bottom during streaming for smooth flow
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 25); // Small delay to batch updates and prevent layout jumping
  }, [updateMessage, isUserAtBottom]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize with a new chat if no current chat exists
  // useEffect(() => {
  //   if (!currentChatId && chats.length === 0) {
  //     createNewChat(selectedWorker);
  //   }
  // }, [currentChatId, chats.length, createNewChat, selectedWorker]);

  // Improved auto-scroll: ensure messages flow downwards like ChatGPT
  useEffect(() => {
    const count = getCurrentChat()?.messages.length || 0;
    if (count > lastMessageCountRef.current) {
      // Always scroll to bottom when new messages arrive
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100); // Small delay to ensure content is rendered
    }
    lastMessageCountRef.current = count;
  }, [getCurrentChat]);
  
  // Sync citation style if controlled
  useEffect(() => {
    if (citationStyleProp && citationStyleProp !== citationStyle) {
      setCitationStyle(citationStyleProp);
    }
  }, [citationStyleProp, citationStyle]);

  // Load trial usage data
  useEffect(() => {
    const loadTrialUsage = async () => {
      try {
        const remaining = await PaymentService.getRemainingTrialTokens();
        const limit = PaymentService.getTrialTokenLimit();
        const used = Math.max(0, limit - remaining);
        setTrialUsage({ remaining, limit, used });
      } catch (error) {
        console.error('Failed to load trial usage:', error);
        // Set default values if loading fails
        const limit = PaymentService.getTrialTokenLimit();
        setTrialUsage({ remaining: limit, limit, used: 0 });
      }
    };

    if (user) {
      loadTrialUsage();
    }
  }, [user]);

  // Track whether the user is at the bottom to prevent jumpy scroll during streaming
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80; // px from bottom counts as "at bottom"
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsUserAtBottom(atBottom);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Keep internal worker in sync if provided as a controlled prop
  useEffect(() => {
    if (selectedWorkerProp && selectedWorkerProp !== selectedWorker) {
      setSelectedWorker(selectedWorkerProp);
    }
  }, [selectedWorkerProp]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
    };
  }, []);

  const handleCreateNewChat = () => {
    createNewChat(selectedWorker);
    setInput('');
    setUploadedFiles([]);
    setSidebarOpen(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.includes('text') || file.type.includes('code')) return <Code className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const sendMessage = async () => {
    // Pre-block if free trial token budget is exhausted
    try {
      const sub = await PaymentService.getCurrentSubscription();
      if ((!sub || sub.status !== 'active') && !(await PaymentService.canUseAI())) {
        setShowUpgradePrompt(true);
        return;
      }
    } catch (error) {
      console.warn('Could not check subscription status:', error);
    }
  
    const allFiles: File[] = [...uploadedFiles, ...(injectedFiles || [])];
    if (!input.trim() && allFiles.length === 0) {
      console.log('⚠️ No input or files to send');
      return;
    }
    
    console.log('🚀 Starting message send process');
    
    // Ensure there is a current chat, create one if needed
    let currentChat = getCurrentChat();
    let chatId: string;
    
    if (!currentChat) {
      console.log('🆕 No current chat, creating new one');
      chatId = await createNewChat(selectedWorker);
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      currentChat = getCurrentChat();
      if (!currentChat) {
        console.error('❌ Failed to create or get current chat');
        return;
      }
    } else {
      chatId = currentChat.id;
    }
  
    console.log(`📝 Using chat ID: ${chatId}`);
  
    // Create and add user message
    const userMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: input,
      timestamp: new Date(),
      worker: selectedWorker
    };
  
    console.log('➕ Adding user message to chat');
    await addMessageToChat(chatId, userMessage);
    
    // Clear input immediately for better UX
    setInput('');
    setUploadedFiles([]);
    setIsGenerating(true);
    setStreamingContent('');
  
    // Create placeholder assistant message for streaming
    const placeholderId = crypto.randomUUID();
    const placeholderMessage: ScribeMessage = {
      id: placeholderId,
      sender: 'assistant',
      content: '',
      worker: selectedWorker,
      timestamp: new Date(),
      isStreaming: true
    };
  
    console.log('➕ Adding placeholder assistant message for streaming');
    console.log('➕ Placeholder message ID:', placeholderId);
    console.log('➕ Placeholder message:', placeholderMessage);
    await addMessageToChat(chatId, placeholderMessage);
    
    // Set streaming references
    streamingChatIdRef.current = chatId;
    streamingMessageIdRef.current = placeholderId;
    console.log('➕ Set streaming refs - Chat ID:', streamingChatIdRef.current, 'Message ID:', streamingMessageIdRef.current);
    
    // Store the placeholder ID for verification
    const originalPlaceholderId = placeholderId;
    console.log('➕ Original placeholder ID stored:', originalPlaceholderId);
  
    try {
      let assistantContent = '';
      
      // Get conversation history AFTER adding the user message and placeholder
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fullConversationHistory = getConversationHistory(chatId)
        .filter(msg => msg.content.trim()); // Remove empty messages
      
      // Remove only the placeholder message (last one), keep the user message for context
      const conversationHistory = fullConversationHistory.slice(0, -1);
      
      console.log(`📚 Using conversation history: ${conversationHistory.length} messages`);
      console.log(`📚 Full history length: ${fullConversationHistory.length} messages`);
      console.log(`📚 Conversation history:`, conversationHistory.map(h => `${h.role}: ${h.content.slice(0, 50)}...`));
  
      if (allFiles.length > 0) {
        console.log(`🔍 Processing ${allFiles.length} uploaded files...`);
        
        // Analyze files
        const fileAnalysisReport = await FileAnalysisService.processMultipleFiles(allFiles);
        console.log(`✅ File analysis completed, report length: ${fileAnalysisReport.length} characters`);
        
        const enhancedPrompt = `**CITATION STYLE:** ${citationStyle}
  
  **FILE CONTENT FOR ANALYSIS**
  
  ${fileAnalysisReport}
  
  **USER REQUEST:** ${input || 'Please analyze the uploaded files and provide insights.'}
  
  **CRITICAL INSTRUCTIONS:**
  1. The above content contains the EXTRACTED TEXT from uploaded files
  2. Analyze the ACTUAL CONTENT shown above, not just file metadata
  3. Provide detailed analysis based on the extracted text content
  4. If you see "EXTRACTED CONTENT:" sections, analyze that content
  5. If you see "EXTRACTED PDF CONTENT:" sections, analyze that content
  6. Answer the user's specific questions about the file content
  7. Use proper markdown formatting with clear headings
  
  **ANALYSIS REQUIREMENTS:**
  - Thoroughly analyze the extracted content
  - Provide specific insights about the actual text/data
  - Answer any questions the user has about the content
  - Use academic formatting with proper structure
  - Focus on the content, not just file information`;
  
        // Send to AI with streaming
        const response = await ScribeAIService.sendMessage(
          enhancedPrompt,
          selectedWorker,
          conversationHistory,
          (chunk) => {
            assistantContent += chunk;
            console.log(`📡 Received chunk, total length: ${assistantContent.length}`);
            updateStreamingContent(assistantContent);
          }
        );
        
        assistantContent = response.content;
      } else {
        // Regular message processing
        const contextPrompt = conversationHistory.length > 0
          ? `CONVERSATION CONTEXT (last ${Math.min(10, conversationHistory.length)} messages):\n` +
            conversationHistory.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') +
            `\n\nCURRENT USER MESSAGE:\n`
          : '';
  
        console.log(`📝 Sending regular message with ${conversationHistory.length} context messages`);
  
        const response = await ScribeAIService.sendMessage(
          `${contextPrompt}CITATION STYLE: ${citationStyle}\n\n${input}`,
          selectedWorker,
          conversationHistory,
          (chunk) => {
            assistantContent += chunk;
            console.log(`📡 Received chunk, total length: ${assistantContent.length}`);
            updateStreamingContent(assistantContent);
          }
        );
        
        assistantContent = response.content;
      }
  
      console.log(`✅ AI response completed, total length: ${assistantContent.length}`);
  
      // Finalize the placeholder with full content
      if (streamingChatIdRef.current && streamingMessageIdRef.current) {
        console.log('📝 Finalizing assistant message with content length:', assistantContent.length);
        console.log('📝 Final content preview:', assistantContent.slice(0, 100) + '...');
        console.log('📝 Streaming refs - Chat ID:', streamingChatIdRef.current, 'Message ID:', streamingMessageIdRef.current);
        
        // Verify we're using the correct message ID
        console.log('📝 About to finalize message with ID:', streamingMessageIdRef.current);
        
        try {
          const updateResult = await updateMessage(streamingChatIdRef.current, streamingMessageIdRef.current, { content: assistantContent, isStreaming: false });
          console.log('📝 Message finalization result:', updateResult);
          if (!updateResult) { console.error('❌ Message finalization failed!'); }
        } catch (error) { console.error('❌ Error during message finalization:', error); }
      } else {
        console.warn('⚠️ Streaming refs not set, adding new assistant message');
        const assistantMessage: ScribeMessage = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: assistantContent,
          worker: selectedWorker,
          timestamp: new Date()
        };
        await addMessageToChat(chatId, assistantMessage);
      }
  
      // Post-success: check trial status and prompt upgrade if needed
      try {
        const sub = await PaymentService.getCurrentSubscription();
        const remaining = await PaymentService.getRemainingAIMessages();
        if ((!sub || sub.status !== 'active') && remaining === 0) {
          setShowUpgradePrompt(true);
        }
        // Update trial usage display
        const trialRemaining = await PaymentService.getRemainingTrialTokens();
        const limit = PaymentService.getTrialTokenLimit();
        const used = Math.max(0, limit - trialRemaining);
        setTrialUsage({ remaining: trialRemaining, limit, used });
      } catch (error) {
        console.warn('Could not update trial usage:', error);
      }
  
      console.log('✅ Message send process completed successfully');
  
    } catch (error) {
      console.error('❌ Error sending message:', error);
      
      const errorText = (error instanceof Error && error.message)
        ? error.message
        : 'Sorry, I encountered an error processing your request. Please try again.';
        
      if (typeof errorText === 'string' && errorText.toLowerCase().includes('free trial')) {
        setShowUpgradePrompt(true);
      }
      
      // Update the placeholder with error message
      if (streamingChatIdRef.current && streamingMessageIdRef.current) {
        console.log('📝 Updating placeholder with error message');
        await updateMessage(streamingChatIdRef.current, streamingMessageIdRef.current, { 
          content: errorText, 
          isStreaming: false 
        });
      } else {
        console.warn('⚠️ Streaming refs not set, adding new error message');
        const errorMessage: ScribeMessage = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: errorText,
          worker: selectedWorker,
          timestamp: new Date()
        };
        await addMessageToChat(chatId, errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
      
      // Clean up streaming state
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      
      // Clear streaming refs
      streamingChatIdRef.current = null;
      streamingMessageIdRef.current = null;
      
      // Clear any injected files from parent once consumed
      if (onFilesConsumed && (injectedFiles?.length || 0) > 0) {
        onFilesConsumed();
      }
      
      console.log('🧹 Cleaned up message send state');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessageContent = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    }
  };

  const exportChat = async (format: 'docx' | 'pdf' | 'txt') => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;
    
    const content = currentChat.messages
      .map(msg => `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    await ExportService.exportContent(content, `${currentChat.title}_chat`, format);
  };

  const deleteSession = (sessionId: string) => {
    deleteChat(sessionId);
  };

  const getConversationSummary = (chat: any) => {
    if (chat.messages.length === 0) return 'New conversation';
    
    const userMessages = chat.messages.filter((msg: any) => msg.sender === 'user');
    if (userMessages.length === 0) return 'No user messages';
    
    const firstMessage = userMessages[0].content;
    if (!firstMessage || !firstMessage.trim()) return 'Empty message';
    
    const messageCount = chat.messages.length;
    
    return `${firstMessage.slice(0, 30)}${firstMessage.length > 30 ? '...' : ''} (${messageCount} messages)`;
  };

  const humanizeLastMessage = async () => {
    const currentChat = getCurrentChat();
    if (!currentChat || currentChat.messages.length === 0) return;
    
    const lastMessage = currentChat.messages[currentChat.messages.length - 1];
    if (lastMessage.sender !== 'assistant') return;
    
    setIsHumanizing(true);
    
    try {
      console.log('🔮 Humanizing last message...');
      
      const humanizationRequest = {
        prompt: lastMessage.content,
        rephrase: true,
        tone: 'College' as const,
        mode: 'Medium' as const,
        business: false
      };
      
      const response = await HumanizationService.humanizeTextFull({ ...humanizationRequest, maxChunkChars: 3500 });
      
      if (response.success) {
        console.log('✅ Message humanized successfully');
        
        // Update the last message with humanized content
        // If output is too short relative to input, append the original for completeness
        const inputWords = lastMessage.content.split(/\s+/).filter(Boolean).length;
        const outputWords = response.result.split(/\s+/).filter(Boolean).length;
        const finalContent = outputWords < Math.max(100, Math.floor(inputWords * 0.6))
          ? `${response.result}\n\n---\nNote: Some content may have been omitted. Original text included for completeness.\n\n${lastMessage.content}`
          : response.result;
        updateMessage(currentChat.id, lastMessage.id, {
          content: finalContent,
          isHumanized: true
        });
        
      } else {
        console.error('❌ Humanization failed:', response.message);
      }
    } catch (error) {
      console.error('❌ Humanization error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('timeout') || errorMessage.includes('Failed to fetch')) {
        console.log('⚠️ Humanization service timeout - this is normal for external API');
      }
    } finally {
      setIsHumanizing(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    (chat.title ? chat.title.toLowerCase() : '').includes(searchQuery.toLowerCase())
  );

  const isMobile = window.innerWidth < 768;
  const currentChat = getCurrentChat();

  // Validate environment on component mount
  useEffect(() => {
    const envIssues = validateEnvironment();
    if (envIssues.length > 0) {
      console.error('🔒 Environment validation failed in ScribeAIChat:', envIssues);
    } else {
      console.log('✅ Environment validation passed in ScribeAIChat');
    }
  }, []);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Trial End Modal */}
      <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Free Trial Ended</DialogTitle>
            <DialogDescription>
              You have reached your free trial limit. To continue using ScribeAI, please choose a plan.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            {trialUsage && (
              <div className="p-3 rounded-md bg-muted/30">
                <div><span className="font-medium">Trial usage:</span> {trialUsage.used.toLocaleString()} / {trialUsage.limit.toLocaleString()} tokens (input + output)</div>
              </div>
            )}
            <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
              <div className="font-medium mb-1">Plans</div>
              <ul className="list-disc list-inside space-y-1">
                <li><span className="font-medium">Basic (₦1,550)</span>: AI chat access; Humanizer not included.</li>
                <li><span className="font-medium">Premium (₦9,300)</span>: AI chat + Humanizer with 10,000-word limit.</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradePrompt(false)}>Maybe later</Button>
            <Button onClick={() => navigate('/subscription')}>View Plans</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {showUpgradePrompt && (
        <div className="absolute top-0 left-0 right-0 z-50 px-4 py-2 text-sm bg-yellow-50 text-yellow-800 border-b border-yellow-200 flex items-center justify-between">
          <div>Your free trial has ended. Subscribe to continue using ScribeAI.</div>
          <Button size="sm" onClick={() => navigate('/subscription')}>Subscribe</Button>
        </div>
      )}
      {showUpgradePrompt && (
        <div className="absolute top-0 left-0 right-0 z-50 px-4 py-2 text-sm bg-yellow-50 text-yellow-800 border-b border-yellow-200 flex items-center justify-between">
          <div>Your free trial has ended. Subscribe to continue using ScribeAI.</div>
          <Button size="sm" onClick={() => navigate('/subscription')}>Subscribe</Button>
        </div>
      )}
      {/* Sidebar - Enhanced for mobile (optional) */}
      {!disableSidebar && (
        <div
          className={cn(
            "flex flex-col bg-card border-r transition-all duration-300 ease-in-out",
            isMobile 
              ? "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm" 
              : sidebarOnly ? "w-80 relative" : "w-80 relative",
            isMobile && !sidebarOpen && "-translate-x-full"
          )}
          style={isMobile ? { 
            paddingTop: 'max(env(safe-area-inset-top), 12px)', 
            paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' 
          } : undefined}
        >
        {/* Sidebar Header - Mobile optimized */}
        <div className="p-4 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <img 
                src="/ChatGPT_Image_Oct_14__2025__11_04_53_AM-removebg-preview.png" 
                alt="ScribeAI" 
                className="w-8 h-8 rounded-lg"
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.currentTarget.style.display = 'none';
                }}
              />
              <div>
                <h2 className="text-lg font-semibold text-foreground">ScribeAI</h2>
                {isMobile && (
                  <p className="text-xs text-muted-foreground">Academic AI Assistant</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className={cn("lg:hidden h-8 w-8 p-0")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleCreateNewChat}
            className="w-full justify-start h-10"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search - Mobile optimized */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg bg-background/50 focus:bg-background transition-colors"
            />
          </div>
        </div>

        {/* Chat History - Mobile optimized */}
        <div className="flex-1 overflow-y-auto">
          {isMigrating && (
            <div className="p-4 border-b bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
              <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Migrating chats to cloud...</span>
              </div>
            </div>
          )}
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                switchToChat(chat.id);
                setSidebarOpen(false);
                setInput('');
                setUploadedFiles([]);
                // Notify parent shells (e.g., ScribeAITabs) to open full chat view
                try { window.dispatchEvent(new CustomEvent('scribeai:open-full-chat')); } catch {}
              }}
              className={cn(
                "p-4 cursor-pointer hover:bg-muted/30 transition-colors border-b group relative",
                currentChatId === chat.id && "bg-muted/50 border-l-4 border-l-primary"
              )}
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {chat.title || `Chat ${chat.id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {getConversationSummary(chat)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(chat.id);
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer - Mobile optimized */}
        <div className="p-4 border-t bg-card/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground">Premium User</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-muted-foreground h-9"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
      )}

      {/* Main Chat Area */}
      {!sidebarOnly && (
        <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header - Fixed and elegant (optional) */}
        {isMobile && !hideMobileHeader && (
          <div
            className="flex items-center justify-between px-4 py-3 border-b bg-card/95 backdrop-blur-sm lg:hidden sticky top-0 z-40"
            style={{ 
              paddingTop: `max(env(safe-area-inset-top), 12px)`,
              minHeight: '60px'
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="h-10 w-10 p-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-2">
              <img 
                src="/ChatGPT_Image_Oct_14__2025__11_04_53_AM-removebg-preview.png" 
                alt="ScribeAI" 
                className="w-7 h-7 rounded-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <h1 className="text-lg font-semibold">ScribeAI</h1>
            </div>
            
            <div className="flex items-center space-x-1">
              {currentChat && currentChat.messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => exportChat('docx')}
                  className="h-10 w-10 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                className="h-10 w-10 p-0"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}

        {/* Messages Area - Optimized scrolling */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" 
          style={{ 
            contain: 'layout style paint', 
            minHeight: 0,
            WebkitOverflowScrolling: 'touch'
          }}
          ref={scrollContainerRef} 
          onScroll={handleScroll}
        >
          {/* Context Indicator */}
          {currentChat && currentChat.messages.length > 2 && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800">
              <div className="flex items-center space-x-2 text-sm text-emerald-700 dark:text-emerald-300">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Context Active</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  {currentChat.messages.length} messages remembered
                </span>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-foreground">Loading your chats...</h2>
                <p className="text-muted-foreground">Please wait while we sync your data</p>
              </div>
            </div>
          ) : isMigrating ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500/20 to-green-500/10 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-foreground">Migrating your chats...</h2>
                <p className="text-muted-foreground">Moving your conversations to the cloud for better sync</p>
              </div>
            </div>
          ) : (!currentChat || currentChat.messages.length === 0) ? (
            <div className="flex items-center justify-center py-4 px-4 min-h-0">
              <div className="mx-auto w-full max-w-4xl text-left">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-foreground text-center">Welcome to ScribeAI</h2>
                <p className="text-muted-foreground mb-3 leading-relaxed text-center text-xs">
                  Your intelligent academic assistant. Choose your AI specialist below.
                </p>
                
                {/* Model Selection Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-left">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">✍️</span>
                      <h3 className="font-semibold text-sm text-foreground">Scholarly Writing Model</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Academic essays, research papers, literature analysis, and scholarly communication with proper citations and formatting.</p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/30 border border-border/20 text-left">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">⚡</span>
                      <h3 className="font-semibold text-sm text-foreground">Technical Writer Model</h3>
                    </div>
                    <p className="text-xs text-muted-foreground">Mathematics, coding, physics, computational analysis, and STEM problem-solving with step-by-step solutions.</p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 p-4 pb-4">
              {currentChat.messages.map((message) => {
                const isStreamingLast = isGenerating && message.id === currentChat.messages[currentChat.messages.length - 1]?.id;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full animate-in fade-in duration-500",
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      'flex items-start space-x-3',
                      message.sender === 'assistant' ? 'w-full' : 'max-w-[90%] sm:max-w-[85%]',
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    )}>
                      {/* Avatar - Enhanced for mobile */}
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden",
                        message.sender === 'user' 
                          ? 'bg-gradient-to-br from-primary to-primary/80' 
                          : 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20'
                      )}>
                        {message.sender === 'user' ? (
                          <User className="h-5 w-5 text-primary-foreground" />
                        ) : (
                          <img
                            src="/ChatGPT_Image_Oct_14__2025__11_04_53_AM-removebg-preview.png"
                            alt="AI"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      
                      {/* Message Content - Mobile optimized */}
                      <div className="flex flex-col space-y-2 min-w-0 flex-1">
                        <div className={cn(
                          'rounded-2xl break-words relative group',
                          message.sender === 'user'
                            ? 'p-4 bg-primary text-primary-foreground rounded-tr-md shadow-sm'
                            : 'p-0 bg-transparent'
                        )}>
                          {message.sender === 'user' ? (
                            <p className="break-words leading-relaxed text-sm sm:text-base">
                              {message.content}
                            </p>
                          ) : (
                            <MarkdownRenderer 
                              content={isStreamingLast ? (streamingContent || message.content) : message.content}
                              className="prose max-w-none leading-relaxed sm:prose md:prose-lg break-words overflow-x-hidden prose-headings:mt-4 prose-headings:mb-2 prose-p:my-3 prose-pre:whitespace-pre-wrap prose-pre:break-words" 
                            />
                          )}
                          
                          {/* Copy Button - Touch optimized */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessageContent(message.content, message.id)}
                            className={cn(
                              "absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity touch:opacity-100",
                              message.sender === 'user' 
                                ? 'text-primary-foreground hover:bg-primary-foreground/20' 
                                : 'text-muted-foreground hover:bg-muted/50'
                            )}
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {/* Message Metadata - Clean and Professional */}
                        {message.sender === 'assistant' && (
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground px-2 justify-start">
                            <span>{message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {currentChat && currentChat.messages.length > 2 && (
                              <span className="text-emerald-600 text-xs">✓ Context</span>
                            )}
                            {message.isHumanized && (
                              <span className="text-purple-600 text-xs">✨ Humanized</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Streaming Indicator - Enhanced */}
              {isGenerating && (
                <div className="flex w-full justify-start animate-in fade-in duration-300">
                  <div className="flex items-start space-x-3 w-full">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                      <img
                        src="/ChatGPT_Image_Oct_14__2025__11_04_53_AM-removebg-preview.png"
                        alt="AI"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-2 min-w-0 flex-1">
                      <div className="rounded-2xl rounded-tl-md p-0 bg-transparent border-0 relative group shadow-none">
                        <div className="flex items-center space-x-3">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                          </div>
                          <span className="text-sm text-muted-foreground">AI is thinking...</span>
                        </div>
                        
                        
                      </div>
                      
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground px-2">
                        <Badge variant="outline" className="text-xs h-5">
                          {WORKER_CONFIGS[selectedWorker]?.icon || '📝'} {WORKER_CONFIGS[selectedWorker]?.name || 'Unknown Worker'}
                        </Badge>
                        <span>Generating...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Mobile optimized */}
        <div
          className="border-t bg-card/95 backdrop-blur-sm p-4 safe-area-bottom"
          style={isMobile ? { 
            paddingBottom: `max(env(safe-area-inset-bottom), 16px)`,
            paddingLeft: `max(env(safe-area-inset-left), 16px)`,
            paddingRight: `max(env(safe-area-inset-right), 16px)`
          } : undefined}
        >
          <div className="max-w-4xl mx-auto space-y-4">
            

            {/* Controls Row - Mobile optimized */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Worker selector - Mobile responsive */}
              {!hideWorkerSelectorOnMobile && (
                <>
                  <div className="hidden sm:block">
                    <Select value={selectedWorker} onValueChange={(value: WorkerType) => {
                      setSelectedWorker(value);
                      onSelectedWorkerChange?.(value);
                    }}>
                      <SelectTrigger className="w-auto min-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(WORKER_CONFIGS).map((config) => (
                          <SelectItem key={config.id} value={config.id}>
                            <div className="flex items-center space-x-2">
                              <span>{config.icon}</span>
                              <span>{config.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:hidden">
                    <ToggleGroup type="single" value={selectedWorker} onValueChange={(val) => {
                      if (!val) return;
                      setSelectedWorker(val as WorkerType);
                      onSelectedWorkerChange?.(val as WorkerType);
                    }}>
                      {Object.values(WORKER_CONFIGS).map((config) => (
                        <ToggleGroupItem 
                          key={config.id} 
                          value={config.id} 
                          aria-label={config.name}
                          className="h-10 w-12 p-0"
                        >
                          <span className="text-lg">{config.icon}</span>
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>
                </>
              )}

              {/* Citation style selector */}
              <Select value={citationStyle} onValueChange={(v) => {
                const next = (v as 'APA' | 'MLA' | 'Chicago');
                setCitationStyle(next);
                onCitationStyleChange?.(next);
              }}>
                <SelectTrigger className="w-[100px] sm:w-[140px]">
                  <SelectValue placeholder="Citation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APA">APA</SelectItem>
                  <SelectItem value="MLA">MLA</SelectItem>
                  <SelectItem value="Chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>

              

              {/* Context indicator - Mobile */}
              {currentChat && currentChat.messages.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="hidden sm:inline">Context: {currentChat.messages.length} msgs</span>
                  <span className="sm:hidden">{currentChat.messages.length}</span>
                </div>
              )}

              {/* Action buttons - Mobile responsive */}
              {currentChat && (
                <div className="flex items-center space-x-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={humanizeLastMessage}
                    disabled={!currentChat.messages.length || isHumanizing}
                    title="Humanize the last AI response"
                    className="h-9 px-3"
                  >
                    <Wand2 className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {isHumanizing ? 'Humanizing...' : 'Humanize'}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportChat('docx')}
                    disabled={!currentChat.messages.length}
                    className="h-9 px-3"
                  >
                    <Download className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              )}
            </div>

            {/* File Upload Areas - Mobile optimized */}
            {(uploadedFiles.length > 0 || (injectedFiles && injectedFiles.length > 0)) && (
              <div className="space-y-3">
                {/* Local uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-xl">
                    <div className="w-full text-xs text-muted-foreground mb-1">Uploaded Files:</div>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center space-x-2 bg-background rounded-lg px-3 py-2 text-sm shadow-sm"
                      >
                        {getFileIcon(file)}
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({formatFileSize(file.size)})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Injected files from parent */}
                {injectedFiles && injectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                    <div className="w-full text-xs text-blue-700 dark:text-blue-300 mb-1">Ready to analyze:</div>
                    {injectedFiles.map((file, index) => (
                      <div
                        key={`inj-${index}`}
                        className="flex items-center space-x-2 bg-background rounded-lg px-3 py-2 text-sm shadow-sm"
                      >
                        {getFileIcon(file)}
                        <span className="truncate max-w-[120px] sm:max-w-[200px]">{file.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({formatFileSize(file.size)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Input and Send - Mobile optimized */}
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    currentChat && currentChat.messages.length > 0
                      ? `Continue the conversation... (${currentChat.messages.length} msgs)`
                      : "Ask ScribeAI anything... (Shift+Enter for new line)"
                  }
                  className="min-h-[48px] max-h-[120px] resize-none pr-12 text-base rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors placeholder:text-muted-foreground"
                  rows={1}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 hover:bg-muted rounded-lg"
                >
                  <Upload className="h-4 w-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={(!input.trim() && uploadedFiles.length === 0) || isGenerating}
                size="lg"
                className="h-12 w-12 p-0 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
            
            {/* Mobile hint text */}
            {isMobile && (
              <div className="text-center text-xs text-muted-foreground">
                Tap and hold to select text • Swipe to navigate
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* Mobile sidebar backdrop */}
      {isMobile && !disableSidebar && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};