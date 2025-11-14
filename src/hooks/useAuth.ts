import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Setting up auth state listener');
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // Handle different auth events carefully to prevent unwanted redirects
        if (event === 'TOKEN_REFRESHED') {
          // During token refresh, silently update session without changing loading state
          // This prevents redirects during AI streaming or other operations
          console.log('Token refreshed, updating session silently');
          setSession(session);
          setUser(session?.user ?? null);
          // Don't change loading state during refresh
        } else if (event === 'SIGNED_IN') {
          console.log('User signed in');
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        } else if (event === 'SIGNED_OUT') {
          console.log('User signed out');
          setSession(null);
          setUser(null);
          setLoading(false);
        } else if (event === 'USER_UPDATED') {
          // User metadata updated, keep session active
          console.log('User updated');
          if (session) {
            setSession(session);
            setUser(session?.user ?? null);
          }
        } else {
          // For other events, only update if we have a session
          if (session) {
            setSession(session);
            setUser(session?.user ?? null);
          }
          setLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return {
    user,
    session,
    loading,
    signOut,
    isAuthenticated: !!user
  };
};