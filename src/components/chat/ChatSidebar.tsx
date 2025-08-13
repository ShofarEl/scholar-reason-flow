import React from 'react';
import { Plus, MessageSquare, Trash2, Edit3, X } from 'lucide-react';
import { Chat } from '@/types/chat';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  chats: Chat[];
  currentChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  isMobile?: boolean;
  onClose?: () => void;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  currentChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isMobile = false,
  onClose
}) => {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={cn(
      "bg-muted/10 backdrop-blur-sm border-r border-border/20 flex flex-col h-full",
      isMobile ? "w-80" : "w-80"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-border/20 flex items-center justify-between">
        <Button 
          onClick={onNewChat}
          className="flex-1 justify-start gap-3 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
        {isMobile && onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="ml-2 hover:bg-muted/50"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative rounded-lg p-3 cursor-pointer transition-all duration-200",
                "hover:bg-muted/40",
                currentChatId === chat.id 
                  ? "bg-primary/10 border border-primary/20" 
                  : "hover:bg-muted/20"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                  currentChatId === chat.id 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  <MessageSquare className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-sm leading-tight truncate transition-colors",
                    currentChatId === chat.id 
                      ? "text-primary" 
                      : "text-foreground group-hover:text-primary"
                  )}>
                    {chat.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(chat.updatedAt)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {chat.messages.length} messages
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteChat(chat.id);
                  }}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border/20">
        <div className="text-xs text-muted-foreground text-center">
          ScribeAI Academic Assistant
        </div>
      </div>
    </div>
  );
};