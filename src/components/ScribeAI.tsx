import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Trash2, MoreVertical, MessageSquare, Menu, X, LogOut, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  Message, 
  AIModel, 
  ConversationState, 
  ApiStatus, 
  PerformanceMetrics,
  FileAttachment,
  Chat 
} from '@/types/chat';
import { detectQueryType, routeToOptimalModel } from '@/utils/aiRouting';
import { AIService } from '@/services/aiService';
import { useChatManager } from '@/hooks/useChatManager';
import { useAuth } from '@/hooks/useAuth';
import { MessageBubble } from './chat/MessageBubble';
import { ChatInput } from './chat/ChatInput';
import { TypingIndicator } from './chat/TypingIndicator';
import { ChatSidebar } from './chat/ChatSidebar';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const ScribeAI: React.FC = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const {
    chats,
    currentChatId,
    getCurrentChat,
    createNewChat,
    addMessageToChat,
    deleteChat,
    switchToChat
  } = useChatManager();

  const [conversation, setConversation] = useState<ConversationState>({
    messages: [],
    currentModel: 'auto',
    isTyping: false,
    activeModel: undefined
  });

  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    'scholar-mind': 'online',
    'reason-core': 'online'
  });

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    averageResponseTime: 0,
    totalTokensUsed: 0,
    requestCount: 0,
    successRate: 100
  });

  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Sign out failed",
        description: "Please try again",
        variant: "destructive"
      });
    }
  };

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile when app loads
      if (mobile) setShowSidebar(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Optimized auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [conversation.messages.length, conversation.isTyping, scrollToBottom]);

  // Load current chat messages
  useEffect(() => {
    const currentChat = getCurrentChat();
    if (currentChat) {
      setConversation(prev => ({
        ...prev,
        messages: currentChat.messages
      }));
    } else {
      setConversation(prev => ({
        ...prev,
        messages: []
      }));
    }
  }, [currentChatId, getCurrentChat]);

  // API status check
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const status = await AIService.checkApiStatus();
        setApiStatus(status as ApiStatus);
      } catch (error) {
        console.error('Failed to check API status:', error);
        // Set offline status if check fails
        setApiStatus({
          'scholar-mind': 'offline',
          'reason-core': 'offline'
        });
      }
    };
    
    checkApiStatus();
    const interval = setInterval(checkApiStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Real API integration using Supabase edge functions
  const handleSendMessage = useCallback(async (
    content: string, 
    files: FileAttachment[], 
    selectedModel: AIModel
  ) => {
    if (!content.trim() && files.length === 0) return;

    // Determine final model
    let finalModel = selectedModel;
    if (selectedModel === 'auto') {
      const queryType = detectQueryType(content, files.length > 0);
      finalModel = routeToOptimalModel(queryType);
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      sender: 'user',
      timestamp: new Date(),
      attachments: files.length > 0 ? files : undefined
    };

    // Use existing chat or create new one only if no current chat exists
    let chatId = currentChatId;
    if (!chatId) {
      chatId = createNewChat(userMessage);
    } else {
      addMessageToChat(chatId, userMessage);
    }

    setConversation(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
      activeModel: finalModel
    }));

    try {
      // Create AI message that will be updated with streaming content
      const aiMessage: Message = {
        id: crypto.randomUUID(),
        content: '',
        sender: 'ai',
        aiModel: finalModel,
        timestamp: new Date(),
        responseTime: 0,
        tokensUsed: 0
      };

      // Add initial empty AI message
      setConversation(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage]
      }));

      // Call AI service with streaming
      let streamedContent = '';
      const response = await AIService.sendMessage(
        content, 
        files, 
        finalModel, 
        conversation.messages,
        (chunk: string) => {
          // Update the AI message content as chunks arrive
          streamedContent += chunk;
          setConversation(prev => ({
            ...prev,
            messages: prev.messages.map(msg => 
              msg.id === aiMessage.id 
                ? { ...msg, content: streamedContent }
                : msg
            )
          }));
        }
      );
      
      // Update with final response data, using streamed content or fallback
      const finalContent = streamedContent || response.content;
      const finalAiMessage: Message = {
        ...aiMessage,
        content: finalContent,
        responseTime: response.responseTime,
        tokensUsed: response.tokensUsed
      };

      // Update conversation with final message data and stop typing
      setConversation(prev => ({
        ...prev,
        messages: prev.messages.map(msg => 
          msg.id === aiMessage.id ? finalAiMessage : msg
        ),
        isTyping: false,
        activeModel: undefined
      }));

      // Add final AI message to chat
      if (chatId) {
        addMessageToChat(chatId, finalAiMessage);
      }

      // Update metrics
      setMetrics(prev => {
        const newRequestCount = prev.requestCount + 1;
        const newTotalTokens = prev.totalTokensUsed + response.tokensUsed;
        const newAvgResponseTime = ((prev.averageResponseTime * prev.requestCount) + response.responseTime) / newRequestCount;
        
        return {
          averageResponseTime: newAvgResponseTime,
          totalTokensUsed: newTotalTokens,
          requestCount: newRequestCount,
          successRate: prev.successRate // Would be calculated based on actual failures
        };
      });

      toast({
        title: "Message sent successfully",
        description: `Response received in ${(response.responseTime / 1000).toFixed(1)}s`
      });

    } catch (error) {
      console.error('Failed to send message:', error);
      
      setConversation(prev => ({
        ...prev,
        isTyping: false,
        activeModel: undefined
      }));

      toast({
        title: "Failed to send message",
        description: "Please try again later",
        variant: "destructive"
      });
    }
  }, [conversation.messages, currentChatId, createNewChat, addMessageToChat]);

  const handleRegenerate = useCallback((messageId: string) => {
    const message = conversation.messages.find(m => m.id === messageId);
    if (!message || message.sender !== 'ai') return;

    // Find the user message before this AI message
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    const userMessage = conversation.messages[messageIndex - 1];
    
    if (userMessage && userMessage.sender === 'user') {
      handleSendMessage(
        userMessage.content, 
        userMessage.attachments || [], 
        message.aiModel || 'auto'
      );
    }
  }, [conversation.messages, handleSendMessage]);

  const handleSwitchModel = useCallback((messageId: string) => {
    const message = conversation.messages.find(m => m.id === messageId);
    if (!message || message.sender !== 'ai') return;

    // Find the user message before this AI message
    const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
    const userMessage = conversation.messages[messageIndex - 1];
    
    if (userMessage && userMessage.sender === 'user') {
      const currentModel = message.aiModel || 'scholar-mind';
      const newModel = currentModel === 'scholar-mind' ? 'reason-core' : 'scholar-mind';
      
      handleSendMessage(
        userMessage.content, 
        userMessage.attachments || [], 
        newModel
      );
    }
  }, [conversation.messages, handleSendMessage]);

  const clearConversation = () => {
    setConversation({
      messages: [],
      currentModel: 'auto',
      isTyping: false,
      activeModel: undefined
    });
    setMetrics({
      averageResponseTime: 0,
      totalTokensUsed: 0,
      requestCount: 0,
      successRate: 100
    });
    toast({
      title: "Conversation cleared",
      description: "All messages have been removed"
    });
  };

  const exportConversation = () => {
    const conversationText = conversation.messages
      .map(msg => `${msg.sender === 'user' ? 'You' : msg.aiModel || 'AI'}: ${msg.content}`)
      .join('\n\n');
    
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scribe-ai-conversation-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Conversation exported",
      description: "File downloaded successfully"
    });
  };

  const handleNewChat = () => {
    createNewChat();
    setConversation({
      messages: [],
      currentModel: 'auto',
      isTyping: false,
      activeModel: undefined
    });
  };

  // Show loading skeleton while checking auth
  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="w-80 border-r bg-muted/30 p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-6 w-3/4 mb-2" />
          <Skeleton className="h-6 w-1/2 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <div className="border-b p-4">
            <Skeleton className="h-8 w-48" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-6 w-3/4 mb-4" />
            <Skeleton className="h-20 w-full mb-4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Mobile Overlay */}
      {isMobile && showSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-45"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Chat Sidebar */}
      <div className={cn(
        "transition-transform duration-300 ease-in-out z-50",
        isMobile ? "fixed left-0 top-0 h-full" : "relative",
        showSidebar ? "translate-x-0" : "-translate-x-full",
        !isMobile && !showSidebar && "hidden"
      )}>
        <ChatSidebar
          chats={chats}
          currentChatId={currentChatId}
          onNewChat={handleNewChat}
          onSelectChat={(chatId) => {
            switchToChat(chatId);
            if (isMobile) setShowSidebar(false);
          }}
          onDeleteChat={deleteChat}
          isMobile={isMobile}
          onClose={() => setShowSidebar(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm md:relative fixed top-0 left-0 right-0 z-40 md:z-auto md:border-b-border border-b-border/60">
          <div className="flex items-center space-x-3">
            {(!showSidebar || isMobile) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSidebar(true)}
                className="md:hidden"
              >
                <Menu className="h-4 w-4" />
              </Button>
            )}
            <img src="/AI.png" alt="ScribeAI" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <h1 className="text-xl font-bold text-foreground">
                ScribeAI
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Intelligent Academic Assistant
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mr-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.email}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSidebar(!showSidebar)}
              className="hidden md:flex hover:bg-muted/50"
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            <ThemeToggle />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={exportConversation}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Conversation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={clearConversation} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Conversation
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Messages Area */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 px-2 md:px-4 pt-20 pb-32 md:pt-0 md:pb-0">
          <div className="max-w-4xl mx-auto space-y-4 py-4">
            {conversation.messages.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <img src="/AI.png" alt="ScribeAI" className="w-16 h-16 mx-auto mb-4 rounded-xl object-cover" />
                <h3 className="text-lg font-semibold mb-2">Welcome to ScribeAI</h3>
                <p className="text-muted-foreground max-w-lg mx-auto mb-4">
                  Your specialized academic AI assistant, fine-tuned exclusively for scholarly research and academic writing.
                </p>
                <div className="text-sm text-muted-foreground max-w-2xl mx-auto space-y-2">
                  <p className="font-medium text-foreground mb-3">Choose your AI specialist:</p>
                  <div className="grid md:grid-cols-2 gap-4 text-left">
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/20">
                      <h4 className="font-semibold text-foreground mb-2">✍️ ScribeMaster</h4>
                      <p className="text-xs">Academic writing, essays, literature analysis, research papers, and scholarly communication</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/30 border border-border/20">
                      <h4 className="font-semibold text-foreground mb-2">⚡ Lightning Thinq</h4>
                      <p className="text-xs">Mathematics, coding, physics, computational analysis, and STEM problem-solving</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {conversation.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onRegenerate={handleRegenerate}
                    onSwitchModel={handleSwitchModel}
                  />
                ))}
                
                {conversation.isTyping && (
                  <TypingIndicator activeModel={conversation.activeModel} />
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={conversation.isTyping}
          currentModel={conversation.currentModel}
          onModelChange={(model) => setConversation(prev => ({ ...prev, currentModel: model }))}
        />
      </div>
    </div>
  );
};