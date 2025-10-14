import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Lock, Zap } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';

interface SubscriptionGuardProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
  requirePremium?: boolean;
  feature?: string;
  fallback?: React.ReactNode;
}

export const SubscriptionGuard: React.FC<SubscriptionGuardProps> = ({
  children,
  requireSubscription = false,
  requirePremium = false,
  feature,
  fallback
}) => {
  const { hasActiveSubscription, hasPremiumPlan, subscription } = useSubscription();
  const navigate = useNavigate();

  // If no subscription requirements, render children
  if (!requireSubscription && !requirePremium) {
    return <>{children}</>;
  }

  // Check if user has required subscription level
  const hasRequiredAccess = requirePremium 
    ? hasPremiumPlan() 
    : hasActiveSubscription();

  if (hasRequiredAccess) {
    return <>{children}</>;
  }

  // Custom fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // Default upgrade prompt
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          {requirePremium ? (
            <Crown className="h-12 w-12 text-yellow-500" />
          ) : (
            <Lock className="h-12 w-12 text-blue-500" />
          )}
        </div>
        <CardTitle className="text-xl">
          {requirePremium ? 'Premium Feature' : 'Subscription Required'}
        </CardTitle>
        <CardDescription>
          {feature 
            ? `${feature} requires ${requirePremium ? 'Premium' : 'an active'} subscription.`
            : `This feature requires ${requirePremium ? 'Premium' : 'an active'} subscription.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          {requirePremium ? (
            <p>Upgrade to Premium to access advanced features including the humanizer with 10,000 word limit.</p>
          ) : (
            <p>Subscribe to unlock all ScribeAI features and remove usage limits.</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={() => navigate('/subscription')} 
            className="w-full"
          >
            {requirePremium ? 'Upgrade to Premium' : 'View Plans'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/')} 
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Specific guards for common use cases
export const AIAccessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SubscriptionGuard requireSubscription feature="AI Chat">
    {children}
  </SubscriptionGuard>
);

export const HumanizerGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SubscriptionGuard requirePremium feature="Humanizer">
    {children}
  </SubscriptionGuard>
);

export const UsageLimitGuard: React.FC<{ 
  children: React.ReactNode;
  feature: 'ai' | 'humanizer';
  wordsToUse?: number;
}> = ({ children, feature, wordsToUse = 0 }) => {
  const { canUseAI, canUseHumanizer, getRemainingAIMessages, getRemainingHumanizerWords } = useSubscription();
  
  const hasAccess = feature === 'ai' 
    ? canUseAI() 
    : canUseHumanizer(wordsToUse);

  if (hasAccess) {
    return <>{children}</>;
  }

  const remaining = feature === 'ai' 
    ? getRemainingAIMessages() 
    : getRemainingHumanizerWords();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Zap className="h-12 w-12 text-orange-500" />
        </div>
        <CardTitle className="text-xl">Usage Limit Reached</CardTitle>
        <CardDescription>
          You've reached your daily limit for {feature === 'ai' ? 'AI messages' : 'humanizer words'}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>
            {feature === 'ai' 
              ? `You have ${remaining} AI messages remaining today.`
              : `You have ${remaining.toLocaleString()} humanizer words remaining.`
            }
          </p>
          <p className="mt-2">
            Upgrade to Premium for higher limits or wait until tomorrow for your usage to reset.
          </p>
        </div>
        
        <div className="space-y-2">
          <Button 
            onClick={() => window.location.href = '/subscription'} 
            className="w-full"
          >
            Upgrade to Premium
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/'} 
            className="w-full"
          >
            Back to Home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
