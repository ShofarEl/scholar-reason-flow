import React, { useState, useRef, useEffect } from 'react';
import { WorkerType, WORKER_CONFIGS, ScribeMessage } from '@/types/scribe';
import { useAuth } from '@/hooks/useAuth';
import { useScribeChat } from '@/hooks/useScribeChat';
import { ScribeAIService } from '@/services/scribeAIService';
import { HumanizationService } from '@/services/humanizationService';
import { BatchAPIService } from '@/services/batchAPIService';
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
import { useCallback } from 'react';

type ScribeAIChatProps = {
  injectedFiles?: File[];
  onFilesConsumed?: () => void;
  selectedWorker?: WorkerType;
  onSelectedWorkerChange?: (worker: WorkerType) => void;
  citationStyle?: 'APA' | 'MLA' | 'Chicago';
  onCitationStyleChange?: (style: 'APA' | 'MLA' | 'Chicago') => void;
  hideWorkerSelectorOnMobile?: boolean;
};

export const ScribeAIChat: React.FC<ScribeAIChatProps> = ({ injectedFiles = [], onFilesConsumed, selectedWorker: selectedWorkerProp, onSelectedWorkerChange, citationStyle: citationStyleProp, onCitationStyleChange, hideWorkerSelectorOnMobile }) => {
  const { user, signOut } = useAuth();
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
    getConversationHistory
  } = useScribeChat();
  
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerType>(selectedWorkerProp || 'scholarly');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'Chicago'>(citationStyleProp || 'APA');
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
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
  useEffect(() => {
    if (!currentChatId && chats.length === 0) {
      createNewChat(selectedWorker);
    }
  }, [currentChatId, chats.length, createNewChat, selectedWorker]);

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
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  // Keep internal worker in sync if provided as a controlled prop
  useEffect(() => {
    if (selectedWorkerProp && selectedWorkerProp !== selectedWorker) {
      setSelectedWorker(selectedWorkerProp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    const allFiles: File[] = [...uploadedFiles, ...(injectedFiles || [])];
    if (!input.trim() && allFiles.length === 0) return;
    const currentChat = getCurrentChat();
    if (!currentChat) return;

    const userMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: input,
      timestamp: new Date(),
      worker: selectedWorker
    };

    // Add user message to chat
    addMessageToChat(currentChat.id, userMessage);
    
    setInput('');
    setUploadedFiles([]);
    setIsGenerating(true);
    setStreamingContent('');

    try {
        let assistantContent = '';
        // Capture conversation history BEFORE creating a streaming placeholder
        const baseConversationHistory = getConversationHistory(currentChat.id) as Array<{ role: 'user' | 'assistant'; content: string }>;

        // Create a placeholder assistant message to stream into without overwriting previous replies
        const placeholderId = crypto.randomUUID();
        const placeholderMessage: ScribeMessage = {
          id: placeholderId,
          sender: 'assistant',
          content: '',
          worker: selectedWorker,
          timestamp: new Date(),
          isStreaming: true
        };
        addMessageToChat(currentChat.id, placeholderMessage);
        streamingChatIdRef.current = currentChat.id;
        streamingMessageIdRef.current = placeholderId;

        // If the Batch worker is selected, use the real batch service (async long-form)
        if (selectedWorker === 'batch') {
          // Derive section titles from the user's input (split by newlines), fallback to single section
          const raw = (input || '').trim();
          const sectionTitles = raw
            ? raw.split('\n').map(s => s.trim()).filter(Boolean)
            : ['Comprehensive Section'];

          const projectTitle = currentChat.title || 'Batch Project';

          // Show initial status in the chat area
          updateStreamingContent('Submitting batch job...');

          const sections = await BatchAPIService.processBatchProject(
            sectionTitles,
            projectTitle,
            citationStyle,
            (batchId) => {
              updateStreamingContent(`Batch submitted: ${batchId}`);
            },
            (status) => {
              const pct = status.requestCount > 0
                ? Math.floor((status.completedCount / status.requestCount) * 100)
                : 0;
              const progressLine = `Batch ID: ${status.id} | Progress: ${status.completedCount}/${status.requestCount} (${pct}%)`;
              updateStreamingContent(progressLine);
            },
            (sectionIndex, content) => {
              // Optionally stream partial completions into the chat
              const header = `\n\n${'='.repeat(40)}\nSection ${sectionIndex + 1} completed\n${'='.repeat(40)}\n`;
              updateStreamingContent(header + (content.slice(0, 800) + '...'));
            }
          );

          // Combine final content
          assistantContent = sections.join('\n\n' + '='.repeat(80) + '\n\n');

        } else if (allFiles.length > 0) {
          console.log(`📁 Processing ${allFiles.length} uploaded files...`);
          
          // First, analyze the files to extract content
          const fileAnalysisReport = await FileAnalysisService.processMultipleFiles(allFiles);
          
          console.log(`✅ File analysis completed, sending to AI with content`);
          
          console.log(`📄 File analysis report length: ${fileAnalysisReport.length} characters`);
          console.log(`📄 File analysis report preview: ${fileAnalysisReport.substring(0, 500)}...`);
          
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
          
          // Build conversation history for context (excluding the current user message)
          const conversationHistory = baseConversationHistory;

          // Inline context block to guarantee model receives context even if backend ignores conversationHistory
          const inlineContext = conversationHistory.length > 0
            ? `\n\n---\nCONVERSATION CONTEXT (last ${Math.min(10, conversationHistory.length)} messages):\n` +
              conversationHistory.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') +
              `\n---\n`
            : '';

          console.log(`📝 Sending message with ${conversationHistory.length} previous messages for context`);

          const response = await ScribeAIService.sendMessage(
            `${inlineContext}${enhancedPrompt}`,
            selectedWorker,
            conversationHistory,
            (chunk) => {
              assistantContent += chunk;
              updateStreamingContent(assistantContent);
            }
          );
          assistantContent = response.content;
        } else {
          // Regular message processing
          // Build conversation history for context (excluding the current user message)
          const conversationHistory = baseConversationHistory;

          // Inline context block to guarantee model receives context even if backend ignores conversationHistory
          const inlineContext = conversationHistory.length > 0
            ? `CONVERSATION CONTEXT (last ${Math.min(10, conversationHistory.length)} messages):\n` +
              conversationHistory.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') +
              `\n\nCURRENT USER MESSAGE:\n`
            : '';

          console.log(`📝 Sending message with ${conversationHistory.length} previous messages for context`);

          const response = await ScribeAIService.sendMessage(
            `${inlineContext}CITATION STYLE: ${citationStyle}\n\n${input}`,
            selectedWorker,
            conversationHistory,
            (chunk) => {
              assistantContent += chunk;
              updateStreamingContent(assistantContent);
            }
          );
          assistantContent = response.content;
        }

      // Finalize the placeholder with full content
      const finalizeChatId = streamingChatIdRef.current;
      const finalizeMessageId = streamingMessageIdRef.current;
      if (finalizeChatId && finalizeMessageId) {
        updateMessage(finalizeChatId, finalizeMessageId, { content: assistantContent, isStreaming: false });
      } else {
        // Fallback in case placeholder was not created
        const assistantMessage: ScribeMessage = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: assistantContent,
          worker: selectedWorker,
          timestamp: new Date()
        };
        addMessageToChat(currentChat.id, assistantMessage);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorText = 'Sorry, I encountered an error processing your request. Please try again.';
      const errChatId = streamingChatIdRef.current;
      const errMsgId = streamingMessageIdRef.current;
      if (errChatId && errMsgId) {
        updateMessage(errChatId, errMsgId, { content: errorText, isStreaming: false });
      } else {
        const errorMessage: ScribeMessage = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: errorText,
          worker: selectedWorker,
          timestamp: new Date()
        };
        // Add error message to chat
        addMessageToChat(currentChat.id, errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
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
    }
  };

  const updateAssistantMessage = (content: string) => {
    const currentChat = getCurrentChat();
    if (!currentChat) return;
    
    const lastMessage = currentChat.messages[currentChat.messages.length - 1];
    if (lastMessage && lastMessage.sender === 'assistant') {
      updateMessage(currentChat.id, lastMessage.id, { content });
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
      setTimeout(() => setCopiedMessageId(null), 2000); // Reset after 2 seconds
    } catch (error) {
      console.error('Failed to copy message:', error);
      // Fallback for older browsers
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
      
      const response = await HumanizationService.humanizeText(humanizationRequest);
      
      if (response.success) {
        console.log('✅ Message humanized successfully');
        
        // Update the last message with humanized content
        updateMessage(currentChat.id, lastMessage.id, {
          content: response.result,
          isHumanized: true
        });
        
      } else {
        console.error('❌ Humanization failed:', response.message);
        // You could show a toast notification here
      }
    } catch (error) {
      console.error('❌ Humanization error:', error);
      
      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (errorMessage.includes('timeout') || errorMessage.includes('Failed to fetch')) {
        console.log('⚠️ Humanization service timeout - this is normal for external API');
      }
    } finally {
      setIsHumanizing(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isMobile = window.innerWidth < 750;
  const currentChat = getCurrentChat();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={cn(
        "flex flex-col w-80 bg-card border-r transition-transform duration-300 ease-in-out",
        isMobile && "absolute inset-y-0 left-0 z-50",
        isMobile && !sidebarOpen && "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Scribe AI</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className={cn("lg:hidden")}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <Button 
            onClick={handleCreateNewChat}
            className="w-full justify-start"
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border rounded-md bg-background"
            />
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => {
                switchToChat(chat.id);
                setSidebarOpen(false);
                setInput('');
                setUploadedFiles([]);
              }}
              className={cn(
                "p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b group",
                currentChatId === chat.id && "bg-muted"
              )}
            >
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{chat.title}</p>
                  <p className="text-xs text-muted-foreground">
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
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
              <span className="text-sm font-medium text-primary-foreground">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        {isMobile && (
          <div className="flex items-center justify-between p-4 border-b bg-card lg:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">Scribe AI</h1>
            <Button variant="ghost" size="sm">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto flex flex-col" 
          style={{ contain: 'layout style paint', minHeight: 0 }}
          ref={scrollContainerRef} 
          onScroll={handleScroll}
        >
          {/* Context Indicator */}
          {currentChat && currentChat.messages.length > 2 && (
            <div className="p-3 bg-green-50 border-b border-green-200 dark:bg-green-950 dark:border-green-800">
              <div className="flex items-center space-x-2 text-sm text-green-700 dark:text-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>AI remembers {currentChat.messages.length} previous messages</span>
              </div>
            </div>
          )}
          
          {(!currentChat || currentChat.messages.length === 0) ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-md mx-auto p-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Welcome to Scribe AI</h2>
                <p className="text-muted-foreground mb-6">
                  Your advanced academic AI assistant. Start a conversation to begin creating world-class content.
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {Object.values(WORKER_CONFIGS).map((config) => (
                    <Button
                      key={config.id}
                      variant="outline"
                      onClick={() => setSelectedWorker(config.id)}
                      className="justify-start"
                    >
                      <span className="mr-2">{config.icon}</span>
                      {config.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-4 p-4">
              {currentChat.messages.map((message) => {
                const isStreamingLast = isGenerating && message.id === currentChat.messages[currentChat.messages.length - 1]?.id;
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex w-full",
                      message.sender === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div className={cn(
                      "flex items-start space-x-3 max-w-[85%]",
                      message.sender === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'
                    )}>
                      {/* Avatar */}
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                        message.sender === 'user' 
                          ? 'bg-muted' 
                          : 'bg-primary'
                      )}>
                        {message.sender === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4 text-primary-foreground" />
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className="flex flex-col space-y-2 min-w-0 flex-1">
                        <div className={cn(
                          "rounded-lg p-4 break-words relative group",
                          message.sender === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : ''
                        )}>
                          {message.sender === 'user' ? (
                            <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                          ) : (
                            <MarkdownRenderer 
                              content={isStreamingLast ? (streamingContent || message.content) : message.content}
                              className="max-w-none leading-relaxed" 
                            />
                          )}
                          
                          {/* Copy Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessageContent(message.content, message.id)}
                            className={cn(
                              "absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
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
                        
                        {/* Message Metadata */}
                        {message.worker && (
                          <div className={cn(
                            "flex items-center space-x-2 text-xs text-muted-foreground",
                            message.sender === 'user' ? 'justify-end' : 'justify-start'
                          )}>
                            <Badge variant="outline" className="text-xs">
                              {WORKER_CONFIGS[message.worker].icon} {WORKER_CONFIGS[message.worker].name}
                            </Badge>
                            <span>{message.timestamp.toLocaleTimeString()}</span>
                            {currentChat && currentChat.messages.length > 2 && message.sender === 'assistant' && (
                              <span className="text-green-600">✓ Context aware</span>
                            )}
                            {message.sender === 'assistant' && message.isHumanized && (
                              <span className="text-purple-600">✨ Humanized</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {isGenerating && (
                <div className="flex w-full justify-start">
                  <div className="flex items-start space-x-3 max-w-[85%]">
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex flex-col space-y-2 min-w-0 flex-1">
                      <div className="rounded-lg p-4 relative group">
                        <div className="flex items-center space-x-2">
                          <Sparkles className="h-4 w-4 animate-spin" />
                          <span>Generating response...</span>
                        </div>
                        
                        {/* Copy Button for streaming content */}
                        {streamingContent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessageContent(streamingContent, 'streaming')}
                            className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-muted/50"
                          >
                            {copiedMessageId === 'streaming' ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                      
                      {/* Message Metadata */}
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {WORKER_CONFIGS[selectedWorker].icon} {WORKER_CONFIGS[selectedWorker].name}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-card p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Worker/Citation Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* On desktop, keep the Select; on mobile, show a ToggleGroup */}
              <div className="hidden sm:block">
                <Select value={selectedWorker} onValueChange={(value: WorkerType) => {
                  setSelectedWorker(value);
                  onSelectedWorkerChange?.(value);
                }}>
                  <SelectTrigger className="w-auto">
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
                    <ToggleGroupItem key={config.id} value={config.id} aria-label={config.name}>
                      {config.icon}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Citation style selector */}
              <Select value={citationStyle} onValueChange={(v) => {
                // v is string; narrow to allowed values
                const next = (v as 'APA' | 'MLA' | 'Chicago');
                setCitationStyle(next);
                onCitationStyleChange?.(next);
              }}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Citation" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APA">APA</SelectItem>
                  <SelectItem value="MLA">MLA</SelectItem>
                  <SelectItem value="Chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>

              {currentChat && currentChat.messages.length > 0 && (
                <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Context: {currentChat.messages.length} messages</span>
                </div>
              )}

              {currentChat && (
                <div className="flex items-center space-x-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={humanizeLastMessage}
                    disabled={!currentChat.messages.length || isHumanizing}
                    title="Humanize the last AI response using StealthGPT to make it more natural and less detectable as AI-generated"
                  >
                    <Wand2 className="h-4 w-4 mr-1" />
                    {isHumanizing ? 'Humanizing...' : 'Humanize'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportChat('docx')}
                    disabled={!currentChat.messages.length}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Export
                  </Button>
                </div>
              )}
            </div>

            {/* File Upload Area - Local */}
            {uploadedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-2 bg-background rounded-md px-3 py-2 text-sm"
                  >
                    {getFileIcon(file)}
                    <span className="truncate max-w-32">{file.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({formatFileSize(file.size)})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-4 w-4 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* File Upload Area - Injected from parent (read-only preview) */}
            {injectedFiles && injectedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
                {injectedFiles.map((file, index) => (
                  <div
                    key={`inj-${index}`}
                    className="flex items-center space-x-2 bg-background rounded-md px-3 py-2 text-sm"
                  >
                    {getFileIcon(file)}
                    <span className="truncate max-w-32">{file.name}</span>
                    <span className="text-muted-foreground text-xs">
                      ({formatFileSize(file.size)})
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Input and Send */}
            <div className="flex items-end space-x-2">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    currentChat && currentChat.messages.length > 0
                      ? `Continue conversation... (${currentChat.messages.length} messages)`
                      : "Message Scribe AI... (Shift+Enter for new line)"
                  }
                  className="min-h-[44px] max-h-[200px] resize-none pr-12"
                  rows={1}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute right-2 bottom-2 h-8 w-8 p-0"
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
                size="sm"
                className="h-10 w-10 p-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};