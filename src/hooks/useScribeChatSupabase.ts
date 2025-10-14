import { useState, useCallback, useEffect, useRef } from 'react';
import { ScribeChat, ScribeMessage, WorkerType } from '@/types/scribe';
import { ChatService } from '@/services/chatService';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'scribe-ai-chats';
const CURRENT_CHAT_KEY = 'scribe-ai-current-chat';
const MIGRATION_KEY = 'scribe-ai-migrated-to-supabase';

export const useScribeChatSupabase = () => {
  const [chats, setChats] = useState<ScribeChat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  // Use refs to track loading state and prevent multiple simultaneous loads
  const isLoadingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);

  // Load chats function - extracted to prevent recreating on every render
  const loadChats = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      console.log('⚠️ Load already in progress, skipping');
      return;
    }

    // Check if we need to reload (user changed or first load)
    const currentUserId = user?.id || null;
    if (hasInitializedRef.current && lastUserIdRef.current === currentUserId) {
      console.log('⚠️ Already loaded for this user, skipping');
      return;
    }

    console.log('🔄 Starting chat loading process...');
    isLoadingRef.current = true;
    setIsLoading(true);

    try {
      if (isAuthenticated && user) {
        console.log('🔄 Loading chats from Supabase for authenticated user');
        
        // Test database connection first
        const connectionTest = await ChatService.testConnection();
        if (!connectionTest) {
          console.error('❌ Database connection test failed, falling back to localStorage');
          await loadFromLocalStorage();
          return;
        }
        
        // Check migration
        const hasMigrated = localStorage.getItem(MIGRATION_KEY);
        if (!hasMigrated) {
          await handleMigration();
        }

        // Load chats from Supabase
        const supabaseChats = await ChatService.getChats();
        console.log(`📥 Loaded ${supabaseChats.length} chats from Supabase`);
        
        // Update state
        setChats(supabaseChats);
        
        // Set current chat
        const savedCurrentChat = localStorage.getItem(CURRENT_CHAT_KEY);
        if (savedCurrentChat && supabaseChats.find(chat => chat.id === savedCurrentChat)) {
          setCurrentChatId(savedCurrentChat);
        } else if (supabaseChats.length > 0) {
          setCurrentChatId(supabaseChats[0].id);
        } else {
          setCurrentChatId(null);
        }
        
      } else {
        console.log('👤 User not authenticated, loading from localStorage');
        await loadFromLocalStorage();
      }

      // Mark as initialized for this user
      hasInitializedRef.current = true;
      lastUserIdRef.current = currentUserId;
      
    } catch (error) {
      console.error('Error loading chats:', error);
      await loadFromLocalStorage();
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
      console.log('✅ Chat loading process completed');
    }
  }, [isAuthenticated, user]);

  // Handle migration
  const handleMigration = async () => {
    const savedChats = localStorage.getItem(STORAGE_KEY);
    if (savedChats) {
      try {
        const localStorageChats = JSON.parse(savedChats)
          .map((chat: any) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages
              .map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
              .filter((msg: any) => msg.worker !== 'batch')
          }))
          .filter((chat: any) => chat.worker !== 'batch');

        if (localStorageChats.length > 0) {
          console.log(`🔄 Found ${localStorageChats.length} chats in localStorage, starting migration`);
          setIsMigrating(true);
          
          const migrationSuccess = await ChatService.migrateFromLocalStorage(localStorageChats);
          
          if (migrationSuccess) {
            localStorage.setItem(MIGRATION_KEY, 'true');
            console.log('✅ Migration completed');
          } else {
            console.error('❌ Migration failed');
          }
          
          setIsMigrating(false);
        }
      } catch (parseError) {
        console.error('Failed to parse localStorage chats:', parseError);
      }
    }
  };

  // Load from localStorage
  const loadFromLocalStorage = async () => {
    try {
      const savedChats = localStorage.getItem(STORAGE_KEY);
      const savedCurrentChat = localStorage.getItem(CURRENT_CHAT_KEY);
      
      if (savedChats) {
        const parsedChats = JSON.parse(savedChats)
          .map((chat: any) => ({
            ...chat,
            createdAt: new Date(chat.createdAt),
            updatedAt: new Date(chat.updatedAt),
            messages: chat.messages
              .map((msg: any) => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
              }))
              .filter((msg: any) => msg.worker !== 'batch')
          }))
          .filter((chat: any) => chat.worker !== 'batch')
          .sort((a: any, b: any) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
        
        setChats(parsedChats);
        
        if (savedCurrentChat && parsedChats.find((c: any) => c.id === savedCurrentChat)) {
          setCurrentChatId(savedCurrentChat);
        } else if (parsedChats.length > 0) {
          setCurrentChatId(parsedChats[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load chats from localStorage:', error);
      setChats([]);
      setCurrentChatId(null);
    }
  };

  // Load chats when component mounts or auth changes
  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Reset when user logs out
  useEffect(() => {
    if (!isAuthenticated && !user) {
      hasInitializedRef.current = false;
      lastUserIdRef.current = null;
      setChats([]);
      setCurrentChatId(null);
    }
  }, [isAuthenticated, user]);

  // Save current chat ID to localStorage
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem(CURRENT_CHAT_KEY, currentChatId);
    } else {
      localStorage.removeItem(CURRENT_CHAT_KEY);
    }
  }, [currentChatId]);

  // Create a new chat
  const createNewChat = useCallback(async (worker: WorkerType, firstMessage?: ScribeMessage): Promise<string> => {
    const safeFirst = (firstMessage?.content || '').trim();
    const baseTitle = safeFirst ? safeFirst.slice(0, 50) + (safeFirst.length > 50 ? '...' : '') : `New ${worker} chat`;
    
    console.log(`🆕 Creating new chat: ${baseTitle} with worker: ${worker}`);
    
    if (isAuthenticated && user) {
      try {
        const chatId = await ChatService.createChat(baseTitle, worker, firstMessage);
        if (chatId) {
          console.log(`✅ Created Supabase chat with ID: ${chatId}`);
          
          const createdChat = await ChatService.getChat(chatId);
          if (createdChat) {
            setChats(prev => [createdChat, ...prev]);
            setCurrentChatId(chatId);
            return chatId;
          }
        }
      } catch (error) {
        console.error('❌ Error creating chat in Supabase:', error);
      }
    }
    
    // Fallback to localStorage
    const newChat: ScribeChat = {
      id: crypto.randomUUID(),
      title: baseTitle,
      messages: firstMessage ? [firstMessage] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      worker
    };

    setChats(prev => {
      const updated = [newChat, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
      return updated;
    });
    
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, [isAuthenticated, user]);

  // Get current chat
  const getCurrentChat = useCallback((): ScribeChat | null => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  // Add message to chat
  const addMessageToChat = useCallback(async (chatId: string, message: ScribeMessage) => {
    console.log(`📝 Adding message to chat ${chatId}`);
    
    // Update local state immediately
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              messages: [...chat.messages, message],
              updatedAt: new Date(),
              title: (chat.messages.length === 0 && message.sender === 'user' && chat.title.includes('New '))
                ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                : chat.title
            }
          : chat
      );
      
      const sortedChats = updatedChats.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedChats));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
      
      return sortedChats;
    });
    
    // Save to Supabase if authenticated (don't await to avoid blocking UI)
    if (isAuthenticated && user) {
      ChatService.addMessageToChat(chatId, message).catch(error => {
        console.error('❌ Failed to save message to Supabase:', error);
      });
    }
  }, [isAuthenticated, user]);

  // Update message
  const updateMessage = useCallback(async (chatId: string, messageId: string, updates: Partial<ScribeMessage>) => {
    console.log(`📝 Updating message ${messageId} in chat ${chatId}:`, updates);
    
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => 
        chat.id === chatId 
          ? {
              ...chat,
              messages: chat.messages.map(msg => 
                msg.id === messageId ? { ...msg, ...updates } : msg
              ),
              updatedAt: new Date()
            }
          : chat
      );
      
      // Debug: Log the updated message
      const updatedChat = updatedChats.find(chat => chat.id === chatId);
      const updatedMessage = updatedChat?.messages.find(msg => msg.id === messageId);
      console.log(`🔍 Updated message in local state:`, updatedMessage);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChats));
        console.log(`💾 Saved updated chats to localStorage`);
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
      
      return updatedChats;
    });
    
    // Save to Supabase if authenticated and return the result
    if (isAuthenticated && user) {
      console.log(`🔄 Saving message update to Supabase...`);
      try {
        const success = await ChatService.updateMessage(messageId, updates);
        if (success) {
          console.log(`✅ Message update saved to Supabase successfully`);
          return true;
        } else {
          console.error(`❌ Failed to save message update to Supabase`);
          return false;
        }
      } catch (error) {
        console.error(`❌ Failed to update message in Supabase:`, error);
        return false;
      }
    } else {
      console.log(`⚠️ Not authenticated, skipping Supabase update`);
      return true; // Return true for localStorage-only updates
    }
  }, [isAuthenticated, user]);

  // Get conversation history for API calls
  const getConversationHistory = useCallback((chatId: string) => {
    // Use the current chats state to avoid stale closure
    const currentChats = chats; // This will be the latest state
    const chat = currentChats.find(c => c.id === chatId);
    
    if (!chat) {
      console.log(`⚠️ No chat found for ID ${chatId} when getting conversation history`);
      console.log(`Available chat IDs: ${currentChats.map(c => c.id).join(', ')}`);
      return [];
    }
    
    console.log(`🔍 getConversationHistory: Found chat ${chatId} with ${chat.messages.length} total messages`);
    console.log(`🔍 All messages:`, chat.messages.map(m => `${m.sender}: ${m.content.slice(0, 30)}... (streaming: ${m.isStreaming})`));
    
    // Get all non-streaming messages and sort by timestamp
    const history = chat.messages
      .filter(msg => {
        const isStreaming = msg.isStreaming;
        const hasContent = msg.content.trim();
        const shouldInclude = !isStreaming && hasContent;
        
        if (!shouldInclude) {
          console.log(`🔍 Filtered out message: ${msg.sender} - streaming: ${isStreaming}, hasContent: ${hasContent}, content: "${msg.content.slice(0, 30)}..."`);
        } else {
          console.log(`✅ Including message: ${msg.sender} - streaming: ${isStreaming}, hasContent: ${hasContent}, content: "${msg.content.slice(0, 30)}..."`);
        }
        
        return shouldInclude;
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .map(msg => ({
        role: msg.sender as 'user' | 'assistant', // Map sender to role for API
        content: msg.content
      }));
      
    console.log(`📚 Retrieved conversation history for chat ${chatId}: ${history.length} messages`);
    console.log(`📚 Chat has ${chat.messages.length} total messages (including streaming)`);
    console.log(`📚 History messages:`, history.map(h => `${h.role}: ${h.content.slice(0, 50)}...`));
    return history;
  }, [chats]);

  // Delete a chat
  const deleteChat = useCallback(async (chatId: string) => {
    console.log(`🗑️ Deleting chat ${chatId}`);
    
    setChats(prevChats => {
      const updatedChats = prevChats.filter(chat => chat.id !== chatId);
      
      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedChats));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
      
      return updatedChats;
    });
    
    // Update current chat if needed
    if (currentChatId === chatId) {
      setChats(prevChats => {
        const newCurrentId = prevChats.length > 0 ? prevChats[0].id : null;
        setCurrentChatId(newCurrentId);
        return prevChats;
      });
    }
    
    // Delete from Supabase if authenticated
    if (isAuthenticated && user) {
      ChatService.deleteChat(chatId).catch(error => {
        console.error(`❌ Failed to delete chat from Supabase:`, error);
      });
    }
  }, [currentChatId, isAuthenticated, user]);

  // Switch to a chat
  const switchToChat = useCallback((chatId: string) => {
    console.log(`🔄 Switching to chat: ${chatId}`);
    setCurrentChatId(chatId);
  }, []);

  // Update chat
  const updateChat = useCallback(async (chatId: string, updates: Partial<ScribeChat>) => {
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => 
        chat.id === chatId 
          ? { ...chat, ...updates, updatedAt: new Date() }
          : chat
      );
      
      const sortedChats = updatedChats.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(sortedChats));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
      
      return sortedChats;
    });
    
    if (isAuthenticated && user) {
      ChatService.updateChat(chatId, updates).catch(error => {
        console.error(`❌ Failed to update chat in Supabase:`, error);
      });
    }
  }, [isAuthenticated, user]);

  // Clear all chats
  const clearAllChats = useCallback(async () => {
    console.log('🗑️ Clearing all chats');
    
    setChats([]);
    setCurrentChatId(null);
    
    // Clear localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CURRENT_CHAT_KEY);
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
    
    // Clear from Supabase if authenticated
    if (isAuthenticated && user) {
      ChatService.deleteAllChats().catch(error => {
        console.error('❌ Failed to clear chats from Supabase:', error);
      });
    }
  }, [isAuthenticated, user]);

  // Get chats by worker type
  const getChatsByWorker = useCallback((worker: WorkerType): ScribeChat[] => {
    return chats.filter(chat => chat.worker === worker);
  }, [chats]);

  // Refresh chats from database
  const refreshChats = useCallback(async () => {
    if (!isAuthenticated || !user || isLoadingRef.current) {
      return;
    }
    
    try {
      console.log('🔄 Refreshing chats from database...');
      const supabaseChats = await ChatService.getChats();
      
      const sortedChats = supabaseChats.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      
      setChats(sortedChats);
      
      // Ensure current chat still exists
      if (currentChatId && !sortedChats.find(c => c.id === currentChatId)) {
        const newCurrentId = sortedChats.length > 0 ? sortedChats[0].id : null;
        setCurrentChatId(newCurrentId);
      }
    } catch (error) {
      console.error('❌ Failed to refresh chats:', error);
    }
  }, [isAuthenticated, user, currentChatId]);

  return {
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
    refreshChats,
    isLoading,
    isMigrating
  };
};