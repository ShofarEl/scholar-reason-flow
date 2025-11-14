import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DatabaseTest: React.FC = () => {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testDatabase = async () => {
      const testResults: any = {};

      // Test subscriptions table
      try {
        const { data: subscriptions, error: subError } = await supabase
          .from('subscriptions')
          .select('*')
          .limit(5);
        
        testResults.subscriptions = {
          success: !subError,
          error: subError?.message,
          count: subscriptions?.length || 0,
          data: subscriptions
        };
      } catch (error) {
        testResults.subscriptions = { success: false, error: error };
      }

      // Test payment_history table
      try {
        const { data: payments, error: payError } = await supabase
          .from('payment_history')
          .select('*')
          .limit(5);
        
        testResults.payment_history = {
          success: !payError,
          error: payError?.message,
          count: payments?.length || 0,
          data: payments
        };
      } catch (error) {
        testResults.payment_history = { success: false, error: error };
      }

      // Test subscription_usage table
      try {
        const { data: usage, error: usageError } = await supabase
          .from('subscription_usage')
          .select('*')
          .limit(5);
        
        testResults.subscription_usage = {
          success: !usageError,
          error: usageError?.message,
          count: usage?.length || 0,
          data: usage
        };
      } catch (error) {
        testResults.subscription_usage = { success: false, error: error };
      }

      // Test trial_usage table
      try {
        const { data: trial, error: trialError } = await supabase
          .from('trial_usage')
          .select('*')
          .limit(5);
        
        testResults.trial_usage = {
          success: !trialError,
          error: trialError?.message,
          count: trial?.length || 0,
          data: trial
        };
      } catch (error) {
        testResults.trial_usage = { success: false, error: error };
      }

      setResults(testResults);
      setLoading(false);
    };

    testDatabase();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Testing database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Test Results</h1>
        
        <div className="space-y-6">
          {Object.entries(results).map(([tableName, result]: [string, any]) => (
            <div key={tableName} className="bg-card p-6 rounded-lg border">
              <h2 className="text-xl font-semibold mb-4 capitalize">
                {tableName.replace('_', ' ')} Table
                {result.success ? (
                  <span className="ml-2 text-green-600">✅</span>
                ) : (
                  <span className="ml-2 text-red-600">❌</span>
                )}
              </h2>
              
              <div className="space-y-2 mb-4">
                <p><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</p>
                <p><strong>Count:</strong> {result.count}</p>
                {result.error && (
                  <p><strong>Error:</strong> <span className="text-red-600">{result.error}</span></p>
                )}
              </div>

              {result.data && result.data.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Sample Data:</h3>
                  <pre className="bg-muted p-4 rounded text-sm overflow-auto max-h-96">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-blue-800 mb-2">Next Steps</h2>
          <p className="text-blue-700">
            This test shows what tables exist and what data is available. 
            Use this information to fix the application queries.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseTest;
