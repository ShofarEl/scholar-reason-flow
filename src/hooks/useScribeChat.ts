import { useState, useCallback, useEffect } from 'react';
import { ScribeChat, ScribeMessage, WorkerType } from '@/types/scribe';

const STORAGE_KEY = 'scribe-ai-chats';
const CURRENT_CHAT_KEY = 'scribe-ai-current-chat';

export const useScribeChat = () => {
  const [chats, setChats] = useState<ScribeChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load chats from localStorage on initialization
  useEffect(() => {
    try {
      const savedChats = localStorage.getItem(STORAGE_KEY);
      const savedCurrentChat = localStorage.getItem(CURRENT_CHAT_KEY);
      
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
          messages: chat.messages
            .map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp)
            }))
            .filter((msg: any) => msg.worker !== 'batch') // Filter out old batch messages
        })).filter((chat: any) => chat.worker !== 'batch'); // Filter out old batch chats
        
        setChats(parsedChats);
      }
      
      if (savedCurrentChat) {
        setCurrentChatId(savedCurrentChat);
      }
    } catch (error) {
      console.error('Failed to load chats from localStorage:', error);
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
      } catch (error) {
        console.error('Failed to save chats to localStorage:', error);
      }
    }
  }, [chats]);

  // Save current chat ID whenever it changes
  useEffect(() => {
    try {
      if (currentChatId) {
        localStorage.setItem(CURRENT_CHAT_KEY, currentChatId);
      } else {
        localStorage.removeItem(CURRENT_CHAT_KEY);
      }
    } catch (error) {
      console.error('Failed to save current chat ID:', error);
    }
  }, [currentChatId]);

  const createNewChat = useCallback((worker: WorkerType, firstMessage?: ScribeMessage): string => {
    const safeFirst = (firstMessage?.content || '').trim();
    const baseTitle = safeFirst ? safeFirst.slice(0, 50) + (safeFirst.length > 50 ? '...' : '') : `New ${worker} chat`;
    const newChat: ScribeChat = {
      id: crypto.randomUUID(),
      title: baseTitle,
      messages: firstMessage ? [firstMessage] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      worker
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const getCurrentChat = useCallback((): ScribeChat | null => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  const updateChat = useCallback((chatId: string, updates: Partial<ScribeChat>) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, ...updates, updatedAt: new Date() }
        : chat
    ));
  }, []);

  const addMessageToChat = useCallback((chatId: string, message: ScribeMessage) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, message],
            updatedAt: new Date(),
            // Update title if this is the first user message and content exists
            title: chat.messages.length === 0 && message.sender === 'user' && message.content?.trim()
              ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
              : chat.title || `Chat ${chat.id.slice(0, 8)}`
          }
        : chat
    ));
  }, []);

  const updateMessage = useCallback((chatId: string, messageId: string, updates: Partial<ScribeMessage>) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? {
            ...chat,
            messages: chat.messages.map(msg => 
              msg.id === messageId ? { ...msg, ...updates } : msg
            ),
            updatedAt: new Date()
          }
        : chat
    ));
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    setChats(prev => prev.filter(chat => chat.id !== chatId));
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      setCurrentChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  }, [chats, currentChatId]);

  const switchToChat = useCallback((chatId: string) => {
    // Only switch if the chat exists
    setCurrentChatId(prev => {
      return chats.some(c => c.id === chatId) ? chatId : prev;
    });
  }, [chats]);

  const clearAllChats = useCallback(() => {
    setChats([]);
    setCurrentChatId(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CURRENT_CHAT_KEY);
  }, []);

  // Get chats filtered by worker type
  const getChatsByWorker = useCallback((worker: WorkerType) => {
    return chats.filter(chat => chat.worker === worker);
  }, [chats]);

  // Get conversation history for API calls
  const getConversationHistory = useCallback((chatId: string): Array<{ role: 'user' | 'assistant'; content: string }> => {
    const chat = chats.find(c => c.id === chatId);
    if (!chat) return [] as Array<{ role: 'user' | 'assistant'; content: string }>;
    
    return chat.messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant' as const,
      content: msg.content
    }));
  }, [chats]);

  return {
    chats,
    currentChatId,
    isLoading,
    setIsLoading,
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
  };
};