import { supabase } from '@/integrations/supabase/client';
import { UserSubscription, SubscriptionPlan, PaymentStatus, PaymentRecord } from '@/types/subscription';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export class SubscriptionService {
  // Get current subscription from database
  static async getCurrentSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      console.log('🔍 Fetching subscription for user:', userId);
      
      // Use a simple query without joins to avoid 406 errors
      const { data: subscriptionData, error } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan, status, start_date, end_date, created_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      console.log('🔍 Subscription query result:', { data: subscriptionData, error });

      if (error) {
        console.error('❌ Subscription query failed:', error);
        if (error.code === 'PGRST116') {
          console.log('📭 No subscription found for user (this is normal for new users)');
        }
        return null;
      }

      if (!subscriptionData) {
        console.log('📭 No active subscription found for user:', userId);
        return null;
      }

      console.log('✅ Found subscription:', subscriptionData);

      // Check if subscription is expired
      if (new Date() > new Date(subscriptionData.end_date)) {
        console.log('⏰ Subscription expired for user:', userId);
        // Update status to expired
        await this.updateSubscriptionStatus(subscriptionData.id, 'expired');
        return null;
      }

      // Get usage data
      const { data: usage, error: usageError } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('subscription_id', subscriptionData.id)
        .eq('usage_date', new Date().toISOString().split('T')[0])
        .single();

      if (usageError || !usage) {
        console.log('⚠️ No usage data found for today, using defaults');
        // Create default usage for today
        const { error: createUsageError } = await supabase
          .from('subscription_usage')
          .insert({
            subscription_id: subscriptionData.id,
            user_id: userId,
            ai_messages_used: 0,
            humanizer_words_used: 0,
            usage_date: new Date().toISOString().split('T')[0]
          });
        
        if (createUsageError) {
          console.error('❌ Failed to create default usage:', createUsageError);
        }
      }

      // Get payment history
      let paymentHistory: PaymentRecord[] = [];
      try {
        const { data: paymentData, error: paymentError } = await supabase
          .from('payment_history')
          .select('*')
          .eq('subscription_id', subscriptionData.id)
          .order('created_at', { ascending: false });

        if (!paymentError && paymentData) {
          paymentHistory = paymentData.map(payment => ({
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status as PaymentStatus,
            paystackReference: payment.paystack_reference,
            plan: subscriptionData.plan as SubscriptionPlan, // Use subscription plan
            timestamp: new Date(payment.created_at),
            metadata: {
              paystackId: payment.paystack_id,
              customerEmail: payment.customer_email
            }
          }));
          console.log('✅ Payment history found:', paymentData.length, 'records');
        } else {
          console.log('⚠️ Could not fetch payment history, using empty array:', paymentError);
        }
      } catch (paymentErr) {
        console.log('⚠️ Could not fetch payment history, using empty array');
      }

      const result = {
        userId: subscriptionData.user_id,
        plan: subscriptionData.plan as SubscriptionPlan,
        status: subscriptionData.status as 'active' | 'expired' | 'cancelled',
        startDate: new Date(subscriptionData.start_date),
        endDate: new Date(subscriptionData.end_date),
        usage: {
          aiMessagesUsed: usage?.ai_messages_used || 0,
          humanizerWordsUsed: usage?.humanizer_words_used || 0,
          planWordsUsed: 0, // Not used in new schema
          lastResetDate: new Date(), // Not used in new schema
          dailyUsage: { aiMessages: usage?.ai_messages_used || 0, humanizerWords: usage?.humanizer_words_used || 0, date: new Date().toISOString().split('T')[0] }
        },
        paymentHistory
      };

      console.log('✅ Returning subscription data:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to get current subscription:', error);
      return null;
    }
  }

  // Create new subscription
  static async createSubscription(
    userId: string,
    plan: SubscriptionPlan,
    endDate: Date,
    paystackReference: string,
    amount: number,
    paystackId?: string,
    customerEmail?: string
  ): Promise<UserSubscription | null> {
    try {
      console.log('🔧 Creating subscription with data:', {
        userId,
        plan,
        endDate: endDate.toISOString(),
        paystackReference,
        amount,
        paystackId,
        customerEmail
      });

      // Create subscription
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan,
          status: 'active',
          start_date: new Date().toISOString(),
          end_date: endDate.toISOString()
        })
        .select()
        .single();

      console.log('🔧 Subscription creation result:', { data: subscription, error: subError });

      if (subError || !subscription) {
        console.error('❌ Failed to create subscription:', subError);
        throw new Error(`Failed to create subscription: ${subError?.message || 'Unknown error'}`);
      }

      console.log('✅ Subscription created successfully:', subscription.id);

      // Create usage record
      console.log('🔧 Creating usage record for subscription:', subscription.id);
      const { error: usageError } = await supabase
        .from('subscription_usage')
        .insert({
          subscription_id: subscription.id,
          user_id: userId,
          ai_messages_used: 0,
          humanizer_words_used: 0,
          usage_date: new Date().toISOString().split('T')[0]
        });

      if (usageError) {
        console.error('❌ Failed to create usage record:', usageError);
      } else {
        console.log('✅ Usage record created successfully');
      }

      // Create payment history record
      console.log('🔧 Creating payment history record for subscription:', subscription.id);
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          subscription_id: subscription.id,
          user_id: userId,
          paystack_reference: paystackReference,
          paystack_id: paystackId,
          amount,
          currency: 'NGN',
          status: 'success',
          plan: plan,
          customer_email: customerEmail
        });

      if (paymentError) {
        console.error('❌ Failed to create payment history:', paymentError);
      } else {
        console.log('✅ Payment history record created successfully');
      }

      console.log('🔧 Fetching created subscription...');
      const result = await this.getCurrentSubscription(userId);
      console.log('🔧 Final result:', result ? 'Subscription found' : 'No subscription found');
      return result;
    } catch (error) {
      console.error('❌ Failed to create subscription:', error);
      return null;
    }
  }

  // Update subscription status
  static async updateSubscriptionStatus(subscriptionId: string, status: 'active' | 'expired' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', subscriptionId);

      return !error;
    } catch (error) {
      console.error('Failed to update subscription status:', error);
      return false;
    }
  }

  // Update subscription plan
  static async updateSubscriptionPlan(subscriptionId: string, plan: 'basic' | 'premium'): Promise<boolean> {
    try {
      console.log('🔄 Updating subscription plan:', { subscriptionId, plan });
      
      const { error } = await supabase
        .from('subscriptions')
        .update({ plan })
        .eq('id', subscriptionId);

      if (error) {
        console.error('❌ Failed to update subscription plan:', error);
        return false;
      }

      console.log('✅ Subscription plan updated successfully');
      return true;
    } catch (error) {
      console.error('Failed to update subscription plan:', error);
      return false;
    }
  }

  // Get all subscriptions for a user (needed for usage updates)
  static async getAllSubscriptions(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Failed to get all subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get all subscriptions:', error);
      return [];
    }
  }

  // Create missing payment history for existing subscription
  static async createMissingPaymentHistory(subscriptionId: string, plan: 'basic' | 'premium'): Promise<boolean> {
    try {
      console.log('🔧 Creating missing payment history for subscription:', subscriptionId);
      
      // Check if payment history already exists for this plan
      const { data: existingPayments, error: checkError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('plan', plan);

      if (checkError) {
        console.error('❌ Error checking existing payment history:', checkError);
        // If the plan column doesn't exist, just check if any payment exists for this subscription
        if (checkError.code === '42703' && checkError.message?.includes('plan')) {
          console.log('⚠️ Plan column not found in payment_history, checking without plan filter');
          const { data: fallbackPayments, error: fallbackError } = await supabase
            .from('payment_history')
            .select('*')
            .eq('subscription_id', subscriptionId)
            .eq('status', 'success');

          if (fallbackError) {
            console.error('❌ Fallback payment check also failed:', fallbackError);
            return false;
          }

          return !fallbackPayments || fallbackPayments.length === 0;
        }
        return false;
      }

      // If payment history exists for this plan, we're good
      if (existingPayments && existingPayments.length > 0) {
        console.log('✅ Payment history already exists for plan:', plan);
        return true;
      }

      // Get the subscription to determine the correct amount
      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subscription) {
        console.error('❌ Could not fetch subscription for payment history:', subError);
        return false;
      }

      // Determine amount based on plan (in NGN - Paystack currency)
      const amount = plan === 'premium' ? 3100 : 1550; // 3100 NGN for premium, 1550 NGN for basic
      
      // Create payment history record
      const { error: paymentError } = await supabase
        .from('payment_history')
        .insert({
          subscription_id: subscriptionId,
          paystack_reference: `MANUAL_${subscriptionId}_${Date.now()}`,
          amount,
          currency: 'NGN',
          status: 'success',
          plan,
          paystack_id: `manual_${Date.now()}`,
          customer_email: subscription.user_id, // Use user ID as placeholder
          paid_at: new Date().toISOString()
        });

      if (paymentError) {
        console.error('❌ Failed to create payment history:', paymentError);
        return false;
      }

      console.log('✅ Payment history created successfully for subscription:', subscriptionId, 'plan:', plan, 'amount:', amount, 'NGN');
      return true;
    } catch (error) {
      console.error('Failed to create missing payment history:', error);
      return false;
    }
  }



  // Update usage for a subscription
  static async updateUsage(
    subscriptionId: string | undefined,
    aiMessagesUsed: number = 0,
    humanizerWordsUsed: number = 0
  ): Promise<boolean> {
    try {
      if (!subscriptionId) {
        console.log('No subscription ID provided for usage update');
        return false;
      }

      // Get current usage for today
      const today = new Date().toISOString().split('T')[0];
      const { data: currentUsage, error: fetchError } = await supabase
        .from('subscription_usage')
        .select('*')
        .eq('subscription_id', subscriptionId)
        .eq('usage_date', today)
        .single();

      if (fetchError || !currentUsage) {
        // Create usage record for today if it doesn't exist
        const { error: createError } = await supabase
          .from('subscription_usage')
          .insert({
            subscription_id: subscriptionId,
            user_id: (await this.getCurrentSubscription(subscriptionId))?.userId || '',
            ai_messages_used: aiMessagesUsed,
            humanizer_words_used: humanizerWordsUsed,
            usage_date: today
          });

        if (createError) {
          console.error('❌ Failed to create usage record:', createError);
          return false;
        }
        
        console.log('✅ Created new usage record for today');
        return true;
      }

      // Update existing usage for today
      const { error: updateError } = await supabase
        .from('subscription_usage')
        .update({
          ai_messages_used: currentUsage.ai_messages_used + aiMessagesUsed,
          humanizer_words_used: currentUsage.humanizer_words_used + humanizerWordsUsed
        })
        .eq('subscription_id', subscriptionId)
        .eq('usage_date', today);

      if (updateError) {
        console.error('❌ Failed to update usage:', updateError);
        return false;
      }

      console.log('✅ Updated usage for today');
      return true;
    } catch (error) {
      console.error('❌ Failed to update usage:', error);
      return false;
    }
  }

  // Get trial usage
  static async getTrialUsage(userId: string): Promise<{ aiMessages: number; tokensUsed: number; startedAt: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('trial_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

      if (error || !data) {
        // Create trial usage record for today if it doesn't exist
        const { data: newTrial } = await supabase
          .from('trial_usage')
          .insert({
            user_id: userId,
            ai_messages_used: 0,
            tokens_used: 0,
            humanizer_words_used: 0,
            usage_date: today
          })
          .select()
          .single();

        return newTrial ? {
          aiMessages: newTrial.ai_messages_used || 0,
          tokensUsed: newTrial.tokens_used || 0,
          startedAt: new Date(`${today}T00:00:00Z`).toISOString()
        } : { aiMessages: 0, tokensUsed: 0, startedAt: new Date(`${today}T00:00:00Z`).toISOString() };
      }

      return {
        aiMessages: data.ai_messages_used || 0,
        tokensUsed: data.tokens_used || 0,
        startedAt: new Date(`${today}T00:00:00Z`).toISOString()
      };
    } catch (error) {
      console.error('Failed to get trial usage:', error);
      const today = new Date().toISOString().split('T')[0];
      return { aiMessages: 0, tokensUsed: 0, startedAt: new Date(`${today}T00:00:00Z`).toISOString() };
    }
  }

  // Update trial usage
  static async updateTrialUsage(
    userId: string,
    aiMessagesDelta: number = 0,
    tokensDelta: number = 0
  ): Promise<boolean> {
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: currentTrial, error: fetchError } = await supabase
        .from('trial_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

      if (fetchError || !currentTrial) {
        // Create trial usage record for today if it doesn't exist
        const { error: createError } = await supabase
          .from('trial_usage')
          .insert({
            user_id: userId,
            ai_messages_used: Math.max(0, aiMessagesDelta),
            tokens_used: Math.max(0, tokensDelta),
            humanizer_words_used: 0,
            usage_date: today
          });

        return !createError;
      }

      // Update today's trial usage
      const { error: updateError } = await supabase
        .from('trial_usage')
        .update({
          ai_messages_used: Math.max(0, (currentTrial.ai_messages_used || 0) + aiMessagesDelta),
          tokens_used: Math.max(0, (currentTrial.tokens_used || 0) + tokensDelta)
        })
        .eq('user_id', userId)
        .eq('usage_date', today);

      return !updateError;
    } catch (error) {
      console.error('Failed to update trial usage:', error);
      return false;
    }
  }
}
