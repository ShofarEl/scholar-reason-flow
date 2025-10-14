import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Paperclip, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FileAttachment, AIModel } from '@/types/chat';
import { FileUploadArea } from './FileUploadArea';
import { ModelSelector } from './ModelSelector';
import { detectQueryType, routeToOptimalModel, getQueryTypeDescription } from '@/utils/aiRouting';
import { useToast } from '@/hooks/use-toast';

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
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, []);

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
    // Check for Speech Recognition API support (both standard and webkit)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast({
        title: "Voice input not supported",
        description: "Speech recognition is not available in your browser. Please try typing your message instead.",
        variant: "destructive"
      });
      return;
    }

    // If already listening, stop recognition
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      // Enhanced configuration for mobile devices
    recognition.continuous = false;
      recognition.interimResults = true; // Enable interim results for better UX
      recognition.maxAlternatives = 1;
      
      // Better language detection - try to use browser language or fallback
      const userLang = navigator.language || navigator.languages?.[0] || 'en-US';
      recognition.lang = userLang;

      let finalTranscript = '';
      let interimTranscript = '';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak now and we'll convert your speech to text.",
          duration: 2000
        });
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        recognitionRef.current = null;
        
        // Handle specific error types with user-friendly messages
        switch (event.error) {
          case 'not-allowed':
          case 'permission-denied':
            toast({
              title: "Microphone permission required",
              description: "Please allow microphone access in your browser settings to use voice input.",
              variant: "destructive"
            });
            break;
          case 'no-speech':
            toast({
              title: "No speech detected",
              description: "We couldn't hear anything. Please try speaking again or check your microphone.",
              variant: "destructive"
            });
            break;
          case 'audio-capture':
            toast({
              title: "Microphone not found",
              description: "No microphone detected. Please connect a microphone and try again.",
              variant: "destructive"
            });
            break;
          case 'network':
            toast({
              title: "Network error",
              description: "Speech recognition requires an internet connection. Please check your connection.",
              variant: "destructive"
            });
            break;
          case 'service-not-allowed':
            toast({
              title: "Service not available",
              description: "Speech recognition service is not available. Please try again later.",
              variant: "destructive"
            });
            break;
          default:
            toast({
              title: "Voice input error",
              description: "Something went wrong with voice recognition. Please try again.",
              variant: "destructive"
            });
        }
      };
    
    recognition.onresult = (event: any) => {
        interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update message with final transcript
        if (finalTranscript) {
          setMessage(prev => {
            const newMessage = prev + (prev ? ' ' : '') + finalTranscript;
            return newMessage;
          });
      adjustTextareaHeight();
          finalTranscript = '';
        }
    };

      // Start recognition
    recognition.start();
      
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
      toast({
        title: "Voice input failed",
        description: "Unable to start speech recognition. Please check your microphone and try again.",
        variant: "destructive"
      });
    }
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
    <div className="space-y-2 p-2 md:p-4 border-t bg-background/95 backdrop-blur-sm md:relative fixed bottom-0 left-0 right-0 z-30 md:z-auto md:border-t-border border-t-border/60">
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
              "border-2 border-border bg-background text-foreground transition-all duration-200",
              "focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl",
              "text-sm placeholder:text-muted-foreground"
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
                "h-8 w-8 p-0 hover:bg-muted/50 transition-all duration-200",
                isListening && "bg-red-100 text-red-600 animate-pulse border-2 border-red-300 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
              )}
              title={isListening ? "Listening... (tap to stop)" : "Start voice input"}
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