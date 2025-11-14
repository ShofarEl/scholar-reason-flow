-- Database Setup Script for Admin Dashboard
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_email TEXT,
  plan TEXT NOT NULL CHECK (plan IN ('basic', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS payment_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'cancelled')),
  customer_email TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subscription_usage table
CREATE TABLE IF NOT EXISTS subscription_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ai_messages_used INTEGER NOT NULL DEFAULT 0,
  humanizer_words_used INTEGER NOT NULL DEFAULT 0,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create trial_usage table
CREATE TABLE IF NOT EXISTS trial_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  ai_messages INTEGER NOT NULL DEFAULT 0,
  tokens_used INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_subscription_usage_user_id ON subscription_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_usage_user_id ON trial_usage(user_id);

-- Insert some sample data for testing (optional)
-- You can uncomment these lines to add test data

/*
-- Sample subscription for testing
INSERT INTO subscriptions (user_id, user_email, plan, status, start_date, end_date)
VALUES (
  (SELECT id FROM auth.users LIMIT 1),
  'officialthinqscribe@gmail.com',
  'premium',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month'
) ON CONFLICT DO NOTHING;

-- Sample payment history for testing
INSERT INTO payment_history (subscription_id, paystack_reference, amount, currency, status, customer_email, paid_at)
VALUES (
  (SELECT id FROM subscriptions LIMIT 1),
  'TST_' || EXTRACT(EPOCH FROM NOW())::TEXT,
  5000.00,
  'NGN',
  'success',
  'officialthinqscribe@gmail.com',
  NOW()
) ON CONFLICT DO NOTHING;
*/

-- Grant necessary permissions
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_usage ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (you may need to adjust these based on your needs)
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own subscriptions" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own payment history" ON payment_history
  FOR SELECT USING (
    subscription_id IN (
      SELECT id FROM subscriptions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their own usage" ON subscription_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own trial usage" ON trial_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Success message
SELECT 'Database tables created successfully!' as message;
