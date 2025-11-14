export type SubscriptionPlan = 'basic' | 'premium';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'cancelled';

export interface SubscriptionPlanConfig {
  id: SubscriptionPlan;
  name: string;
  price: number;
  description: string;
  features: string[];
  aiAccess: boolean;
  humanizerAccess: boolean;
  humanizerWordLimit: number;
  aiMessageLimit?: number;
  planWordLimit: number; // total words (input+output) budget per billing period
}

export interface UserSubscription {
  userId: string;
  plan: SubscriptionPlan;
  status: 'active' | 'expired' | 'cancelled';
  startDate: Date;
  endDate: Date;
  usage: UsageStats;
  paymentHistory: PaymentRecord[];
}

export interface UsageStats {
  aiMessagesUsed: number;
  humanizerWordsUsed: number;
  planWordsUsed: number; // counts input+output words across AI and humanizer
  lastResetDate: Date;
  dailyUsage: {
    aiMessages: number;
    humanizerWords: number;
    date: string;
  };
}

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paystackReference: string;
  plan: SubscriptionPlan;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PaystackPaymentRequest {
  amount: number;
  email: string;
  reference: string;
  callback_url: string;
  metadata: {
    plan: SubscriptionPlan;
    userId: string;
  };
}

export interface PaystackPaymentResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    reference: string;
    metadata: {
      plan: SubscriptionPlan;
      userId: string;
    };
    customer: {
      email: string;
    };
    paid_at: string;
    created_at: string;
  };
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanConfig> = {
  basic: {
    id: 'basic',
    name: 'Basic Plan',
    price: 1,
    description: 'Access to AI chat functionality',
    features: [
      'AI Chat Access',
      'Scholarly Writer',
      'Technical Writer',
      'Basic Support'
    ],
    aiAccess: true,
    humanizerAccess: false,
    humanizerWordLimit: 0,
    aiMessageLimit: 30,
    planWordLimit: 25000
  },
  premium: {
    id: 'premium',
    name: 'Premium Plan',
    price: 6,
    description: 'Full access including humanizer with 10,000 word limit',
    features: [
      'All Basic Features',
      'Humanizer Access',
      '10,000 Word Humanizer Limit',
      'Priority Support',
      'Advanced Export Options'
    ],
    aiAccess: true,
    humanizerAccess: true,
    humanizerWordLimit: 10000,
    aiMessageLimit: 100,
    planWordLimit: 100000
  }
};
