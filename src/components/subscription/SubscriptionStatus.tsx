import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Zap, 
  MessageSquare, 
  FileText, 
  Settings,
  AlertCircle,
  RefreshCw,
  Bug
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { PaymentService } from '@/services/paymentService';

interface SubscriptionStatusProps {
  variant?: 'compact' | 'detailed';
  showUpgradeButton?: boolean;
  showDebugInfo?: boolean;
}

export const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({
  variant = 'compact',
  showUpgradeButton = true,
  showDebugInfo = false
}) => {
  const { 
    subscription, 
    getRemainingAIMessages, 
    getRemainingHumanizerWords,
    hasActiveSubscription,
    hasPremiumPlan,
    refreshSubscription
  } = useSubscription();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [remainingAIMessages, setRemainingAIMessages] = React.useState<number>(0);
  const [remainingHumanizerWords, setRemainingHumanizerWords] = React.useState<number>(0);
  const [debugInfo, setDebugInfo] = React.useState<any>(null);
  const [showDebug, setShowDebug] = React.useState(showDebugInfo);

  // Load remaining counts asynchronously
  React.useEffect(() => {
    const loadRemainingCounts = async () => {
      try {
        const aiMessages = await getRemainingAIMessages();
        const humanizerWords = await getRemainingHumanizerWords();
        setRemainingAIMessages(aiMessages);
        setRemainingHumanizerWords(humanizerWords);
      } catch (error) {
        console.error('Failed to load remaining counts:', error);
      }
    };

    if (hasActiveSubscription()) {
      loadRemainingCounts();
    }
  }, [subscription, getRemainingAIMessages, getRemainingHumanizerWords, hasActiveSubscription]);

  const loadDebugInfo = async () => {
    try {
      const debug = {
        user: {
          id: user?.id,
          email: user?.email,
          authenticated: !!user
        },
        subscription: subscription,
        hasActiveSubscription: hasActiveSubscription(),
        hasPremiumPlan: hasPremiumPlan(),
        remainingAI: await getRemainingAIMessages(),
        remainingHumanizer: await getRemainingHumanizerWords(),
        canUseAI: await PaymentService.canUseAI(),
        canUseHumanizer: await PaymentService.canUseHumanizer(),
        trialTokens: await PaymentService.getRemainingTrialTokens()
      };
      setDebugInfo(debug);
    } catch (error) {
      console.error('Failed to load debug info:', error);
      setDebugInfo({ error: error.message });
    }
  };

  if (!hasActiveSubscription()) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 shadow-sm">
          <div className="flex items-center">
            <AlertCircle className="h-4 w-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">No active subscription</span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={refreshSubscription}
              className="text-yellow-700 border-yellow-300 hover:bg-yellow-100"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            {showUpgradeButton && (
              <Button 
                size="sm" 
                onClick={() => navigate('/subscription')}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Subscribe
              </Button>
            )}
          </div>
        </div>

        {/* Debug Section */}
        {showDebug && (
          <div className="p-4 bg-gray-50 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-900">Debug Information</h4>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadDebugInfo}
                className="h-6 px-2 text-xs"
              >
                <Bug className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            {debugInfo ? (
              <pre className="text-xs text-gray-600 overflow-auto max-h-40">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={loadDebugInfo}
                className="w-full h-8 text-xs"
              >
                <Bug className="h-3 w-3 mr-1" />
                Load Debug Info
              </Button>
            )}
          </div>
        )}

        {/* Debug Toggle */}
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={() => setShowDebug(!showDebug)}
          className="w-full h-8 text-xs text-gray-500"
        >
          <Bug className="h-3 w-3 mr-1" />
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </Button>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 shadow-sm">
        <div className="flex items-center space-x-2">
          {hasPremiumPlan() ? (
            <Crown className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          ) : (
            <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          )}
          <span className="text-sm font-medium text-green-800 dark:text-green-200">
            {subscription?.plan === 'basic' ? 'Basic' : 'Premium'}
          </span>
          <Badge variant="outline" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700 px-3 py-1 font-medium">
            {remainingAIMessages} AI left
          </Badge>
          {hasPremiumPlan() && (
            <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700 px-3 py-1 font-medium">
              {remainingHumanizerWords.toLocaleString()} words left
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Button 
            size="sm" 
            variant="ghost"
            onClick={refreshSubscription}
            className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
            title="Refresh subscription status"
          >
            <RefreshCw className="h-3 w-3" />
          </Button>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => navigate('/subscription')}
            className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasPremiumPlan() ? (
            <Crown className="h-5 w-5 text-yellow-500" />
          ) : (
            <Zap className="h-5 w-5 text-blue-500" />
          )}
          <span className="font-medium">
            {subscription?.plan === 'basic' ? 'Basic Plan' : 'Premium Plan'}
          </span>
          <Badge variant="default" className="text-xs px-3 py-1 font-medium bg-green-600 hover:bg-green-700">
            Active
          </Badge>
        </div>
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => navigate('/subscription')}
        >
          Manage
        </Button>
      </div>

      {/* AI Messages Usage */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center">
            <MessageSquare className="h-4 w-4 text-blue-500 mr-1" />
            <span>AI Messages</span>
          </div>
          <span className="text-gray-600">
            {subscription?.plan === 'basic' ? 100 - remainingAIMessages : 500 - remainingAIMessages} / {subscription?.plan === 'basic' ? 100 : 500}
          </span>
        </div>
        <Progress 
          value={subscription?.plan === 'basic' 
            ? ((100 - remainingAIMessages) / 100) * 100 
            : ((500 - remainingAIMessages) / 500) * 100
          } 
          className="h-3 bg-gray-200 dark:bg-gray-700" 
        />
        <div className="text-xs text-gray-500">
          {remainingAIMessages} messages remaining today
        </div>
      </div>

      {/* Humanizer Usage (Premium only) */}
      {hasPremiumPlan() && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <FileText className="h-4 w-4 text-green-500 mr-1" />
              <span>Humanizer Words</span>
            </div>
            <span className="text-gray-600">
              {10000 - remainingHumanizerWords} / 10,000
            </span>
          </div>
          <Progress 
            value={((10000 - remainingHumanizerWords) / 10000) * 100} 
            className="h-3 bg-gray-200 dark:bg-gray-700" 
          />
          <div className="text-xs text-gray-500">
            {remainingHumanizerWords.toLocaleString()} words remaining
          </div>
        </div>
      )}

      {/* Upgrade prompt for Basic users */}
      {!hasPremiumPlan() && showUpgradeButton && (
        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <Button 
            size="default" 
            onClick={() => navigate('/subscription')}
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium py-2 px-4 shadow-sm"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </div>
      )}
    </div>
  );
};
