import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

const QuickDBTest: React.FC = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDatabase = async () => {
    setLoading(true);
    const testResults: any = {};

    // Test all possible tables
    const tables = ['subscriptions', 'payment_history', 'subscription_usage', 'trial_usage', 'profiles'];
    
    for (const table of tables) {
      try {
        console.log(`Testing table: ${table}`);
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(3);
        
        testResults[table] = {
          exists: !error,
          error: error?.message,
          count: count || 0,
          sampleData: data || []
        };
        
        console.log(`${table} result:`, { exists: !error, count: count || 0, error: error?.message });
      } catch (err) {
        testResults[table] = {
          exists: false,
          error: err,
          count: 0,
          sampleData: []
        };
        console.log(`${table} error:`, err);
      }
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Quick Database Test</h1>
        
        <button 
          onClick={testDatabase}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-8"
        >
          {loading ? 'Testing...' : 'Test Database'}
        </button>

        {results && (
          <div className="space-y-4">
            {Object.entries(results).map(([tableName, result]: [string, any]) => (
              <div key={tableName} className="bg-card p-4 rounded border">
                <h3 className="font-bold text-lg">
                  {tableName} 
                  {result.exists ? (
                    <span className="text-green-600 ml-2">✅ EXISTS</span>
                  ) : (
                    <span className="text-red-600 ml-2">❌ NOT FOUND</span>
                  )}
                </h3>
                <p><strong>Count:</strong> {result.count}</p>
                {result.error && (
                  <p className="text-red-600"><strong>Error:</strong> {result.error}</p>
                )}
                {result.sampleData.length > 0 && (
                  <div className="mt-2">
                    <p><strong>Sample Data:</strong></p>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(result.sampleData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuickDBTest;
