import React from 'react';
import { ChevronDown, Brain, Zap, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AIModel } from '@/types/chat';
import { getModelDisplayName, getModelDescription } from '@/utils/aiRouting';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface ModelSelectorProps {
  currentModel: AIModel;
  onModelChange: (model: AIModel) => void;
  disabled?: boolean;
  showDescription?: boolean;
  compact?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  currentModel,
  onModelChange,
  disabled = false,
  showDescription = true,
  compact = false
}) => {
  const getModelIcon = (model: AIModel) => {
    switch (model) {
      case 'scholar-mind':
        return <Sparkles className="h-4 w-4 text-scholar-mind" />;
      case 'reason-core':
        return <Brain className="h-4 w-4 text-reason-core" />;
      case 'auto':
        return <Zap className="h-4 w-4 text-accent" />;
      default:
        return <Sparkles className="h-4 w-4" />;
    }
  };

  const getModelGradient = (model: AIModel) => {
    switch (model) {
      case 'scholar-mind':
        return 'bg-gradient-scholar';
      case 'reason-core':
        return 'bg-gradient-reason';
      case 'auto':
        return 'bg-gradient-primary';
      default:
        return 'bg-gradient-primary';
    }
  };

  const models: { value: AIModel; label: string; description: string }[] = [
    {
      value: 'auto',
      label: 'Auto-Select',
      description: 'Automatically chooses the best AI for your query'
    },
    {
      value: 'scholar-mind',
      label: 'ScribeMaster',
      description: 'Academic writing specialist for essays, research, literature, and scholarly analysis'
    },
    {
      value: 'reason-core',
      label: 'Lightning Thinq',
      description: 'STEM expert for mathematics, coding, physics, and computational problems'
    }
  ];

  return (
    <div className={cn("space-y-2", compact && "space-y-1")}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "justify-between transition-all duration-300",
              compact 
                ? "h-7 w-7 p-0 rounded-full border border-border/40 hover:bg-muted/50"
                : "w-full h-auto p-3 border-2 hover:shadow-soft hover:border-primary/30"
            )}
          >
            {compact ? (
              <div className={cn(
                "p-1 rounded-full",
                getModelGradient(currentModel)
              )}>
                {getModelIcon(currentModel)}
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <div className={cn(
                    "p-1.5 rounded-full",
                    getModelGradient(currentModel)
                  )}>
                    {getModelIcon(currentModel)}
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-sm">
                      {getModelDisplayName(currentModel)}
                    </div>
                    {showDescription && (
                      <div className="text-xs text-muted-foreground">
                        {getModelDescription(currentModel)}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className={cn(
            "p-1 bg-background border shadow-medium z-50",
            compact ? "w-64" : "w-80"
          )}
          align={compact ? "center" : "start"}
        >
          {models.map((model) => (
            <DropdownMenuItem
              key={model.value}
              onClick={() => onModelChange(model.value)}
              className={cn(
                "p-3 cursor-pointer transition-all duration-200",
                "hover:bg-accent/10 focus:bg-accent/10",
                currentModel === model.value && "bg-primary/5 border-l-2 border-primary"
              )}
            >
              <div className="flex items-start space-x-3 w-full">
                <div className={cn(
                  "p-1.5 rounded-full mt-0.5",
                  getModelGradient(model.value)
                )}>
                  {getModelIcon(model.value)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm flex items-center justify-between">
                    {model.label}
                    {currentModel === model.value && (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse-gentle" />
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground leading-relaxed">
                    {model.description}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {currentModel === 'auto' && !compact && (
        <div className="p-3 bg-accent/5 border border-accent/20 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <Zap className="h-4 w-4 text-accent" />
            <span className="font-medium text-accent">Smart Routing Active</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            The system will analyze your query and choose the optimal AI model automatically.
          </p>
        </div>
      )}
    </div>
  );
};