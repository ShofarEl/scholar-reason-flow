import React from 'react';
import { Circle, AlertTriangle, X, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiStatus } from '@/types/chat';
import { getModelDisplayName } from '@/utils/aiRouting';

interface StatusIndicatorProps {
  apiStatus: ApiStatus;
  className?: string;
  showLabels?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  apiStatus,
  className,
  showLabels = true
}) => {
  const getStatusIcon = (status: 'online' | 'slow' | 'offline') => {
    switch (status) {
      case 'online':
        return <Circle className="h-3 w-3 fill-success text-success" />;
      case 'slow':
        return <Clock className="h-3 w-3 text-warning" />;
      case 'offline':
        return <X className="h-3 w-3 text-destructive" />;
      default:
        return <AlertTriangle className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getStatusText = (status: 'online' | 'slow' | 'offline') => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'slow':
        return 'Slow';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status: 'online' | 'slow' | 'offline') => {
    switch (status) {
      case 'online':
        return 'text-success';
      case 'slow':
        return 'text-warning';
      case 'offline':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      {Object.entries(apiStatus).map(([model, status]) => (
        <div key={model} className="flex items-center gap-2">
          {getStatusIcon(status)}
          {showLabels && (
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium">
                {getModelDisplayName(model as keyof ApiStatus)}
              </span>
              <span className={cn("text-xs", getStatusColor(status))}>
                {getStatusText(status)}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};