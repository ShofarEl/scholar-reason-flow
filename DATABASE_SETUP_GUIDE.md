# Database Setup Guide for Admin Dashboard

## Problem
Your admin dashboard is showing empty data because the required database tables don't exist in your Supabase database.

## Solution

### Step 1: Access Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to the **SQL Editor** tab

### Step 2: Run the Database Setup Script
1. Copy the contents of `database-setup.sql` file
2. Paste it into the SQL Editor
3. Click **Run** to execute the script

### Step 3: Verify Tables Were Created
After running the script, you should see:
- ✅ `profiles` table created
- ✅ `subscriptions` table created  
- ✅ `payment_history` table created
- ✅ `subscription_usage` table created
- ✅ `trial_usage` table created

### Step 4: Test Admin Dashboard
1. Go back to your admin dashboard (`/admin`)
2. You should now see the database tables are detected
3. The dashboard should load without 404 errors

## What the Script Does

The script creates the following tables:

### `profiles`
- Stores user profile information
- Linked to `auth.users` table

### `subscriptions`
- Tracks user subscription plans (basic/premium)
- Stores subscription status and dates

### `payment_history`
- Records payment transactions
- Links to subscriptions and stores Paystack references

### `subscription_usage`
- Tracks usage statistics for subscriptions
- Monitors AI messages and humanizer word usage

### `trial_usage`
- Tracks trial usage statistics
- Monitors free trial limits

## Security
The script also sets up:
- Row Level Security (RLS) policies
- Proper indexes for performance
- Foreign key relationships

## Troubleshooting

If you encounter issues:

1. **Permission Errors**: Make sure you're logged in as the project owner
2. **Table Already Exists**: The script uses `IF NOT EXISTS` so it's safe to run multiple times
3. **RLS Issues**: You may need to adjust the RLS policies based on your specific needs

## Next Steps

After running the script:
1. Test the admin dashboard functionality
2. Add some sample data if needed for testing
3. Configure additional RLS policies if required

The admin dashboard should now work properly and show database statistics instead of empty data.
