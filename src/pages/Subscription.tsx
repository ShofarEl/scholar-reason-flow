import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Crown, 
  Zap, 
  MessageSquare, 
  FileText, 
  Calendar,
  CreditCard,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionPlans } from '../components/subscription/SubscriptionPlans';
import { SUBSCRIPTION_PLANS } from '@/types/subscription';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionStatus } from '../components/subscription/SubscriptionStatus';

export const Subscription: React.FC = () => {
     const { 
     subscription, 
     getRemainingAIMessages, 
     getRemainingHumanizerWords,
     hasActiveSubscription,
     hasPremiumPlan
   } = useSubscription();

  const [remainingAIMessages, setRemainingAIMessages] = useState(0);
  const [remainingHumanizerWords, setRemainingHumanizerWords] = useState(0);

  // Load async values
  useEffect(() => {
    const loadValues = async () => {
      try {
        const aiMessages = await getRemainingAIMessages();
        const humanizerWords = await getRemainingHumanizerWords();
        setRemainingAIMessages(aiMessages);
        setRemainingHumanizerWords(humanizerWords);
      } catch (error) {
        console.error('Failed to load subscription values:', error);
      }
    };

    if (hasActiveSubscription()) {
      loadValues();
    }
  }, [getRemainingAIMessages, getRemainingHumanizerWords, hasActiveSubscription]);

  const { user } = useAuth();

  const getCurrentPlanConfig = () => {
    if (!subscription) return null;
    return SUBSCRIPTION_PLANS[subscription.plan];
  };

  const getDailyAILimit = () => {
    const plan = getCurrentPlanConfig();
    return plan?.aiMessageLimit || 0;
  };

  const getHumanizerLimit = () => {
    const plan = getCurrentPlanConfig();
    return plan?.humanizerWordLimit || 0;
  };

  const getAIMessageUsagePercentage = () => {
    const limit = getDailyAILimit();
    if (limit === 0) return 0;
    const used = limit - remainingAIMessages;
    return (used / limit) * 100;
  };

  const getHumanizerUsagePercentage = () => {
    const limit = getHumanizerLimit();
    if (limit === 0) return 0;
    const used = limit - remainingHumanizerWords;
    return (used / limit) * 100;
  };

  if (!hasActiveSubscription()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-gray-600">
              Subscribe to unlock the full potential of ScribeAI
            </p>
          </div>

          {/* Always show status with debug even if no active sub */}
          <SubscriptionStatus variant="detailed" showUpgradeButton={true} />

          <SubscriptionPlans />
        </div>
      </div>
    );
  }

  const planConfig = getCurrentPlanConfig();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-4">Subscription Management</h1>
          <p className="text-gray-600">
            Manage your subscription and track your usage
          </p>
        </div>

        

        {/* Current Plan Card */}
        <Card className="mb-8 border-2 border-green-300 dark:border-green-600 bg-white dark:bg-gray-900 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {hasPremiumPlan() ? (
                  <Crown className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mr-3" />
                ) : (
                  <Zap className="h-8 w-8 text-blue-600 dark:text-blue-400 mr-3" />
                )}
                <div>
                  <CardTitle className="text-2xl text-gray-900 dark:text-white">
                    {planConfig?.name}
                  </CardTitle>
                  <CardDescription className="text-gray-700 dark:text-gray-300">
                    {planConfig?.description}
                  </CardDescription>
                </div>
              </div>
              <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'} className={subscription?.status === 'active' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-gray-500 text-white'}>
                {subscription?.status === 'active' ? 'Active' : 'Expired'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Started</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expires</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Amount</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    ${planConfig?.price}/month
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Usage Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* AI Messages Usage */}
          <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
            <CardHeader>
              <div className="flex items-center">
                <MessageSquare className="h-5 w-5 text-blue-500 mr-2" />
                <CardTitle className="text-lg text-gray-900 dark:text-white">AI Messages</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">Daily Usage</span>
                  <span className="text-gray-900 dark:text-white font-medium">{getDailyAILimit() - remainingAIMessages} / {getDailyAILimit()}</span>
                </div>
                <Progress value={getAIMessageUsagePercentage()} className="h-2" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {remainingAIMessages} messages remaining today
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Humanizer Usage */}
          {hasPremiumPlan() && (
            <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
              <CardHeader>
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-green-500 mr-2" />
                  <CardTitle className="text-lg text-gray-900 dark:text-white">Humanizer Words</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300">Total Usage</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {getHumanizerLimit() - remainingHumanizerWords} / {getHumanizerLimit().toLocaleString()}
                    </span>
                  </div>
                  <Progress value={getHumanizerUsagePercentage()} className="h-2" />
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {remainingHumanizerWords.toLocaleString()} words remaining
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Plan Features */}
        <Card className="mb-8 border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-gray-900 dark:text-white">
              <BarChart3 className="h-5 w-5 mr-2" />
              Plan Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {planConfig?.features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-sm text-gray-900 dark:text-white">{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

         {/* Upgrade/Downgrade Section */}
         <Card className="border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Manage Subscription</CardTitle>
            <CardDescription className="text-gray-700 dark:text-gray-300">
              Upgrade to Premium for more features or modify your current plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubscriptionPlans showCurrentPlan={false} />
          </CardContent>
        </Card>
     </div>
    </div>
  );
};

export default Subscription;
