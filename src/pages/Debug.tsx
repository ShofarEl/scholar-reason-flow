import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Debug: React.FC = () => {
  const { user, isAuthenticated, loading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const runDebugChecks = async () => {
      const info: any = {
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        isAuthenticated,
        loading,
        timestamp: new Date().toISOString()
      };

      // User authentication info
      info.userInfo = {
        isLoggedIn: !!user,
        email: user?.email,
        id: user?.id
      };

      // Check database tables
      try {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .limit(1);
        info.profilesTable = { exists: !profilesError, error: profilesError?.message };
      } catch (error) {
        info.profilesTable = { exists: false, error: error };
      }

      try {
        const { data: subscriptions, error: subsError } = await supabase
          .from('subscriptions')
          .select('*')
          .limit(1);
        info.subscriptionsTable = { exists: !subsError, error: subsError?.message };
      } catch (error) {
        info.subscriptionsTable = { exists: false, error: error };
      }

      try {
        const { data: payments, error: paymentsError } = await supabase
          .from('payment_history')
          .select('*')
          .limit(1);
        info.paymentHistoryTable = { exists: !paymentsError, error: paymentsError?.message };
      } catch (error) {
        info.paymentHistoryTable = { exists: false, error: error };
      }

      setDebugInfo(info);
    };

    runDebugChecks();
  }, [user, isAuthenticated, loading]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Debug Information</h1>
        
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <pre className="bg-muted p-4 rounded text-sm overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a 
                href="/" 
                className="block bg-secondary text-secondary-foreground px-4 py-2 rounded hover:bg-secondary/90"
              >
                Go to Home
              </a>
              <a 
                href="/auth" 
                className="block bg-destructive text-destructive-foreground px-4 py-2 rounded hover:bg-destructive/90"
              >
                Go to Auth
              </a>
            </div>
          </div>

          {user && (
            <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-green-800 mb-2">✅ User Logged In</h2>
              <p className="text-green-700">You are successfully authenticated.</p>
            </div>
          )}

          {!user && (
            <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
              <h2 className="text-xl font-semibold text-red-800 mb-2">❌ Not Logged In</h2>
              <p className="text-red-700">Please log in to access the application.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Debug;
