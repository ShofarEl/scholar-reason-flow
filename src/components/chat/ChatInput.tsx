import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileAttachment, AIModel } from '@/types/chat';
import { FileUploadArea } from './FileUploadArea';
import { ModelSelector } from './ModelSelector';
import { detectQueryType, routeToOptimalModel, getQueryTypeDescription } from '@/utils/aiRouting';

interface ChatInputProps {
  onSendMessage: (content: string, files: FileAttachment[], selectedModel: AIModel) => void;
  disabled?: boolean;
  currentModel: AIModel;
  onModelChange: (model: AIModel) => void;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  currentModel,
  onModelChange,
  placeholder = "Type your message..."
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 150; // Maximum height before scrolling
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!message.trim() && files.length === 0) return;
    if (disabled) return;

    // Determine the model to use
    let modelToUse = currentModel;
    if (currentModel === 'auto') {
      const queryType = detectQueryType(message, files.length > 0);
      modelToUse = routeToOptimalModel(queryType);
    }

    onSendMessage(message.trim(), files, modelToUse);
    setMessage('');
    setFiles([]);
    setShowFileUpload(false);
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage(prev => prev + (prev ? ' ' : '') + transcript);
      adjustTextareaHeight();
    };

    recognition.start();
  };

  // Get routing suggestion for current input
  const getRoutingSuggestion = () => {
    if (!message.trim() && files.length === 0) return null;
    if (currentModel !== 'auto') return null;
    
    const queryType = detectQueryType(message, files.length > 0);
    return getQueryTypeDescription(queryType);
  };

  const routingSuggestion = getRoutingSuggestion();
  const canSend = (message.trim() || files.length > 0) && !disabled;
  const charCount = message.length;
  const maxChars = 4000;

  return (
    <div className="space-y-2 p-2 md:p-4 border-t bg-background/95 backdrop-blur-sm">
      {/* File Upload Area */}
      {showFileUpload && (
        <FileUploadArea
          onFilesChange={setFiles}
          disabled={disabled}
        />
      )}

      {/* Routing Suggestion */}
      {routingSuggestion && (
        <div className="p-2 bg-accent/5 border border-accent/10 rounded-lg">
          <p className="text-xs text-accent font-medium">
            {routingSuggestion}
          </p>
        </div>
      )}

      {/* Main Input Area */}
      <div className="relative">
        {/* Model Selector - Compact Mobile */}
        <div className="absolute left-2 top-2 z-10 md:relative md:left-0 md:top-0 md:mb-2">
          <ModelSelector
            currentModel={currentModel}
            onModelChange={onModelChange}
            disabled={disabled}
            showDescription={false}
            compact={true}
          />
        </div>

        {/* Input Container with embedded controls */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "min-h-[48px] max-h-[120px] resize-none",
              "pl-12 md:pl-4 pr-32 md:pr-36",
              "border border-border/40 transition-all duration-200",
              "focus:border-primary/50 focus:shadow-glow rounded-2xl",
              "text-sm"
            )}
            rows={1}
          />
          
          {/* Right side controls */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* File Upload Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowFileUpload(!showFileUpload)}
              disabled={disabled}
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted/50",
                showFileUpload && "bg-primary/10 text-primary"
              )}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>

            {/* Voice Input Button */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoiceInput}
              disabled={disabled}
              className={cn(
                "h-8 w-8 p-0 hover:bg-muted/50",
                isListening && "bg-destructive/10 text-destructive"
              )}
            >
              {isListening ? (
                <MicOff className="h-3.5 w-3.5" />
              ) : (
                <Mic className="h-3.5 w-3.5" />
              )}
            </Button>

            {/* Send Button */}
            <Button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              size="sm"
              className={cn(
                "h-8 w-8 p-0 rounded-full",
                "bg-gradient-primary hover:shadow-glow",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Character Counter */}
          <div className="absolute bottom-1 right-32 md:right-36 text-xs text-muted-foreground/60">
            <span className={cn(
              charCount > maxChars * 0.9 && "text-warning",
              charCount > maxChars && "text-destructive"
            )}>
              {charCount > 100 ? `${charCount}/${maxChars}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Input Help Text - Hidden on mobile */}
      <div className="hidden md:flex justify-between items-center text-xs text-muted-foreground">
        <span>
          Press Enter to send, Shift+Enter for new line
        </span>
        {files.length > 0 && (
          <span>
            {files.length} file{files.length !== 1 ? 's' : ''} attached
          </span>
        )}
      </div>

      {/* File count for mobile */}
      {files.length > 0 && (
        <div className="md:hidden text-xs text-muted-foreground text-center">
          {files.length} file{files.length !== 1 ? 's' : ''} attached
        </div>
      )}
    </div>
  );
};