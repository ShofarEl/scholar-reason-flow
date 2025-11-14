import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'officialthinqscribe@gmail.com';

export default function AdminDebug() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkEverything = async () => {
      try {
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        // Check user
        const user = session?.user;
        const isAuthorized = user?.email === ADMIN_EMAIL;
        
        // Try to query a simple table
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        setDebugInfo({
          hasSession: !!session,
          sessionError: sessionError?.message,
          userEmail: user?.email,
          isAuthorized,
          adminEmail: ADMIN_EMAIL,
          profilesCount: profilesData,
          profilesError: profilesError?.message,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        setDebugInfo({
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };

    checkEverything();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading debug info...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Debug Information</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Debug Data</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Authorization Status</h2>
          <div className="space-y-2">
            <p><strong>Has Session:</strong> {debugInfo.hasSession ? '✅ Yes' : '❌ No'}</p>
            <p><strong>User Email:</strong> {debugInfo.userEmail || 'Not logged in'}</p>
            <p><strong>Admin Email:</strong> {debugInfo.adminEmail}</p>
            <p><strong>Is Authorized:</strong> {debugInfo.isAuthorized ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Database Access:</strong> {debugInfo.profilesError ? '❌ Error' : '✅ Working'}</p>
          </div>
        </div>

        {debugInfo.error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-800">Error</h2>
            <p className="text-red-600">{debugInfo.error}</p>
          </div>
        )}
      </div>
    </div>
  );
}