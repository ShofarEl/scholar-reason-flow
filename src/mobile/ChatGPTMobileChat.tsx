import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { cn } from '@/lib/utils';
import { 
  Menu, LogOut, Settings, Upload, X, Plus, Trash2, Download, Bot, User, Copy, Check, Wand2, ChevronDown, Send, CreditCard, MessageSquare
} from 'lucide-react';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { PaymentService } from '@/services/paymentService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

type ChatGPTMobileChatProps = {
  // Optional pre-injected files from parent shell
  injectedFiles?: File[];
  onFilesConsumed?: () => void;
};

export const ChatGPTMobileChat: React.FC<ChatGPTMobileChatProps> = ({ injectedFiles = [], onFilesConsumed }) => {
  const navigate = useNavigate();
  const { getRemainingAIMessages } = useSubscription();
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
    getConversationHistory,
    isLoading,
    isMigrating
  } = useScribeChatSupabase();

  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<WorkerType>('scholarly');
  const [citationStyle, setCitationStyle] = useState<'APA' | 'MLA' | 'Chicago'>('APA');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modelSheetOpen, setModelSheetOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  // Humanizer (mobile) state
  const [humanizeOpen, setHumanizeOpen] = useState(false);
  const [humanizeInput, setHumanizeInput] = useState('');
  const [humanizeFiles, setHumanizeFiles] = useState<File[]>([]);
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [humanizeTone, setHumanizeTone] = useState<'Standard' | 'HighSchool' | 'College' | 'PhD'>('College');
  const [humanizeMode, setHumanizeMode] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const humanizeFileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Streaming placeholder tracking
  const streamingTimeoutRef = useRef<NodeJS.Timeout>();
  const streamingMessageIdRef = useRef<string | null>(null);
  const streamingChatIdRef = useRef<string | null>(null);
  
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [trialUsage, setTrialUsage] = useState<{ remaining: number; limit: number; used: number } | null>(null);

  // Create a new chat on mount if none exists
  // useEffect(() => {
  //   if (!currentChatId && chats.length === 0) {
  //     createNewChat(selectedWorker);
  //   }
  // }, [currentChatId, chats.length, createNewChat, selectedWorker]);

  const updateStreamingContent = useCallback((content: string) => {
    setStreamingContent(content);
    const chatId = streamingChatIdRef.current;
    const messageId = streamingMessageIdRef.current;
    if (chatId && messageId) {
      updateMessage(chatId, messageId, { content });
    }
    if (scrollContainerRef.current && isUserAtBottom) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [updateMessage, isUserAtBottom]);

  useEffect(() => {
    return () => {
      if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current);
    };
  }, []);

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

  const handleCreateNewChat = async () => {
    await createNewChat(selectedWorker);
    setInput('');
    setPendingFiles([]);
    setDrawerOpen(false);
  };

  const currentChat = getCurrentChat();

  const getConversationSummary = (chat: any) => {
    if (chat.messages.length === 0) return 'New conversation';
    const userMessages = chat.messages.filter((m: any) => m.sender === 'user');
    if (userMessages.length === 0) return 'No user messages';
    const first = userMessages[0].content;
    const count = chat.messages.length;
    return `${first.slice(0, 30)}${first.length > 30 ? '...' : ''} (${count})`;
  };

  const copyMessageContent = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1600);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 1600);
    }
  };

  const exportChat = async (format: 'docx' | 'pdf' | 'txt') => {
    const chat = getCurrentChat();
    if (!chat) return;
    const content = chat.messages.map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    await ExportService.exportContent(content, `${chat.title}_chat`, format);
  };

  const humanizeLastMessage = async () => {
    const chat = getCurrentChat();
    if (!chat || chat.messages.length === 0) return;
    const last = chat.messages[chat.messages.length - 1];
    if (last.sender !== 'assistant') return;
    try {
      const response = await HumanizationService.humanizeTextFull({
        prompt: last.content,
        rephrase: true,
        tone: 'College',
        mode: 'Medium',
        business: false,
        maxChunkChars: 3500
      });
      if (response.success) {
        const inputWords = last.content.split(/\s+/).filter(Boolean).length;
        const outputWords = response.result.split(/\s+/).filter(Boolean).length;
        const finalContent = outputWords < Math.max(100, Math.floor(inputWords * 0.6))
          ? `${response.result}\n\n---\nNote: Some content may have been omitted. Original text included for completeness.\n\n${last.content}`
          : response.result;
        updateMessage(chat.id, last.id, { content: finalContent, isHumanized: true });
      }
    } catch (e) {}
  };

  const runHumanization = async () => {
    if (!humanizeInput.trim() && humanizeFiles.length === 0) return;
    setIsHumanizing(true);
    try {
      let prompt = humanizeInput.trim();
      if (humanizeFiles.length > 0) {
        const report = await FileAnalysisService.processMultipleFiles(humanizeFiles);
        prompt = `${report}\n\n${prompt}`.trim();
      }
      const response = await HumanizationService.humanizeText({
        prompt,
        rephrase: true,
        tone: humanizeTone,
        mode: humanizeMode,
        business: false
      });
      if (response.success) {
        let chatId = getCurrentChat()?.id || null;
        if (!chatId) {
          chatId = await createNewChat(selectedWorker);
        }
        addMessageToChat(chatId!, {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: response.result,
          timestamp: new Date(),
          worker: selectedWorker,
          isHumanized: true
        });
        setHumanizeInput('');
        setHumanizeFiles([]);
        setHumanizeOpen(false);
        setTimeout(() => {
          if (scrollContainerRef.current && isUserAtBottom) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    } catch (e) {
      let chatId = getCurrentChat()?.id || null;
      if (!chatId) {
        chatId = await createNewChat(selectedWorker);
      }
      addMessageToChat(chatId!, {
        id: crypto.randomUUID(),
        sender: 'assistant',
        content: 'Sorry, I could not humanize your content. Please try again.',
        timestamp: new Date(),
        worker: selectedWorker
      });
    } finally {
      setIsHumanizing(false);
    }
  };

  const sendMessage = async () => {
    // Pre-block if free trial token budget is exhausted
    try {
      const sub = await PaymentService.getCurrentSubscription();
      if ((!sub || sub.status !== 'active') && !(await PaymentService.canUseAI())) {
        setShowUpgradePrompt(true);
        return;
      }
    } catch {}
    const allFiles: File[] = [...pendingFiles, ...(injectedFiles || [])];
    if (!input.trim() && allFiles.length === 0) return;

    // Ensure there is an active chat; create one if missing
    let chatId = getCurrentChat()?.id || null;
    if (!chatId) {
      chatId = await createNewChat(selectedWorker);
    }

    const userMessage: ScribeMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: input,
      timestamp: new Date(),
      worker: selectedWorker
    };

    addMessageToChat(chatId, userMessage);
    setInput('');
    setPendingFiles([]);
    setIsGenerating(true);
    setStreamingContent('');

    try {
      let assistantContent = '';
      
      const placeholderId = crypto.randomUUID();
      const placeholderMessage: ScribeMessage = {
        id: placeholderId,
        sender: 'assistant',
        content: '',
        worker: selectedWorker,
        timestamp: new Date(),
        isStreaming: true
      };
      addMessageToChat(chatId, placeholderMessage);
      streamingChatIdRef.current = chatId;
      streamingMessageIdRef.current = placeholderId;
      
      // Get conversation history AFTER adding the placeholder message
      // Add a small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const fullConversationHistory = getConversationHistory(chatId) as Array<{ role: 'user' | 'assistant'; content: string }>;
      
      // Remove only the placeholder message (last one), keep the user message for context
      const baseConversationHistory = fullConversationHistory.slice(0, -1);
      
      console.log(`📚 Mobile: Using conversation history: ${baseConversationHistory.length} messages`);
      console.log(`📚 Mobile: Full history length: ${fullConversationHistory.length} messages`);
      
      // Ensure we start at the bottom when streaming begins if user is near bottom
      setTimeout(() => {
        if (scrollContainerRef.current && isUserAtBottom) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
      }, 50);

      if (allFiles.length > 0) {
        const fileAnalysisReport = await FileAnalysisService.processMultipleFiles(allFiles);
        const enhancedPrompt = `**CITATION STYLE:** ${citationStyle}\n\n**FILE CONTENT FOR ANALYSIS**\n\n${fileAnalysisReport}\n\n**USER REQUEST:** ${input || 'Please analyze the uploaded files and provide insights.'}\n\n**CRITICAL INSTRUCTIONS:**\n1. The above content contains the EXTRACTED TEXT from uploaded files\n2. Analyze the ACTUAL CONTENT shown above, not just file metadata\n3. Provide detailed analysis based on the extracted text content\n4. If you see "EXTRACTED CONTENT:" sections, analyze that content\n5. If you see "EXTRACTED PDF CONTENT:" sections, analyze that content\n6. Answer the user's specific questions about the file content\n7. Use proper markdown formatting with clear headings\n\n**ANALYSIS REQUIREMENTS:**\n- Thoroughly analyze the extracted content\n- Provide specific insights about the actual text/data\n- Answer any questions the user has about the content\n- Use academic formatting with proper structure\n- Focus on the content, not just file information`;
        const conversationHistory = baseConversationHistory;
        const inlineContext = conversationHistory.length > 0
          ? `\n\n---\nCONVERSATION CONTEXT (last ${Math.min(10, conversationHistory.length)} messages):\n` +
            conversationHistory.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') +
            `\n---\n`
          : '';
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
        const conversationHistory = baseConversationHistory;
        const inlineContext = conversationHistory.length > 0
          ? `CONVERSATION CONTEXT (last ${Math.min(10, conversationHistory.length)} messages):\n` +
            conversationHistory.slice(-10).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n') +
            `\n\nCURRENT USER MESSAGE:\n`
          : '';
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

      const finalizeChatId = streamingChatIdRef.current;
      const finalizeMessageId = streamingMessageIdRef.current;
      if (finalizeChatId && finalizeMessageId) {
        console.log('📝 Mobile: Finalizing assistant message with content length:', assistantContent.length);
        console.log('📝 Mobile: Final content preview:', assistantContent.slice(0, 100) + '...');
        console.log('📝 Mobile: Streaming refs - Chat ID:', finalizeChatId, 'Message ID:', finalizeMessageId);
        
        try {
          const updateResult = await updateMessage(finalizeChatId, finalizeMessageId, { content: assistantContent, isStreaming: false });
          console.log('📝 Mobile: Message finalization result:', updateResult);
          
          if (!updateResult) {
            console.error('❌ Mobile: Message finalization failed!');
          }
        } catch (error) {
          console.error('❌ Mobile: Error during message finalization:', error);
        }
      }
      // After a successful assistant response, if on free trial and remaining hits 0, prompt upgrade
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
      } catch {}
    } catch (error) {
      const errChatId = streamingChatIdRef.current;
      const errMsgId = streamingMessageIdRef.current;
      const errorText = (error instanceof Error && error.message)
        ? error.message
        : 'Sorry, I encountered an error processing your request. Please try again.';
      if (typeof errorText === 'string' && errorText.toLowerCase().includes('free trial')) {
        setShowUpgradePrompt(true);
      }
      if (errChatId && errMsgId) {
        updateMessage(errChatId, errMsgId, { content: errorText, isStreaming: false });
      } else if (chatId) {
        addMessageToChat(chatId, {
          id: crypto.randomUUID(),
          sender: 'assistant',
          content: errorText,
          worker: selectedWorker,
          timestamp: new Date()
        });
      }
    } finally {
      setIsGenerating(false);
      setStreamingContent('');
      if (streamingTimeoutRef.current) clearTimeout(streamingTimeoutRef.current);
      streamingChatIdRef.current = null;
      streamingMessageIdRef.current = null;
      if (onFilesConsumed && (injectedFiles?.length || 0) > 0) onFilesConsumed();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <span>🖼️</span>;
    if (file.type.includes('text') || file.type.includes('code')) return <span>📄</span>;
    return <span>📎</span>;
  };

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const threshold = 80;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    setIsUserAtBottom(atBottom);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div
      className={cn(
        "fixed inset-0 flex flex-col bg-background overscroll-none",
        drawerOpen && "overflow-hidden"
      )}
      style={{ height: '100dvh' }}
    >
      {/* Trial End Modal (Mobile) */}
      <Dialog open={showUpgradePrompt} onOpenChange={setShowUpgradePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Free Trial Ended</DialogTitle>
            <DialogDescription>
              You reached your free trial limit. Choose a plan to continue.
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
      {/* Side drawer overlay */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute inset-y-0 left-0 w-[86vw] max-w-[340px] bg-card border-r p-4 overflow-y-auto overscroll-contain"
            style={{
              paddingTop: 'max(env(safe-area-inset-top), 12px)',
              paddingBottom: 'max(env(safe-area-inset-bottom), 12px)'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <img
                    src="/AI.png"
                    alt="ScribeAI"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate max-w-[160px]">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">Signed in</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setDrawerOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <Button onClick={handleCreateNewChat} className="w-full justify-start h-10 mb-3" variant="outline">
              <Plus className="h-4 w-4 mr-2" /> New Chat
            </Button>

            <div className="mb-3">
              <SubscriptionStatus variant="compact" />
            </div>

            <div className="mb-3">
              <div className="text-xs mb-2 text-muted-foreground">Workers</div>
              <div className="space-y-2">
                {Object.values(WORKER_CONFIGS).map((config) => (
                  <Button
                    key={config.id}
                    variant={selectedWorker === config.id ? 'default' : 'outline'}
                    className="w-full justify-start h-11"
                    onClick={() => setSelectedWorker(config.id)}
                  >
                    <span className="mr-2 text-base">{config.icon}</span>
                    <span className="truncate">{config.name}</span>
                  </Button>
                ))}
                <Button
                  variant="outline"
                  className="w-full justify-start h-11"
                  onClick={() => { setDrawerOpen(false); navigate('/humanizer'); }}
                >
                  <span className="mr-2 text-base">✨</span>
                  <span className="truncate">Open Humanizer</span>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start h-11"
                  onClick={() => { setDrawerOpen(false); navigate('/subscription'); }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  <span className="truncate">Subscription & Billing</span>
                </Button>
              </div>
            </div>

            <div className="mb-3">
              <div className="text-xs mb-2 text-muted-foreground">Citation</div>
              <Select value={citationStyle} onValueChange={(v) => setCitationStyle(v as 'APA' | 'MLA' | 'Chicago')}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APA">APA</SelectItem>
                  <SelectItem value="MLA">MLA</SelectItem>
                  <SelectItem value="Chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-muted-foreground">Conversations</div>
              <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => exportChat('docx')} disabled={!currentChat}>
                <Download className="h-4 w-4 mr-1" /> Export
              </Button>
            </div>
            <div className="divide-y border rounded-md overflow-hidden">
              {chats.map((chat) => (
                <div key={chat.id} className={cn('p-3 text-sm bg-card/50 hover:bg-muted/30 transition-colors flex items-start justify-between', currentChatId === chat.id && 'bg-muted/50')}
                     onClick={() => { switchToChat(chat.id); setDrawerOpen(false); }}>
                  <div className="min-w-0 mr-2">
                    <div className="font-medium truncate max-w-[190px]">{chat.title || 'Untitled Chat'}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[190px]">{getConversationSummary(chat)}</div>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        {/* ChatGPT-like top bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-card/95 backdrop-blur-sm sticky top-0 z-40" style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => setDrawerOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-2">
              <img
                src="/AI.png"
                alt="ScribeAI"
                className="w-7 h-7 rounded-md object-cover"
              />
              <div className="font-semibold">ScribeAI</div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {/* Export Chat */}
            {currentChat && currentChat.messages.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-10 w-10 p-0" 
                onClick={() => exportChat('docx')}
                title="Export Chat"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            
            {/* Humanizer */}
            <Button 
              variant="ghost" 
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => navigate('/humanizer')}
              title="Open Humanizer"
            >
              <Wand2 className="h-4 w-4" />
            </Button>
            
            {/* Subscription/Billing */}
            <Button 
              variant="ghost" 
              size="sm"
              className="h-10 w-10 p-0"
              onClick={() => navigate('/subscription')}
              title="Subscription & Billing"
            >
              <CreditCard className="h-4 w-4" />
            </Button>
            
            {/* Sign Out */}
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0" 
              onClick={signOut}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {showUpgradePrompt && (
          <div className="px-4 py-2 text-sm bg-yellow-50 text-yellow-800 border-b border-yellow-200 flex items-center justify-between">
            <div>Your free trial has ended. Subscribe to continue using ScribeAI.</div>
            <Button size="sm" onClick={() => navigate('/subscription')}>Subscribe</Button>
          </div>
        )}

        {/* Model sheet (simple inline) */}
        {modelSheetOpen && (
          <div className="border-b bg-card/95 backdrop-blur-sm px-4 py-3">
            <div className="grid grid-cols-3 gap-2 mb-2">
              {Object.values(WORKER_CONFIGS).map((config) => (
                <Button key={config.id} variant={selectedWorker === config.id ? 'default' : 'outline'} className="h-9 text-xs" onClick={() => setSelectedWorker(config.id)}>
                  <span className="mr-1">{config.icon}</span>{config.name.split(' ')[0]}
                </Button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-muted-foreground">Citation</span>
              <Select value={citationStyle} onValueChange={(v) => setCitationStyle(v as 'APA' | 'MLA' | 'Chicago')}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="APA">APA</SelectItem>
                  <SelectItem value="MLA">MLA</SelectItem>
                  <SelectItem value="Chicago">Chicago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Messages */}
        <div
          className="flex-1 h-0 min-h-0 max-h-full overflow-y-auto overflow-x-hidden overscroll-contain touch-pan-y flex flex-col pointer-events-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{ contain: 'layout style paint', WebkitOverflowScrolling: 'touch' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md mx-auto">
                <div className="text-2xl mb-2">⏳</div>
                <div className="text-xl font-semibold mb-2">Loading your chats...</div>
                <div className="text-sm text-muted-foreground">Please wait while we sync your data</div>
              </div>
            </div>
          ) : isMigrating ? (
            <div className="flex items-center justify-center h-full p-6">
              <div className="text-center max-w-md mx-auto">
                <div className="text-2xl mb-2">🔄</div>
                <div className="text-xl font-semibold mb-2">Migrating your chats...</div>
                <div className="text-sm text-muted-foreground">Moving your conversations to the cloud for better sync</div>
              </div>
            </div>
          ) : (!currentChat || currentChat.messages.length === 0) ? (
            <div className="flex items-center justify-center py-6 px-4">
              <div className="text-center max-w-md mx-auto">
                <div className="text-xl mb-2">👋</div>
                <div className="text-lg font-semibold mb-2">Welcome to ScribeAI</div>
                <div className="text-xs text-muted-foreground">Ask anything, attach files, and choose a worker model.</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-6 px-0 pb-6 pt-4">
              {currentChat.messages.map((message) => {
                const isLast = message.id === currentChat.messages[currentChat.messages.length - 1]?.id;
                const isStreamingLast = isGenerating && isLast;
                const content = isStreamingLast ? (streamingContent || message.content) : message.content;
                return (
                  <div key={message.id} className={cn('flex w-full', message.sender === 'user' ? 'justify-end px-4' : 'justify-start')}>
                    <div className={cn('flex items-start space-x-3', message.sender === 'user' ? 'max-w-[90%] flex-row-reverse space-x-reverse' : 'w-full flex-row')}>
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden', message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 ml-2')}>
                        {message.sender === 'user' ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <img
                            src="/AI.png"
                            alt="AI"
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div
                          className={cn(
                            message.sender === 'user'
                              ? 'rounded-2xl p-3 break-words relative group shadow-sm bg-primary text-primary-foreground rounded-tr-md'
                              : 'relative group py-1 pr-2 pl-1 min-h-[28px] w-full'
                          )}
                        >
                          {message.sender === 'user' ? (
                            <p className="whitespace-pre-wrap break-words leading-relaxed text-sm">{content}</p>
                          ) : (
                            <MarkdownRenderer
                              content={content}
                              className="prose prose-sm max-w-none prose-headings:scroll-mt-16 prose-headings:font-semibold prose-pre:bg-transparent prose-pre:p-0 prose-code:before:content-[none] prose-code:after:content-[none] prose-li:my-0 prose-ul:my-2 prose-ol:my-2 w-full leading-relaxed break-words overflow-x-hidden"
                              variant="academic"
                            />
                          )}
                          {message.sender === 'assistant' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyMessageContent(message.content, message.id)}
                              className="absolute top-1 right-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-muted/50"
                            >
                              {copiedMessageId === message.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            </Button>
                          )}
                        </div>
                        {message.sender === 'assistant' && (
                          <div className="flex items-center space-x-2 text-[10px] text-muted-foreground px-2 justify-start">
                            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {message.isHumanized && (
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
                  <div className="flex items-start space-x-3 w-full">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden ml-2">
                      <img
                        src="/AI.png"
                        alt="AI"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="relative group py-1 pr-2 pl-1">
                        {!streamingContent && (
                          <div className="text-xs text-muted-foreground mb-2">ScribeAI is thinking…</div>
                        )}
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div
          className="border-t bg-card/95 backdrop-blur-sm p-3 sticky bottom-0"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
        >
          {/* Model Toggle */}
          <div className="mb-2 flex justify-center">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-xs bg-background/80 backdrop-blur-sm" 
              onClick={() => setModelSheetOpen((v) => !v)}
            >
              <span className="mr-2">{WORKER_CONFIGS[selectedWorker]?.icon || '📝'}</span>
              {WORKER_CONFIGS[selectedWorker]?.name || 'Worker'}
              <ChevronDown className="h-3 w-3 ml-2" />
            </Button>
          </div>

          {/* Humanizer moved to separate page for better UX on mobile */}
          {!!(pendingFiles.length || (injectedFiles && injectedFiles.length)) && (
            <div className="mb-2 flex flex-wrap gap-1 p-2 bg-muted/30 rounded-xl">
              {pendingFiles.map((file, idx) => (
                <div key={idx} className="flex items-center space-x-2 bg-background rounded-md px-2 py-1 text-xs shadow-sm">
                  <span>{getFileIcon(file)}</span>
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPendingFiles(prev => prev.filter((_, i) => i !== idx))}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {injectedFiles && injectedFiles.length > 0 && (
                <div className="text-xs text-blue-600">{injectedFiles.length} file(s) ready</div>
              )}
            </div>
          )}

          <div className="flex items-end space-x-1">
            <div className="flex-1 relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={currentChat && currentChat.messages.length > 0 ? `Message ScribeAI... (${currentChat.messages.length} msgs)` : 'Message ScribeAI...'}
                className="w-full h-10 min-h-[40px] max-h-[40px] resize-none pr-12 py-2 px-3 text-sm rounded-lg border border-border bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground transition-all duration-200"
                rows={1}
              />
              <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} className="absolute right-10 bottom-2 h-6 w-6 p-0 hover:bg-muted rounded-md">
                <Upload className="h-3 w-3" />
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={sendMessage}
                disabled={(!input.trim() && pendingFiles.length === 0) || isGenerating}
                className="absolute right-2 bottom-2 h-6 w-6 p-0 rounded-md"
                title="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
              <input ref={fileInputRef} type="file" multiple onChange={(e) => { const files = Array.from(e.target.files || []); setPendingFiles(prev => [...prev, ...files]); }} className="hidden" accept="*/*" />
            </div>
            {/* Removed external Send button to widen input */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatGPTMobileChat;

