import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { supabase } from '@/integrations/supabase/client';
import EmailService from '@/services/emailService';
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import ResetPassword from '@/pages/ResetPassword';
import NotFound from '@/pages/NotFound';
import HumanizerPage from '@/pages/Humanizer';
import { PaymentSuccess } from '@/pages/PaymentSuccess';
import { Subscription } from '@/pages/Subscription';

function App() {
  useEffect(() => {
    // Handle OAuth callback
    const handleAuthCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (session && !error) {
        console.log('OAuth callback successful, user authenticated:', session.user.email);
        
        // Check if this is a new user (first-time sign-in)
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', session.user.id)
          .single();
        
        // If no profile exists or it was just created, send welcome email
        if (!profile || new Date(profile.created_at).getTime() > Date.now() - 60000) { // Within last minute
          try {
            const emailService = EmailService.getInstance();
            const userEmail = session.user.email;
            const userName = session.user.user_metadata?.full_name || 
                           session.user.user_metadata?.name || 
                           userEmail?.split('@')[0] || 
                           'User';
            
            await emailService.sendWelcomeEmail({
              to: userEmail!,
              name: userName
            });
            
            console.log('Welcome email sent to new Google user:', userEmail);
          } catch (emailError) {
            console.error('Failed to send welcome email to Google user:', emailError);
            // Don't fail the sign-in if email fails
          }
        }
        
        // Clear the URL hash and redirect to home
        window.location.hash = '';
        window.location.href = '/';
      }
    };

    // Check if we're in an OAuth callback (URL has access_token in hash)
    if (window.location.hash.includes('access_token')) {
      console.log('Detected OAuth callback, handling...');
      handleAuthCallback();
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/reset-password" element={<ResetPassword />} />
          <Route path="/humanizer" element={<HumanizerPage />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        <Toaster />
      </Router>
    </ThemeProvider>
  );
}

export default App;