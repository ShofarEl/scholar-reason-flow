import { useState, useEffect, useCallback } from 'react';
import { PaymentService } from '@/services/paymentService';
import { UserSubscription, SubscriptionPlan } from '@/types/subscription';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load subscription on mount
  useEffect(() => {
    const loadSubscription = async () => {
      try {
        const currentSubscription = await PaymentService.getCurrentSubscription();
        setSubscription(currentSubscription);
      } catch (err) {
        setError('Failed to load subscription');
        console.error('Subscription load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSubscription();
  }, []);

  // Initialize payment
  const initializePayment = useCallback(async (
    email: string,
    plan: SubscriptionPlan,
    userId: string,
    callbackUrl: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const paymentResponse = await PaymentService.initializePayment(
        email,
        plan,
        userId,
        callbackUrl
      );
      
      // Redirect to Paystack payment page
      window.location.href = paymentResponse.data.authorization_url;
      
      return paymentResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment initialization failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify payment (called after redirect from Paystack)
  const verifyPayment = useCallback(async (reference: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Verifying payment with reference:', reference);
      
      const verificationData = await PaymentService.verifyPayment(reference);
      
      console.log('🔍 Payment verification result:', verificationData);
      
      if (verificationData.data.status === 'success') {
        console.log('✅ Payment verified successfully, processing...');
        
        const newSubscription = await PaymentService.processSuccessfulPayment(verificationData);
        
        if (!newSubscription) {
          throw new Error('Failed to process payment and create subscription');
        }
        
        console.log('✅ New subscription created:', newSubscription);
        
        // Force refresh subscription data to ensure cache is cleared
        const refreshedSubscription = await PaymentService.refreshSubscription();
        console.log('✅ Refreshed subscription data:', refreshedSubscription);
        
        setSubscription(refreshedSubscription || newSubscription);
        return refreshedSubscription || newSubscription;
      } else {
        console.error('❌ Payment was not successful:', verificationData.data.status);
        throw new Error(`Payment was not successful: ${verificationData.data.status}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment verification failed';
      console.error('❌ Payment verification error:', err);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update usage
  const updateUsage = useCallback(async (aiMessagesUsed: number = 0, humanizerWordsUsed: number = 0) => {
    const success = await PaymentService.updateUsage(undefined, aiMessagesUsed, humanizerWordsUsed);
    if (success) {
      // Reload subscription to get updated usage
      const updatedSubscription = await PaymentService.getCurrentSubscription();
      setSubscription(updatedSubscription);
    }
    return success;
  }, []);

  // Check permissions
  const canUseAI = useCallback(async () => {
    return await PaymentService.canUseAI();
  }, []);

  const canUseHumanizer = useCallback(async (wordsToUse: number = 0) => {
    return await PaymentService.canUseHumanizer(undefined, wordsToUse);
  }, []);

  const getRemainingHumanizerWords = useCallback(async () => {
    return await PaymentService.getRemainingHumanizerWords();
  }, []);

  const getRemainingAIMessages = useCallback(async () => {
    return await PaymentService.getRemainingAIMessages();
  }, []);

  // Check if user has active subscription
  const hasActiveSubscription = useCallback(() => {
    return subscription?.status === 'active';
  }, [subscription]);

  // Check if user has premium plan
  const hasPremiumPlan = useCallback(() => {
    return subscription?.plan === 'premium' && subscription?.status === 'active';
  }, [subscription]);

  return {
    subscription,
    loading,
    error,
    initializePayment,
    verifyPayment,
    updateUsage,
    canUseAI,
    canUseHumanizer,
    getRemainingHumanizerWords,
    getRemainingAIMessages,
    hasActiveSubscription,
    hasPremiumPlan,
    refreshSubscription: async () => {
      try {
        const currentSubscription = await PaymentService.refreshSubscription();
        setSubscription(currentSubscription);
        return currentSubscription;
      } catch (error) {
        console.error('Refresh subscription failed:', error);
        return null;
      }
    },
    updateSubscriptionPlan: async (subscriptionId: string, plan: 'basic' | 'premium') => {
      try {
        const success = await PaymentService.updateSubscriptionPlan(subscriptionId, plan);
        if (success) {
          const currentSubscription = await PaymentService.refreshSubscription();
          setSubscription(currentSubscription);
        }
        return success;
      } catch (error) {
        console.error('Update subscription plan failed:', error);
        return false;
      }
    },
    
  };
};
