import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Zap } from 'lucide-react';
import { SUBSCRIPTION_PLANS, SubscriptionPlan } from '@/types/subscription';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';

interface SubscriptionPlansProps {
  onPlanSelected?: (plan: SubscriptionPlan) => void;
  showCurrentPlan?: boolean;
}

export const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onPlanSelected,
  showCurrentPlan = true
}) => {
  const { subscription, initializePayment, loading, error } = useSubscription();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [email, setEmail] = useState('');

  const handlePlanSelect = async (plan: SubscriptionPlan) => {
    if (!user?.id) {
      console.error('No authenticated user found');
      return;
    }

    setSelectedPlan(plan);
    
    try {
      // Use the actual authenticated user ID - this is the key fix!
      const userId = user.id;
      const userEmail = email || user.email || '';
      
      if (!userEmail) {
        console.error('No email available for payment');
        return;
      }

      console.log('🔧 Initializing payment with correct user ID:', {
        email: userEmail,
        plan,
        userId, // This is now the real Supabase UUID
        userEmail: user.email
      });

      const callbackUrl = `${window.location.origin}/payment-success`;
      
      await initializePayment(userEmail, plan, userId, callbackUrl);
    } catch (err) {
      console.error('Payment initialization failed:', err);
    }
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => {
    return subscription?.plan === plan && subscription?.status === 'active';
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={user?.email || "Enter your email address"}
            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
          {user?.email && (
            <p className="text-sm text-gray-500 mt-1">
              Using authenticated email: {user.email}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(SUBSCRIPTION_PLANS).map((plan) => (
          <Card 
            key={plan.id}
            className={`relative transition-all duration-200 hover:shadow-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg ${
              isCurrentPlan(plan.id) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
            }`}
          >
            {isCurrentPlan(plan.id) && showCurrentPlan && (
              <Badge className="absolute -top-2 -right-2 bg-green-500">
                Current Plan
              </Badge>
            )}
            
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-2">
                {plan.id === 'premium' ? (
                  <Crown className="h-6 w-6 text-yellow-500 mr-2" />
                ) : (
                  <Zap className="h-6 w-6 text-blue-500 mr-2" />
                )}
                <CardTitle className="text-xl text-gray-900 dark:text-white">{plan.name}</CardTitle>
              </div>
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white">
                ₦{(plan.price * 1550).toLocaleString()}
                <span className="text-sm font-normal text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <CardDescription className="text-gray-700 dark:text-gray-300">{plan.description}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-900 dark:text-white">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Clear plan details */}
              <div className="space-y-2 text-sm p-3 rounded-lg border-2 border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-start">
                  <span className="font-medium w-40 text-gray-900 dark:text-white">Total Plan Words:</span>
                  <span className="text-gray-900 dark:text-white">{plan.planWordLimit.toLocaleString()} (input + output)</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium w-40 text-gray-900 dark:text-white">AI Chat Daily:</span>
                  <span className="text-gray-900 dark:text-white">{plan.aiMessageLimit} messages/day</span>
                </div>
                <div className="flex items-start">
                  <span className="font-medium w-40 text-gray-900 dark:text-white">Humanizer:</span>
                  {plan.humanizerAccess ? (
                    <span className="text-gray-900 dark:text-white">Included • 10,000 input words (counts toward total)</span>
                  ) : (
                    <span className="text-gray-900 dark:text-white">Not included on Basic plan</span>
                  )}
                </div>
                <div className="flex items-start">
                  <span className="font-medium w-40 text-gray-900 dark:text-white">Free Trial:</span>
                  <span className="text-gray-900 dark:text-white">3 AI messages before subscribing</span>
                </div>
              </div>

              {plan.aiMessageLimit && (
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 p-2 rounded">
                  <strong className="text-gray-900 dark:text-white">Daily AI Messages:</strong> {plan.aiMessageLimit}
                </div>
              )}

              {plan.humanizerAccess && (
                <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-600 p-2 rounded">
                  <strong className="text-gray-900 dark:text-white">Humanizer Words:</strong> {plan.humanizerWordLimit.toLocaleString()}
                </div>
              )}

              <Button
                onClick={() => handlePlanSelect(plan.id)}
                disabled={loading || isCurrentPlan(plan.id) || (!email.trim() && !user?.email)}
                className={`w-full ${
                  plan.id === 'premium' 
                    ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {loading && selectedPlan === plan.id ? (
                  'Processing...'
                ) : isCurrentPlan(plan.id) ? (
                  'Current Plan'
                ) : (
                  `Subscribe to ${plan.name}`
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>Secure payment powered by Paystack</p>
        <p>Cancel anytime. No hidden fees.</p>
      </div>
    </div>
  );
};
