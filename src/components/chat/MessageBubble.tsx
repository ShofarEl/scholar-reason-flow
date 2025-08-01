import React from 'react';
import { Copy, RotateCcw, Clock, Zap, Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types/chat';
import { getModelDisplayName } from '@/utils/aiRouting';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { MarkdownRenderer } from './MarkdownRenderer';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: (messageId: string) => void;
  onSwitchModel?: (messageId: string) => void;
  showActions?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  message,
  onRegenerate,
  onSwitchModel,
  showActions = true
}) => {
  const isUser = message.sender === 'user';
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      toast({
        title: "Copied to clipboard",
        description: "Message content copied successfully"
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const getAIModelIcon = () => {
    switch (message.aiModel) {
      case 'scholar-mind':
        return <Sparkles className="h-3 w-3 text-scholar-mind" />;
      case 'reason-core':
        return <Brain className="h-3 w-3 text-reason-core" />;
      default:
        return <Zap className="h-3 w-3 text-accent" />;
    }
  };

  const formatResponseTime = (time: number) => {
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(1)}s`;
  };

  return (
    <div className={cn(
      "group flex gap-2 md:gap-3 mb-4 md:mb-6 animate-fade-in px-2 md:px-0",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center",
        isUser ? "bg-gradient-primary text-white" : "bg-gradient-card border border-border/20"
      )}>
        {isUser ? (
          <span className="text-xs md:text-sm font-medium">U</span>
        ) : (
          getAIModelIcon()
        )}
      </div>

      {/* Message Content */}
      <div className={cn(
        "flex-1 max-w-[85%] md:max-w-[80%]",
        isUser ? "text-right" : "text-left"
      )}>
        {/* Message Header */}
        {!isUser && message.aiModel && (
          <div className="flex items-center gap-1 md:gap-2 mb-1 md:mb-2">
            <span className="text-xs font-medium text-muted-foreground">
              {getModelDisplayName(message.aiModel)}
            </span>
            {message.responseTime && (
              <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatResponseTime(message.responseTime)}
              </div>
            )}
            {message.tokensUsed && (
              <span className="hidden md:inline text-xs text-muted-foreground">
                {message.tokensUsed} tokens
              </span>
            )}
          </div>
        )}

        {/* Message Bubble - Borderless Design */}
        <div className={cn(
          "relative px-3 md:px-4 py-2 md:py-3 rounded-2xl transition-all duration-200",
          isUser 
            ? "bg-gradient-primary text-white ml-auto shadow-sm hover:shadow-md" 
            : "bg-background text-foreground shadow-none hover:bg-muted/30"
        )}>
          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-3 space-y-2">
              {message.attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg",
                    isUser ? "bg-white/10" : "bg-muted/50"
                  )}
                >
                  {attachment.preview ? (
                    <img
                      src={attachment.preview}
                      alt={attachment.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <span className="text-xs">📄</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isUser ? "text-white" : "text-foreground"
                    )}>
                      {attachment.name}
                    </p>
                    <p className={cn(
                      "text-xs",
                      isUser ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Message Text */}
          <div className="break-words">
            {isUser ? (
              <div className={cn(
                "whitespace-pre-wrap break-words text-white"
              )}>
                {message.content}
              </div>
            ) : (
              <MarkdownRenderer content={message.content} isUser={isUser} />
            )}
          </div>

          {/* Message Actions - Borderless Design */}
          {showActions && !isUser && (
            <div className={cn(
              "flex items-center gap-2 mt-3 pt-2",
              "opacity-0 group-hover:opacity-100 transition-opacity"
            )}>
              <Button
                size="sm"
                variant="ghost"
                onClick={copyToClipboard}
                className="h-7 px-2 text-xs hover:bg-muted/50 text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
              
              {onRegenerate && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onRegenerate(message.id)}
                  className="h-7 px-2 text-xs hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
              
              {onSwitchModel && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onSwitchModel(message.id)}
                  className="h-7 px-2 text-xs hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                >
                  {message.aiModel === 'scholar-mind' ? (
                    <Brain className="h-3 w-3 mr-1" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Switch
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className={cn(
          "text-xs text-muted-foreground mt-1",
          isUser ? "text-right" : "text-left"
        )}>
          {message.timestamp.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </div>
      </div>
    </div>
  );
});