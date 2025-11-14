import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ADMIN_EMAIL = 'officialthinqscribe@gmail.com';

export default function AdminSimple() {
  const navigate = useNavigate();
  const [authStatus, setAuthStatus] = useState<string>('checking');
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          setAuthStatus(`Error: ${error.message}`);
          return;
        }

        if (!session?.user) {
          setAuthStatus('No session - redirecting to auth');
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }

        const email = session.user.email || '';
        setUserEmail(email);

        if (email === ADMIN_EMAIL) {
          setAuthStatus('Authorized - Welcome Admin!');
        } else {
          setAuthStatus(`Not authorized - Email: ${email} (Expected: ${ADMIN_EMAIL})`);
          setTimeout(() => navigate('/'), 3000);
        }
      } catch (error) {
        setAuthStatus(`Exception: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center mb-6">Admin Access Test</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Status:</strong>
            <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
              {authStatus}
            </div>
          </div>

          {userEmail && (
            <div>
              <strong>Your Email:</strong>
              <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                {userEmail}
              </div>
            </div>
          )}

          <div>
            <strong>Required Email:</strong>
            <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
              {ADMIN_EMAIL}
            </div>
          </div>

          <div>
            <strong>Match:</strong>
            <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
              {userEmail === ADMIN_EMAIL ? '✅ YES' : '❌ NO'}
            </div>
          </div>
        </div>

        {authStatus === 'Authorized - Welcome Admin!' && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <h2 className="font-semibold text-green-800 mb-2">Success!</h2>
            <p className="text-green-600 text-sm">
              You are authorized to access the admin dashboard. The routing is working correctly.
            </p>
            <button 
              onClick={() => navigate('/admin')}
              className="mt-3 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Go to Full Admin Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}