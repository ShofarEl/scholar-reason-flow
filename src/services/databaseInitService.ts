import { supabase } from '@/integrations/supabase/client';

export interface DatabaseInitResult {
  success: boolean;
  message: string;
  tablesCreated: string[];
  errors: string[];
}

export class DatabaseInitService {
  // Initialize required database tables if they don't exist
  static async initializeDatabase(): Promise<DatabaseInitResult> {
    const result: DatabaseInitResult = {
      success: true,
      message: 'Database initialization completed',
      tablesCreated: [],
      errors: []
    };

    try {
      console.log('🔧 Starting database initialization...');

      // Check if tables exist and create them if needed
      const tableChecks = await this.checkAndCreateTables();
      
      result.tablesCreated = tableChecks.createdTables;
      result.errors = tableChecks.errors;
      
      if (tableChecks.errors.length > 0) {
        result.success = false;
        result.message = `Database initialization completed with ${tableChecks.errors.length} errors`;
      }

      console.log('✅ Database initialization completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      return {
        success: false,
        message: `Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tablesCreated: [],
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  private static async checkAndCreateTables(): Promise<{
    createdTables: string[];
    errors: string[];
  }> {
    const createdTables: string[] = [];
    const errors: string[] = [];

    // Note: In a real application, you would use Supabase migrations
    // This is a helper to check table existence and provide guidance
    console.log('📋 Checking database table status...');
    
    // Check subscriptions table
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log('⚠️ Subscriptions table does not exist');
        errors.push('Subscriptions table missing - needs to be created via Supabase migrations');
      } else {
        console.log('✅ Subscriptions table exists');
      }
    } catch (err) {
      console.log('⚠️ Error checking subscriptions table:', err);
      errors.push('Could not check subscriptions table');
    }

    // Check payment_history table
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log('⚠️ Payment history table does not exist');
        errors.push('Payment history table missing - needs to be created via Supabase migrations');
      } else {
        console.log('✅ Payment history table exists');
      }
    } catch (err) {
      console.log('⚠️ Error checking payment_history table:', err);
      errors.push('Could not check payment_history table');
    }

    // Check profiles table
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      if (error && error.code === '42P01') {
        console.log('⚠️ Profiles table does not exist');
        errors.push('Profiles table missing - needs to be created via Supabase migrations');
      } else {
        console.log('✅ Profiles table exists');
      }
    } catch (err) {
      console.log('⚠️ Error checking profiles table:', err);
      errors.push('Could not check profiles table');
    }

    return { createdTables, errors };
  }

  // Get database setup instructions
  static getSetupInstructions(): string[] {
    return [
      '1. Ensure your Supabase project is properly configured',
      '2. Run the following SQL commands in your Supabase SQL editor:',
      '',
      '-- Create subscriptions table',
      'CREATE TABLE IF NOT EXISTS subscriptions (',
      '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,',
      '  user_id UUID NOT NULL REFERENCES auth.users(id),',
      '  plan TEXT NOT NULL CHECK (plan IN (\'basic\', \'premium\')),',
      '  status TEXT NOT NULL DEFAULT \'active\' CHECK (status IN (\'active\', \'expired\', \'cancelled\')),',
      '  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
      '  end_date TIMESTAMPTZ NOT NULL,',
      '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
      '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      ');',
      '',
      '-- Create payment_history table',
      'CREATE TABLE IF NOT EXISTS payment_history (',
      '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,',
      '  subscription_id UUID NOT NULL REFERENCES subscriptions(id),',
      '  paystack_reference TEXT NOT NULL UNIQUE,',
      '  paystack_id TEXT,',
      '  amount DECIMAL(10,2) NOT NULL,',
      '  currency TEXT NOT NULL DEFAULT \'NGN\',',
      '  status TEXT NOT NULL CHECK (status IN (\'pending\', \'success\', \'failed\', \'cancelled\')),',
      '  plan TEXT NOT NULL CHECK (plan IN (\'basic\', \'premium\')),',
      '  customer_email TEXT,',
      '  paid_at TIMESTAMPTZ,',
      '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      ');',
      '',
      '-- Create subscription_usage table',
      'CREATE TABLE IF NOT EXISTS subscription_usage (',
      '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,',
      '  subscription_id UUID NOT NULL REFERENCES subscriptions(id),',
      '  user_id UUID NOT NULL REFERENCES auth.users(id),',
      '  ai_messages_used INTEGER NOT NULL DEFAULT 0,',
      '  humanizer_words_used INTEGER NOT NULL DEFAULT 0,',
      '  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,',
      '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
      '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      ');',
      '',
      '-- Create trial_usage table',
      'CREATE TABLE IF NOT EXISTS trial_usage (',
      '  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,',
      '  user_id UUID NOT NULL REFERENCES auth.users(id),',
      '  ai_messages INTEGER NOT NULL DEFAULT 0,',
      '  tokens_used INTEGER NOT NULL DEFAULT 0,',
      '  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
      '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
      '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      ');',
      '',
      '-- Create profiles table (if not exists)',
      'CREATE TABLE IF NOT EXISTS profiles (',
      '  id UUID REFERENCES auth.users(id) PRIMARY KEY,',
      '  full_name TEXT,',
      '  name TEXT,',
      '  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),',
      '  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()',
      ');',
      '',
      '3. Set up Row Level Security (RLS) policies as needed',
      '4. Test the application to verify data fetching works'
    ];
  }
}
