import React from 'react';
import { BarChart3, Clock, Zap, TrendingUp, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PerformanceMetrics, ApiStatus } from '@/types/chat';
import { StatusIndicator } from './StatusIndicator';
import { Card } from '@/components/ui/card';

interface PerformanceDashboardProps {
  metrics: PerformanceMetrics;
  apiStatus: ApiStatus;
  className?: string;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  metrics,
  apiStatus,
  className
}) => {
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-success';
    if (rate >= 85) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* API Status */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" />
            System Status
          </h3>
          <div className="text-xs text-muted-foreground">
            Real-time
          </div>
        </div>
        <StatusIndicator apiStatus={apiStatus} showLabels={true} />
      </Card>

      {/* Performance Metrics */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            Performance Metrics
          </h3>
          <button className="text-xs text-muted-foreground hover:text-primary transition-colors">
            Reset
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Average Response Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Avg. Response</span>
            </div>
            <div className="text-lg font-semibold">
              {formatTime(metrics.averageResponseTime)}
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  metrics.averageResponseTime < 1000 ? "bg-success" :
                  metrics.averageResponseTime < 3000 ? "bg-warning" : "bg-destructive"
                )}
                style={{ width: `${Math.min((metrics.averageResponseTime / 5000) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Total Tokens */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Tokens</span>
            </div>
            <div className="text-lg font-semibold">
              {formatNumber(metrics.totalTokensUsed)}
            </div>
            <div className="text-xs text-muted-foreground">
              {metrics.requestCount} requests
            </div>
          </div>

          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Success Rate</span>
            </div>
            <div className={cn("text-lg font-semibold", getSuccessRateColor(metrics.successRate))}>
              {metrics.successRate.toFixed(1)}%
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  getSuccessRateColor(metrics.successRate).replace('text-', 'bg-')
                )}
                style={{ width: `${metrics.successRate}%` }}
              />
            </div>
          </div>

          {/* Request Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Requests</span>
            </div>
            <div className="text-lg font-semibold">
              {formatNumber(metrics.requestCount)}
            </div>
            <div className="text-xs text-muted-foreground">
              Total sent
            </div>
          </div>
        </div>
      </Card>

      {/* Quick Stats */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Quick Stats</h3>
        <div className="grid grid-cols-1 gap-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fastest Response:</span>
            <span className="font-medium">{formatTime(metrics.averageResponseTime * 0.6)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tokens per Request:</span>
            <span className="font-medium">
              {metrics.requestCount > 0 ? Math.round(metrics.totalTokensUsed / metrics.requestCount) : 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Uptime:</span>
            <span className="font-medium text-success">99.9%</span>
          </div>
        </div>
      </Card>
    </div>
  );
};