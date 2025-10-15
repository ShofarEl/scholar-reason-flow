import React, { useState, useEffect } from 'react';
import { Brain, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIModel } from '@/types/chat';
import { getModelDisplayName } from '@/utils/aiRouting';

interface TypingIndicatorProps {
  activeModel?: AIModel;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  activeModel,
  className
}) => {
  const [currentStage, setCurrentStage] = useState(0);

  const progressiveStages = [
    { text: 'Thinking...', color: 'bg-blue-500' },
    { text: 'Gathering resources...', color: 'bg-purple-500' },
    { text: 'Analyzing context...', color: 'bg-green-500' },
    { text: 'Crafting response...', color: 'bg-orange-500' },
    { text: 'Finalizing...', color: 'bg-pink-500' }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStage((prev) => (prev + 1) % progressiveStages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getModelIcon = () => {
    switch (activeModel) {
      case 'scholar-mind':
        return <Sparkles className="h-3 w-3 text-white" />;
      case 'reason-core':
        return <Brain className="h-3 w-3 text-white" />;
      default:
        return <Sparkles className="h-3 w-3 text-white" />;
    }
  };

  const currentStageData = progressiveStages[currentStage];

  return (
    <div className={cn("flex gap-3 mb-6 animate-fade-in", className)}>
      {/* AI Avatar with Progressive Color */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full overflow-hidden flex items-center justify-center transition-all duration-1000",
        currentStageData.color
      )}>
        <img
          src="/AI.png"
          alt="AI"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Typing Content */}
      <div className="flex-1">

        {/* Progressive Loading Indicator */}
        <div className="bg-chat-bubble-ai border-0 rounded-2xl px-4 py-3 shadow-soft max-w-fit">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse transition-all duration-1000",
              currentStageData.color
            )}></div>
            <span className="text-sm text-muted-foreground font-medium">
              {currentStageData.text}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};