import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WorkerType, WORKER_CONFIGS, ScribeMessage } from '@/types/scribe';
import { useAuth } from '@/hooks/useAuth';
import { useScribeChatSupabase } from '@/hooks/useScribeChatSupabase';
import { ScribeAIService } from '@/services/scribeAIService';
import { HumanizationService } from '@/services/humanizationService';
import { ExportService } from '@/services/exportService';
import { FileAnalysisService } from '@/services/fileAnalysisService';
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Upload, 
  Download, 
  Plus,
  Menu,
  Search,
  Trash2,
  Copy,
  Check,
  Settings,
  LogOut,
  X,
  Bot,
  User,
  FileText,
  Image,
  Code,
  Wand2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaymentService } from '@/services/paymentService';
import { useNavigate } from 'react-router-dom';
import { images } from '@/assets/images';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

interface ChatGPTInterfaceProps {
  selectedWorker?: WorkerType;
  onSelectedWorkerChange?: (worker: WorkerType) => void;
  citationStyle?: 'APA' | 'MLA' | 'Chicago';
  onCitationStyleChange?: (style: 'APA' | 'MLA' | 'Chicago') => void;
}

export const ChatGPTInterface: React.FC<ChatGPTInterfaceProps> = ({ 
  selectedWorker: selectedWorkerProp, 
  onSelectedWorkerChange, 
  citationStyle: citationStyleProp, 
  onCitationStyleChange
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
    getConversationHistory,
    isLoading,
    isMigrating
  } = useScribeChatSupabase();
  
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
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const streamingTimeoutRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const lastMessageCountRef = useRef<number>(0);
  
  // Optimized streaming update
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingChatIdRef = useRef<string | null>(null);

  const updateStreamingContent = useCallback((content: string) => {
    if (streamingTimeoutRef.current) {
      clearTimeout(streamingTimeoutRef.current);
    }

    streamingTimeoutRef.current = setTimeout(() => {
      setStreamingContent(content);

      const chatId = streamingChatIdRef.current;
      const messageId = streamingMessageIdRef.current;
      if (chatId && messageId) {
        updateMessage(chatId, messageId, { content });
      }

      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    }, 25);
  }, [updateMessage, isUserAtBottom]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const count = getCurrentChat()?.messages.length || 0;
    if (count > lastMessageCountRef.current) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        } else {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      }, 100);
    }
    lastMessageCountRef.current = count;
  }, [getCurrentChat]);
  
  // Sync citation style if controlled
  useEffect(() => {
    if (citationStyleProp && citationStyleProp !== citationStyle) {
      setCitationStyle(citationStyleProp);
    }
  }, [citationStyleProp, citationStyle]);

  // Track scroll position
  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsUserAtBottom(atBottom);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 350); // Max 350px height
      textareaRef.current.style.height = `${Math.max(newHeight, 140)}px`; // Min 140px height
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

  const handleSignOut = async () => {
    try {
      await signOut();
      setShowSignOutDialog(false);
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
    // Check subscription
    try {
      const sub = await PaymentService.getCurrentSubscription();
      if ((!sub || sub.status !== 'active') && !(await PaymentService.canUseAI())) {
        setShowUpgradePrompt(true);
        return;
      }
    } catch (error) {
      console.warn('Could not check subscription status:', error);
    }
  
    const allFiles: File[] = [...uploadedFiles];
    if (!input.trim() && allFiles.length === 0) {
      return;
    }
    
    // Ensure there is a current chat, create one if needed
    let currentChat = getCurrentChat();
    let chatId: string;
    
    if (!currentChat) {
      chatId = await createNewChat(selectedWorker);
      await new Promise(resolve => setTimeout(resolve, 100));
      currentChat = getCurrentChat();
      if (!currentChat) {
        console.error('Failed to create or get current chat');
        return;
      }
    } else {
      chatId = currentChat.id;
    }
  
    // Create and add user message
    const userMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: input,
      timestamp: new Date(),
      worker: selectedWorker
    };
  
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
  
    await addMessageToChat(chatId, placeholderMessage);
    
    // Set streaming references
    streamingChatIdRef.current = chatId;
    streamingMessageIdRef.current = placeholderId;
  
    try {
      let assistantContent = '';
      
      // Get conversation history
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fullConversationHistory = getConversationHistory(chatId)
        .filter(msg => msg.content.trim());
      
      const conversationHistory = fullConversationHistory.slice(0, -1);
  
      if (allFiles.length > 0) {
        // Analyze files
        const fileAnalysisReport = await FileAnalysisService.processMultipleFiles(allFiles);
        
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
  
        const response = await ScribeAIService.sendMessage(
          `${contextPrompt}CITATION STYLE: ${citationStyle}\n\n${input}`,
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
      if (streamingChatIdRef.current && streamingMessageIdRef.current) {
        await updateMessage(streamingChatIdRef.current, streamingMessageIdRef.current, { 
          content: assistantContent, 
          isStreaming: false 
        });
      } else {
        const assistantMessage: ScribeMessage = {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: assistantContent,
          worker: selectedWorker,
          timestamp: new Date()
        };
        await addMessageToChat(chatId, assistantMessage);
      }
  
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorText = (error instanceof Error && error.message)
        ? error.message
        : 'Sorry, I encountered an error processing your request. Please try again.';
        
      if (typeof errorText === 'string' && errorText.toLowerCase().includes('free trial')) {
        setShowUpgradePrompt(true);
      }
      
      // Update the placeholder with error message
      if (streamingChatIdRef.current && streamingMessageIdRef.current) {
        await updateMessage(streamingChatIdRef.current, streamingMessageIdRef.current, { 
          content: errorText, 
          isStreaming: false 
        });
      } else {
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
      
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
      }
      
      streamingChatIdRef.current = null;
      streamingMessageIdRef.current = null;
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
      const humanizationRequest = {
        prompt: lastMessage.content,
        rephrase: true,
        tone: 'College' as const,
        mode: 'Medium' as const,
        business: false
      };
      
      const response = await HumanizationService.humanizeTextFull({ ...humanizationRequest, maxChunkChars: 3500 });
      
      if (response.success) {
        const inputWords = lastMessage.content.split(/\s+/).filter(Boolean).length;
        const outputWords = response.result.split(/\s+/).filter(Boolean).length;
        const finalContent = outputWords < Math.max(100, Math.floor(inputWords * 0.6))
          ? `${response.result}\n\n---\nNote: Some content may have been omitted. Original text included for completeness.\n\n${lastMessage.content}`
          : response.result;
        updateMessage(currentChat.id, lastMessage.id, {
          content: finalContent,
          isHumanized: true
        });
      }
    } catch (error) {
      console.error('Humanization error:', error);
    } finally {
      setIsHumanizing(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    (chat.title ? chat.title.toLowerCase() : '').includes(searchQuery.toLowerCase())
  );

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const currentChat = getCurrentChat();

  // Handle window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Also update mobile detection when auth state changes (in case of layout shifts)
  useEffect(() => {
    if (user) {
      setIsMobile(window.innerWidth < 768);
    }
  }, [user]);

  return (
    <div className="flex h-screen bg-chat-bg overflow-hidden max-h-screen">
      {/* Trial End Modal */}
      <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Free Trial Ended</DialogTitle>
            <DialogDescription>
              You have reached your free trial limit. To continue using ScribeAI, please choose a plan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradePrompt(false)}>Maybe later</Button>
            <Button onClick={() => navigate('/subscription')}>View Plans</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Out Confirmation Modal */}
      <Dialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? You'll need to sign in again to access your chats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignOutDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSignOut}>Sign Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sidebar */}
      <div
        className={cn(
          "flex flex-col bg-chat-sidebar border-r transition-all duration-300 ease-in-out",
          isMobile 
            ? "fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm" 
            : "w-80 relative",
          isMobile && !sidebarOpen && "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <img
                src={images.chatgpt}
                alt="ScribeAI"
                className="w-8 h-8 rounded-lg object-cover"
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

        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
            />
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
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

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
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
            onClick={() => setShowSignOutDialog(true)}
            className="w-full justify-start text-muted-foreground h-9"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full max-h-screen">
        {/* Mobile Header */}
        {isMobile && (
          <div
            className="flex items-center justify-between px-4 py-3 border-b bg-card/95 backdrop-blur-sm lg:hidden sticky top-0 z-50 flex-shrink-0"
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
                src="/AI.png"
                alt="ScribeAI"
                className="w-7 h-7 rounded-md object-cover"
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

        {/* Messages Area */}
        <div 
          className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 max-h-[calc(100vh-200px)] scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" 
          style={{ 
            contain: 'layout style paint', 
            WebkitOverflowScrolling: 'touch'
          }}
          ref={scrollContainerRef} 
          onScroll={handleScroll}
        >
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
          ) : (!currentChat || currentChat.messages.length === 0) ? (
            <div className="flex items-center justify-center py-4 px-4 min-h-0">
              <div className="mx-auto w-full max-w-4xl text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-lg font-bold mb-2 text-foreground">Welcome to ScribeAI</h2>
                <p className="text-muted-foreground mb-3 leading-relaxed text-xs">
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
            <div className="flex flex-col space-y-4 p-4 pb-4 max-w-4xl mx-auto">
              {currentChat.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex w-full animate-in fade-in duration-500",
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div className={cn(
                    'flex items-start space-x-3',
                    message.sender === 'user' ? 'flex-row-reverse space-x-reverse max-w-[80%]' : 'flex-row w-full'
                  )}>
                    {/* Avatar */}
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
                      message.sender === 'user' 
                        ? 'bg-chat-bubble-user' 
                        : 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20'
                    )}>
                      {message.sender === 'user' ? (
                        <User className="h-4 w-4 text-white" />
                      ) : (
                        <img
                          src="/AI.png"
                          alt="AI"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    {/* Message Content */}
                    <div className="flex flex-col space-y-2 min-w-0 flex-1">
                      <div className={cn(
                        'rounded-2xl break-words relative group px-4 py-3 shadow-sm',
                        message.sender === 'user'
                          ? 'bg-chat-bubble-user text-white'
                          : 'bg-chat-bubble-ai'
                      )}>
                        {message.sender === 'user' ? (
                          <p className="break-words leading-relaxed text-sm">
                            {message.content}
                          </p>
                        ) : (
                          <MarkdownRenderer
                            content={message.content}
                            className="prose prose-sm max-w-none prose-headings:scroll-mt-16 prose-headings:font-semibold prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-[none] prose-code:after:content-[none] prose-li:my-0 prose-ul:my-2 prose-ol:my-2 leading-relaxed text-sm break-words overflow-x-hidden"
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
                              ? 'text-white hover:bg-white/20' 
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
                          {message.isHumanized && (
                            <span className="text-purple-600 text-xs">✨ Humanized</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Streaming Indicator */}
              {isGenerating && (
                  <div className="flex w-full justify-start animate-in fade-in duration-300">
                    <div className="flex items-start space-x-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      <img
                        src="/AI.png"
                        alt="AI"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex flex-col space-y-2 min-w-0 flex-1">
                      <div className="rounded-2xl bg-chat-bubble-ai px-4 py-3">
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

        {/* Input Area - Elevated */}
        <div
          className="border-t bg-card/98 backdrop-blur-md p-2 flex-shrink-0 sticky bottom-0 z-20 shadow-2xl border-border/30"
          style={isMobile ? {
            paddingBottom: `max(env(safe-area-inset-bottom), 8px)`,
            paddingLeft: `max(env(safe-area-inset-left), 8px)`,
            paddingRight: `max(env(safe-area-inset-right), 8px)`,
            paddingTop: '8px'
          } : {
            paddingTop: '12px',
            paddingBottom: '12px'
          }}
        >
          <div className="w-full max-w-7xl mx-auto space-y-1">
            {/* Controls Row */}
            <div className="flex items-center gap-1 flex-wrap text-xs h-8">
              {/* Worker selector */}
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

              {/* Action buttons */}
              {currentChat && (
                <div className="flex items-center space-x-2 ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={humanizeLastMessage}
                    disabled={!currentChat.messages.length || isHumanizing}
                    title="Humanize the last AI response"
                    className="h-7 px-2 text-xs"
                  >
                    <Wand2 className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline text-xs">
                      {isHumanizing ? 'Humanizing...' : 'Humanize'}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => exportChat('docx')}
                    disabled={!currentChat.messages.length}
                    className="h-7 px-2 text-xs"
                  >
                    <Download className="h-3 w-3 sm:mr-1" />
                    <span className="hidden sm:inline text-xs">Export</span>
                  </Button>
                </div>
              )}
            </div>

            {/* File Upload Areas */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-xl">
                  <div className="w-full text-xs text-muted-foreground mb-1">Uploaded Files:</div>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center space-x-2 bg-background rounded-lg px-2 py-1 text-sm shadow-sm"
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
                <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                  💡 <strong>Tip:</strong> You can now type instructions above about what you'd like me to analyze in these files. I can read text, PDFs, and analyze images!
                </div>
              </div>
            )}

            {/* Professional Input Area */}
            <div className="space-y-1 bg-white/5 dark:bg-black/5 rounded-xl p-2 border border-border/50">
              {/* Input Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <div className="flex items-center space-x-1">
                  <h3 className="text-xs font-medium text-foreground">Message ScribeAI</h3>
                  {uploadedFiles.length > 0 && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                      {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} ready
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Shift+Enter for new line
                </div>
              </div>

              {/* Main Input Container */}
              <div className="relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    uploadedFiles.length > 0
                      ? `Describe what you'd like me to analyze in these files... Be specific about what insights, analysis, or information you're looking for.`
                      : currentChat && currentChat.messages.length > 0
                      ? `Continue the conversation... (${currentChat.messages.length} messages)`
                      : "Ask ScribeAI anything... Provide detailed instructions for comprehensive analysis and responses."
                  }
                  className="w-full min-h-[28px] max-h-[80px] resize-y pr-12 py-1 px-2 text-sm rounded-md border border-border/60 bg-background/80 text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200 shadow-md hover:shadow-lg backdrop-blur-sm"
                  rows={1}
                />
                
                {/* Action Buttons */}
                <div className="absolute right-1.5 bottom-1.5 flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-5 w-5 p-0 hover:bg-muted/50 rounded-sm text-muted-foreground hover:text-foreground shadow-sm hover:shadow-sm transition-all duration-200"
                    title="Upload files"
                  >
                    <Upload className="h-2.5 w-2.5" />
                  </Button>
                  <Button
                    onClick={sendMessage}
                    disabled={(!input.trim() && uploadedFiles.length === 0) || isGenerating}
                    size="sm"
                    className="h-5 px-2.5 rounded-sm bg-primary hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs"
                  >
                    {isGenerating ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="font-medium">Sending...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Send className="h-4 w-4" />
                        <span className="font-medium">Send</span>
                      </div>
                    )}
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="*/*"
                />
              </div>

              {/* Input Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-muted-foreground">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-1.5">
                  <span className="text-xs">Supports: Text, PDF, Images, Documents</span>
                  <span className="hidden sm:inline text-xs">•</span>
                  <span className="text-xs">AI can analyze visual content</span>
                </div>
                <div className="text-left sm:text-right">
                  {input.length > 0 && (
                    <span className="text-foreground/60">
                      {input.length} characters
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
