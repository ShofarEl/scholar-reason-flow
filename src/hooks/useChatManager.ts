import { useState, useCallback, useEffect } from 'react';
import { Chat, Message } from '@/types/chat';

const STORAGE_KEY = 'scribe-ai-chats';
const CURRENT_CHAT_KEY = 'scribe-ai-current-chat';

export const useChatManager = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);

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
          messages: chat.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
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
      console.error('Failed to save current chat ID to localStorage:', error);
    }
  }, [currentChatId]);

  const createNewChat = useCallback((firstMessage?: Message): string => {
    const newChat: Chat = {
      id: crypto.randomUUID(),
      title: firstMessage?.content.slice(0, 50) + '...' || 'New Chat',
      messages: firstMessage ? [firstMessage] : [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    return newChat.id;
  }, []);

  const getCurrentChat = useCallback((): Chat | null => {
    if (!currentChatId) return null;
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  const updateChat = useCallback((chatId: string, updates: Partial<Chat>) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { ...chat, ...updates, updatedAt: new Date() }
        : chat
    ));
  }, []);

  const addMessageToChat = useCallback((chatId: string, message: Message) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId 
        ? { 
            ...chat, 
            messages: [...chat.messages, message],
            updatedAt: new Date(),
            // Update title if this is the first user message
            title: chat.messages.length === 0 && message.sender === 'user'
              ? message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
              : chat.title
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
    setCurrentChatId(chatId);
  }, []);

  return {
    chats,
    currentChatId,
    getCurrentChat,
    createNewChat,
    updateChat,
    addMessageToChat,
    deleteChat,
    switchToChat
  };
};