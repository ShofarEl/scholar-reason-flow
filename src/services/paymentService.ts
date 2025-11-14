import { 
    PaystackPaymentRequest, 
    PaystackPaymentResponse, 
    PaystackVerificationResponse,
    SubscriptionPlan,
    PaymentStatus,
    UserSubscription,
    UsageStats,
    SUBSCRIPTION_PLANS
  } from '@/types/subscription';
  
  import { PAYSTACK_CONFIG } from '@/lib/paystackConfig';
  import { SubscriptionService } from '@/services/subscriptionService';
  
  export class PaymentService {
    private static readonly PAYSTACK_SECRET_KEY = PAYSTACK_CONFIG.SECRET_KEY;
    private static readonly PAYSTACK_PUBLIC_KEY = PAYSTACK_CONFIG.PUBLIC_KEY;
    private static readonly API_BASE_URL = PAYSTACK_CONFIG.API_BASE_URL;
    private static readonly TRIAL_AI_MESSAGES = 3;
    private static readonly NGN_PER_USD = 1550;
    // Free trial token budget (approximate tokens; input + output)
    private static readonly TRIAL_TOKEN_LIMIT = 2500;
    // Cache for current user subscription
    private static subscriptionCache: Map<string, { subscription: UserSubscription | null; timestamp: number }> = new Map();
    private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  
    static async initializePayment(
      email: string,
      plan: SubscriptionPlan,
      userId: string,
      callbackUrl: string
    ): Promise<PaystackPaymentResponse> {
      // Convert USD price → NGN → kobo for Paystack
      const usdPrice = SUBSCRIPTION_PLANS[plan].price; // e.g., 1 or 6 USD
      const amountNaira = usdPrice * this.NGN_PER_USD; // e.g., 1 * 1550 = ₦1550; 6 * 1550 = ₦9300
      const amount = Math.round(amountNaira * 100); // Kobo for Paystack (e.g., 155000, 930000)
      const reference = `PAY_${Date.now()}_${userId}`;
  
      const paymentRequest: PaystackPaymentRequest = {
        amount,
        email,
        reference,
        callback_url: callbackUrl,
        metadata: {
          plan,
          userId
        }
      };
  
      try {
        const response = await fetch(`${this.API_BASE_URL}/transaction/initialize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(paymentRequest),
        });
  
        if (!response.ok) {
          throw new Error(`Payment initialization failed: ${response.statusText}`);
        }
  
        const data: PaystackPaymentResponse = await response.json();
        
        if (!data.status) {
          throw new Error(data.message || 'Payment initialization failed');
        }
  
        return data;
      } catch (error) {
        console.error('Payment initialization error:', error);
        throw new Error('Failed to initialize payment. Please try again.');
      }
    }
  
    static async verifyPayment(reference: string): Promise<PaystackVerificationResponse> {
      try {
        const response = await fetch(`${this.API_BASE_URL}/transaction/verify/${reference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.PAYSTACK_SECRET_KEY}`,
          },
        });
  
        if (!response.ok) {
          throw new Error(`Payment verification failed: ${response.statusText}`);
        }
  
        const data: PaystackVerificationResponse = await response.json();
        
        if (!data.status) {
          throw new Error(data.message || 'Payment verification failed');
        }
  
        return data;
      } catch (error) {
        console.error('Payment verification error:', error);
        throw new Error('Failed to verify payment. Please try again.');
      }
    }
  
    static async processSuccessfulPayment(
      verificationData: PaystackVerificationResponse
    ): Promise<UserSubscription> {
      const { data } = verificationData;
      const plan = data.metadata.plan as SubscriptionPlan;
      const userId = data.metadata.userId;

      console.log('🔧 Processing successful payment:', {
        plan,
        userId,
        amount: data.amount,
        reference: data.reference,
        status: data.status
      });

      // Validate user ID format
      if (!userId || typeof userId !== 'string') {
        throw new Error('Invalid user ID in payment metadata');
      }

      // Ensure userId is a valid UUID (not the old temporary format)
      if (!userId.includes('-') || userId.startsWith('user_')) {
        throw new Error(`Invalid user ID format: ${userId}. Expected Supabase UUID.`);
      }

      // Check if subscription already exists (webhook might have already processed it)
      const existingSubscription = await SubscriptionService.getCurrentSubscription(userId);
      if (existingSubscription && existingSubscription.status === 'active') {
        console.log('✅ Subscription already exists from webhook, returning existing subscription');
        return existingSubscription;
      }

      // Check if payment was already processed
      const allSubscriptions = await SubscriptionService.getAllSubscriptions(userId);
      const paymentExists = allSubscriptions.some(sub =>
        sub.payment_history?.some((payment: any) => payment.paystack_reference === data.reference)
      );

      if (paymentExists) {
        console.log('✅ Payment already processed, fetching existing subscription');
        const subscription = await SubscriptionService.getCurrentSubscription(userId);
        if (subscription) {
          return subscription;
        }
      }

      // Create subscription in database if it doesn't exist
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      const amount = data.amount / 100; // Convert from kobo to USD

      console.log('🔧 Creating new subscription with data:', {
        userId,
        plan,
        endDate: endDate.toISOString(),
        amount,
        reference: data.reference
      });

      try {
        const subscription = await SubscriptionService.createSubscription(
          userId,
          plan,
          endDate,
          data.reference,
          amount,
          data.id.toString(),
          data.customer?.email
        );

        if (!subscription) {
          throw new Error('Failed to create subscription in database');
        }

        console.log('✅ Subscription created successfully:', subscription);
        return subscription;
      } catch (error) {
        console.error('❌ Failed to create subscription:', error);

        // Check one more time if subscription was created despite the error
        const retrySubscription = await SubscriptionService.getCurrentSubscription(userId);
        if (retrySubscription && retrySubscription.status === 'active') {
          console.log('✅ Subscription was actually created despite error, returning it');
          return retrySubscription;
        }

        throw new Error(`Failed to create subscription in database: ${error}`);
      }
    }
  
    static async getCurrentSubscription(userId?: string): Promise<UserSubscription | null> {
      // If no userId provided, try to get from auth context
      if (!userId) {
        try {
          // This is a fallback - in practice, userId should be provided
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) {
            console.log('❌ No user ID available for subscription lookup');
            return null;
          }
        } catch (error) {
          console.error('❌ Failed to get user from auth context:', error);
          return null;
        }
      }
  
      console.log('🔍 Looking up subscription for user:', userId);
  
      // Check cache first
      const cached = this.subscriptionCache.get(userId);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log('📦 Using cached subscription data for user:', userId);
        return cached.subscription;
      }
  
      try {
        console.log('🔄 Fetching fresh subscription data for user:', userId);
        
        const subscription = await SubscriptionService.getCurrentSubscription(userId);
        
        // Update cache
        this.subscriptionCache.set(userId, {
          subscription,
          timestamp: Date.now()
        });
  
        console.log('✅ Subscription data fetched:', subscription ? 'Active subscription found' : 'No active subscription');
        return subscription;
      } catch (error) {
        console.error('❌ Failed to get current subscription:', error);
        return null;
      }
    }
  
    // ===== Trial helpers (server-side) =====
    private static async getTrialUsage(userId?: string): Promise<{ aiMessages: number; tokensUsed: number; startedAt: string }> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return { aiMessages: 0, tokensUsed: 0, startedAt: new Date().toISOString() };
        } catch {
          return { aiMessages: 0, tokensUsed: 0, startedAt: new Date().toISOString() };
        }
      }
  
      try {
        return await SubscriptionService.getTrialUsage(userId);
      } catch (error) {
        console.error('Failed to get trial usage:', error);
        return { aiMessages: 0, tokensUsed: 0, startedAt: new Date().toISOString() };
      }
    }
  
    private static async incrementTrialAI(userId?: string): Promise<void> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return;
        } catch {
          return;
        }
      }
  
      try {
        await SubscriptionService.updateTrialUsage(userId, 1, 0);
      } catch {}
    }
  
    // Rough token estimator. Approximate 1 token ~ 4 characters.
    static estimateTokens(text: string): number {
      const chars = (text || '').length;
      return Math.max(0, Math.ceil(chars / 4));
    }
  
  
  
    static getTrialTokenLimit(): number {
      return this.TRIAL_TOKEN_LIMIT;
    }
  
    private static async getHasActiveSubscription(userId?: string): Promise<boolean> {
      const sub = await this.getCurrentSubscription(userId);
      return !!sub && sub.status === 'active';
    }
  
    static async updateUsage(
      userId?: string,
      aiMessagesUsed: number = 0,
      humanizerWordsUsed: number = 0,
      planWordsDelta: number = 0
    ): Promise<boolean> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return false;
        } catch {
          return false;
        }
      }
  
      try {
        const subscription = await this.getCurrentSubscription(userId);
        if (!subscription) return false;
  
        // Get subscription ID from the subscription object
        // We need to get the actual subscription ID from the database
        const allSubscriptions = await SubscriptionService.getAllSubscriptions(userId);
        const activeSubscription = allSubscriptions.find(sub => sub.status === 'active');
        const subscriptionId = activeSubscription?.id;
        
        if (!subscriptionId) {
          console.error('❌ No active subscription found for usage update');
          return false;
        }
        
        // Update usage in database
        const success = await SubscriptionService.updateUsage(
          subscriptionId,
          aiMessagesUsed,
          humanizerWordsUsed
        );
  
        // Clear cache to force refresh
        this.subscriptionCache.delete(userId);
  
        return success;
      } catch (error) {
        console.error('Failed to update usage:', error);
        return false;
      }
    }
  
    static async canUseAI(userId?: string): Promise<boolean> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return false;
        } catch {
          return false;
        }
      }
  
      // If subscribed, enforce plan limits
      const subscription = await this.getCurrentSubscription(userId);
      if (subscription && subscription.status === 'active') {
        const plan = subscription.plan;
        const dailyLimit = plan === 'basic' ? 100 : 500;
        const planWordLimit = SUBSCRIPTION_PLANS[plan].planWordLimit;
        const planBudgetOk = (subscription.usage.planWordsUsed || 0) < planWordLimit;
        return subscription.usage.dailyUsage.aiMessages < dailyLimit && planBudgetOk;
      }
      // No subscription: allow trial up to TRIAL_TOKEN_LIMIT tokens (input + output)
      return (await this.getRemainingTrialTokens(userId)) > 0;
    }
  
    static async canUseHumanizer(userId?: string, wordsToUse: number = 0): Promise<boolean> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return false;
        } catch {
          return false;
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription || subscription.status !== 'active') return false;
  
      const plan = subscription.plan;
      if (plan === 'basic') return false; // Basic plan has no humanizer access
  
      const totalLimit = 10000; // Premium plan limit
      const currentUsage = subscription.usage.humanizerWordsUsed;
      const planWordLimit = SUBSCRIPTION_PLANS[plan].planWordLimit;
      const planBudgetOk = (subscription.usage.planWordsUsed || 0) + wordsToUse <= planWordLimit;
      return currentUsage + wordsToUse <= totalLimit && planBudgetOk;
    }
  
    static async getRemainingHumanizerWords(userId?: string): Promise<number> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return 0;
        } catch {
          return 0;
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription || subscription.status !== 'active' || subscription.plan === 'basic') {
        return 0;
      }
  
      return Math.max(0, 10000 - subscription.usage.humanizerWordsUsed);
    }
  
    static async getRemainingAIMessages(userId?: string): Promise<number> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return 0;
        } catch {
          return 0;
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription || subscription.status !== 'active') {
        // For trial, message count is less relevant now; return 1 if tokens remain, else 0
        return (await this.getRemainingTrialTokens(userId)) > 0 ? 1 : 0;
      }
      const dailyLimit = subscription.plan === 'basic' ? 30 : 100;
      return Math.max(0, dailyLimit - subscription.usage.dailyUsage.aiMessages);
    }
  
    static async getRemainingPlanWords(userId?: string): Promise<number> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return 0;
        } catch {
          return 0;
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription || subscription.status !== 'active') return 0;
      const planWordLimit = SUBSCRIPTION_PLANS[subscription.plan].planWordLimit;
      return Math.max(0, planWordLimit - (subscription.usage.planWordsUsed || 0));
    }
  
    static async recordAIMessageUse(userId?: string): Promise<void> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return;
        } catch {
          return;
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (subscription && subscription.status === 'active') {
        await this.updateUsage(userId, 1, 0);
      } else {
        await this.incrementTrialAI(userId);
      }
    }
  
    static async getAIAccessBlockReason(userId?: string): Promise<string> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return 'Authentication required.';
        } catch {
          return 'Authentication required.';
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (subscription && subscription.status === 'active') {
        try {
          const planWordLimit = SUBSCRIPTION_PLANS[subscription.plan].planWordLimit;
          const used = subscription.usage.planWordsUsed || 0;
          if (used >= planWordLimit) {
            return `Your plan word budget is exhausted (${used.toLocaleString()} / ${planWordLimit.toLocaleString()} words). Please renew or upgrade to continue.`;
          }
        } catch {}
        return 'Daily AI message limit reached for your plan. Please wait until tomorrow or upgrade for higher limits.';
      }
      const trialUsage = await this.getTrialUsage(userId);
      const usedTokens = trialUsage.tokensUsed || 0;
      return `Your free trial has ended (${usedTokens.toLocaleString()} / ${this.TRIAL_TOKEN_LIMIT.toLocaleString()} tokens used). Please subscribe to continue using ScribeAI.`;
    }
  
    static async getHumanizerAccessBlockReason(userId?: string, wordsToUse: number = 0): Promise<string> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return 'Authentication required.';
        } catch {
          return 'Authentication required.';
        }
      }
  
      const subscription = await this.getCurrentSubscription(userId);
      if (!subscription || subscription.status !== 'active') {
        return 'Humanizer is available on the Premium plan. Please subscribe to use the humanizer feature.';
      }
      if (subscription.plan === 'basic') {
        return 'Humanizer is not included in the Basic plan. Please upgrade to Premium to use the humanizer feature.';
      }
      const planWordLimit = SUBSCRIPTION_PLANS[subscription.plan].planWordLimit;
      const used = subscription.usage.planWordsUsed || 0;
      if (used + Math.max(0, wordsToUse) > planWordLimit) {
        return `Your plan word budget is exhausted (${used.toLocaleString()} / ${planWordLimit.toLocaleString()} words). Please renew or upgrade to continue.`;
      }
      const remainingHumanizer = Math.max(0, 10000 - subscription.usage.humanizerWordsUsed);
      if (wordsToUse > remainingHumanizer) {
        return `Humanizer limit reached (${(10000 - remainingHumanizer).toLocaleString()} / 10,000 words). Reduce input or wait for renewal.`;
      }
      return 'Humanizer access denied due to plan limits.';
    }
  
    static async getRemainingTrialTokens(userId?: string): Promise<number> {
      try {
        const usage = await this.getTrialUsage(userId);
        return Math.max(0, this.TRIAL_TOKEN_LIMIT - (usage.tokensUsed || 0));
      } catch {
        return this.TRIAL_TOKEN_LIMIT;
      }
    }
  
    static async updateTrialTokens(userId?: string, deltaTokens: number = 0): Promise<void> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return;
        } catch {
          return;
        }
      }
  
      try {
        await SubscriptionService.updateTrialUsage(userId, 0, deltaTokens);
      } catch {}
    }
  
    // Clear cache (useful for testing or manual refresh)
    static clearCache(userId?: string): void {
      if (userId) {
        this.subscriptionCache.delete(userId);
        console.log('🗑️ Cleared subscription cache for user:', userId);
      } else {
        this.subscriptionCache.clear();
        console.log('🗑️ Cleared all subscription cache');
      }
    }
  
    // Force refresh subscription data (clears cache and fetches fresh data)
    static async refreshSubscription(userId?: string): Promise<UserSubscription | null> {
      this.clearCache(userId);
      return await this.getCurrentSubscription(userId);
    }
  
    // Update subscription plan
    static async updateSubscriptionPlan(subscriptionId: string, plan: 'basic' | 'premium'): Promise<boolean> {
      return await SubscriptionService.updateSubscriptionPlan(subscriptionId, plan);
    }
  
    // Get all subscriptions for a user (needed for usage updates)
    static async getAllSubscriptions(userId?: string): Promise<any[]> {
      if (!userId) {
        try {
          const { data: { user } } = await import('@/integrations/supabase/client').then(m => m.supabase.auth.getUser());
          userId = user?.id;
          if (!userId) return [];
        } catch {
          return [];
        }
      }
      return await SubscriptionService.getAllSubscriptions(userId);
    }
  
    // Create missing payment history for existing subscription
    static async createMissingPaymentHistory(subscriptionId: string, plan: 'basic' | 'premium'): Promise<boolean> {
      return await SubscriptionService.createMissingPaymentHistory(subscriptionId, plan);
    }
  
  
  
  
  }
  