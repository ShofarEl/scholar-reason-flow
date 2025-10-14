import { supabase } from '@/integrations/supabase/client';
import { ScribeChat, ScribeMessage, WorkerType } from '@/types/scribe';

export class ChatService {
  // Get all chats for the current user
  static async getChats(): Promise<ScribeChat[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return [];
      }

      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_messages (
            id,
            role,
            content,
            timestamp,
            metadata
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        return [];
      }

      // Transform the data to match ScribeChat format
      const transformedChats = chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        worker: chat.worker_type as WorkerType,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at),
        messages: chat.chat_messages.map((msg: any) => ({
          id: msg.id,
          sender: msg.role as 'user' | 'assistant', // Map role to sender
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          worker: msg.metadata?.worker,
          isStreaming: msg.metadata?.isStreaming || false, // Default to false if not present
          isHumanized: msg.metadata?.isHumanized || false, // Default to false if not present
          metadata: msg.metadata || {}
        })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }));

      console.log(`📥 getChats: Loaded ${transformedChats.length} chats from database`);
      transformedChats.forEach((chat, index) => {
        console.log(`📥 Chat ${index + 1}: ${chat.title} with ${chat.messages.length} messages`);
        chat.messages.forEach((msg, msgIndex) => {
          console.log(`📥   Message ${msgIndex + 1}: ${msg.sender} - "${msg.content.slice(0, 50)}..." (length: ${msg.content.length})`);
          console.log(`📥   Message ${msgIndex + 1} raw data:`, {
            id: msg.id,
            sender: msg.sender,
            content: msg.content,
            contentLength: msg.content.length,
            isStreaming: msg.isStreaming,
            metadata: msg.metadata
          });
        });
      });

      return transformedChats;
    } catch (error) {
      console.error('Error in getChats:', error);
      return [];
    }
  }
// Create a new chat
static async createChat(title: string, worker: WorkerType, firstMessage?: ScribeMessage): Promise<string | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('No authenticated user found');
      return null;
    }

    console.log(`🆕 Creating chat: ${title} with worker: ${worker}`);

    // Create the chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        user_id: user.id,
        title,
        worker_type: worker
      })
      .select()
      .single();

    if (chatError || !chat) {
      console.error('Error creating chat:', chatError);
      return null;
    }

    console.log(`✅ Chat created with ID: ${chat.id}`);

    // Add first message if provided
    if (firstMessage) {
      console.log('➕ Adding first message to chat');
      const messageAdded = await this.addMessageToChat(chat.id, firstMessage);
      if (!messageAdded) {
        console.warn('⚠️ Failed to add first message, but chat was created');
      }
    }

    return chat.id;
  } catch (error) {
    console.error('Error in createChat:', error);
    return null;
  }
}

static async addMessageToChat(chatId: string, message: ScribeMessage): Promise<boolean> {
  try {
    console.log(`📝 Adding message to chat ${chatId}:`, {
      id: message.id,
      sender: message.sender,
      contentLength: message.content.length,
      worker: message.worker,
      isStreaming: message.isStreaming
    });

    console.log(`📝 Inserting message with ID: ${message.id}`);

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        id: message.id, // Use the provided message ID
        chat_id: chatId,
        role: message.sender, // Map sender to role
        content: message.content,
        timestamp: message.timestamp.toISOString(),
        metadata: {
          worker: message.worker,
          isStreaming: message.isStreaming,
          isHumanized: message.isHumanized,
          ...message.metadata
        }
      });

    if (error) {
      console.error('Error adding message to chat:', error);
      return false;
    }

    // Update the chat's updated_at timestamp
    const updateSuccess = await this.updateChat(chatId, { updatedAt: message.timestamp });
    if (!updateSuccess) {
      console.warn('⚠️ Message added but failed to update chat timestamp');
    }

    console.log(`✅ Message ${message.id} added to chat ${chatId}`);
    return true;
  } catch (error) {
    console.error('Error in addMessageToChat:', error);
    return false;
  }
}


  // Update a chat
  static async updateChat(chatId: string, updates: Partial<ScribeChat>): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.title !== undefined) updateData.title = updates.title;
      if (updates.worker !== undefined) updateData.worker_type = updates.worker;
      if (updates.updatedAt !== undefined) updateData.updated_at = updates.updatedAt.toISOString();

      const { error } = await supabase
        .from('chats')
        .update(updateData)
        .eq('id', chatId);

      if (error) {
        console.error('Error updating chat:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateChat:', error);
      return false;
    }
  }

  // Delete a chat
  static async deleteChat(chatId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (error) {
        console.error('Error deleting chat:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteChat:', error);
      return false;
    }
  }

  static async getChat(chatId: string): Promise<ScribeChat | null> {
    try {
      console.log(`🔍 Fetching chat: ${chatId}`);

      const { data: chat, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_messages (
            id,
            role,
            content,
            timestamp,
            metadata
          )
        `)
        .eq('id', chatId)
        .single();

      if (error || !chat) {
        console.error('Error fetching chat:', error);
        return null;
      }

      const transformedChat = {
        id: chat.id,
        title: chat.title,
        worker: chat.worker_type as WorkerType,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at),
        messages: (chat.chat_messages || [])
          .map((msg: any) => ({
            id: msg.id,
            sender: msg.role as 'user' | 'assistant', // Map role to sender
            content: msg.content || '',
            timestamp: new Date(msg.timestamp),
            worker: msg.metadata?.worker,
            isStreaming: msg.metadata?.isStreaming || false, // Default to false if not present
            isHumanized: msg.metadata?.isHumanized || false, // Default to false if not present
            metadata: msg.metadata || {}
          }))
          .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      };

      console.log(`✅ Fetched chat ${chatId} with ${transformedChat.messages.length} messages`);
      console.log(`🔍 Raw messages from DB:`, chat.chat_messages?.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        contentLength: msg.content?.length || 0,
        metadata: msg.metadata
      })));
      console.log(`🔍 Transformed messages:`, transformedChat.messages.map(msg => ({
        id: msg.id,
        sender: msg.sender,
        content: msg.content,
        contentLength: msg.content.length,
        isStreaming: msg.isStreaming
      })));
      return transformedChat;
    } catch (error) {
      console.error('Error in getChat:', error);
      return null;
    }
  }

  static async updateMessage(messageId: string, updates: Partial<ScribeMessage>): Promise<boolean> {
    try {
      console.log(`📝 ChatService: Updating message ${messageId}:`, updates);
      console.log(`📝 ChatService: Content length:`, updates.content?.length || 0);

      const updateData: any = {};
      
      if (updates.content !== undefined) {
        updateData.content = updates.content;
        console.log(`📝 ChatService: Setting content to: "${updates.content.slice(0, 50)}..."`);
      }
      if (updates.sender !== undefined) updateData.role = updates.sender; // Map sender to role
      if (updates.timestamp !== undefined) updateData.timestamp = updates.timestamp.toISOString();
      
      // Handle metadata updates - preserve existing metadata and merge with updates
      if (updates.worker !== undefined || updates.isStreaming !== undefined || updates.isHumanized !== undefined || updates.metadata !== undefined) {
        // First get existing metadata
        const { data: existingMessage } = await supabase
          .from('chat_messages')
          .select('metadata')
          .eq('id', messageId)
          .single();

        const existingMetadata = existingMessage?.metadata || {};
        
        updateData.metadata = {
          ...existingMetadata,
          ...(updates.worker !== undefined ? { worker: updates.worker } : {}),
          ...(updates.isStreaming !== undefined ? { isStreaming: updates.isStreaming } : {}),
          ...(updates.isHumanized !== undefined ? { isHumanized: updates.isHumanized } : {}),
          ...(updates.metadata || {})
        };
      }

      console.log(`📝 ChatService: Final update data:`, updateData);

      const { error } = await supabase
        .from('chat_messages')
        .update(updateData)
        .eq('id', messageId);

      if (error) {
        console.error('❌ ChatService: Error updating message:', error);
        return false;
      }

      console.log(`✅ ChatService: Message ${messageId} updated successfully`);
      console.log(`✅ ChatService: Update operation completed successfully`);
      
      return true;
    } catch (error) {
      console.error('❌ ChatService: Error in updateMessage:', error);
      return false;
    }
  }

  // Delete all chats for the current user
  static async deleteAllChats(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found');
        return false;
      }

      const { error } = await supabase
        .from('chats')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting all chats:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteAllChats:', error);
      return false;
    }
  }

  // Get chats by worker type
  static async getChatsByWorker(worker: WorkerType): Promise<ScribeChat[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        return [];
      }

      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_messages (
            id,
            role,
            content,
            timestamp,
            metadata
          )
        `)
        .eq('user_id', user.id)
        .eq('worker_type', worker)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats by worker:', error);
        return [];
      }

      return chats.map((chat: any) => ({
        id: chat.id,
        title: chat.title,
        worker: chat.worker_type as WorkerType,
        createdAt: new Date(chat.created_at),
        updatedAt: new Date(chat.updated_at),
        messages: chat.chat_messages.map((msg: any) => ({
          id: msg.id,
          sender: msg.role as 'user' | 'assistant', // Map role to sender
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          worker: msg.metadata?.worker,
          isStreaming: msg.metadata?.isStreaming || false, // Default to false if not present
          isHumanized: msg.metadata?.isHumanized || false, // Default to false if not present
          metadata: msg.metadata || {}
        })).sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }));
    } catch (error) {
      console.error('Error in getChatsByWorker:', error);
      return [];
    }
  }

  // Migrate chats from localStorage to Supabase
  static async migrateFromLocalStorage(localStorageChats: ScribeChat[]): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user found for migration');
        return false;
      }

      console.log(`🔄 Starting migration of ${localStorageChats.length} chats to Supabase`);

      for (const chat of localStorageChats) {
        // Create the chat
        const chatId = await this.createChat(chat.title, chat.worker, undefined);
        
        if (chatId) {
          // Add all messages to the chat
          for (const message of chat.messages) {
            await this.addMessageToChat(chatId, message);
          }
          console.log(`✅ Migrated chat: ${chat.title}`);
        } else {
          console.error(`❌ Failed to migrate chat: ${chat.title}`);
        }
      }

      console.log('🎉 Migration completed successfully');
      return true;
    } catch (error) {
      console.error('Error in migrateFromLocalStorage:', error);
      return false;
    }
  }

  // Test database connection and table existence
  static async testConnection(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found for connection test');
        return false;
      }

      // Test if chats table exists by trying to select from it
      const { data: chats, error: chatsError } = await supabase
        .from('chats')
        .select('id')
        .limit(1);

      if (chatsError) {
        console.error('Chats table test failed:', chatsError);
        return false;
      }

      // Test if chat_messages table exists by trying to select from it
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id')
        .limit(1);

      if (messagesError) {
        console.error('Chat messages table test failed:', messagesError);
        return false;
      }

      console.log('✅ Database connection and tables verified successfully');
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}
