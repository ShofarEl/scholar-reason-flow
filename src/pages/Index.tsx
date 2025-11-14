import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScribeAITabs } from '@/components/ScribeAITabs';
import ChatGPTMobileChat from '@/mobile/ChatGPTMobileChat';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  // Call all hooks unconditionally before any early returns to preserve hook order
  const isMobile = useIsMobile();

  useEffect(() => {
    console.log('Index page - loading:', loading, 'isAuthenticated:', isAuthenticated);
    
    // Only redirect if we're sure the user is not authenticated
    // Add extra checks to prevent redirects during token refresh
    if (!loading && !isAuthenticated) {
      const checkAndRedirect = async () => {
        try {
          // Check localStorage for existing session tokens
          // This prevents redirects during token refresh operations
          const keys = Object.keys(localStorage);
          const hasAuthToken = keys.some(key => 
            key.includes('supabase') && key.includes('auth-token')
          );
          
          if (hasAuthToken) {
            console.log('Auth token found in localStorage, waiting for session restoration');
            return; // Don't redirect if there's a stored session
          }
        } catch (error) {
          console.error('Error checking localStorage:', error);
        }
        
        // Final check: verify authentication state hasn't changed
        if (!isAuthenticated) {
          console.log('User not authenticated, redirecting to auth');
          navigate('/auth');
        }
      };
      
      // Add a delay to avoid redirecting during token refresh
      // This is especially important during AI streaming operations
      const timeoutId = setTimeout(checkAndRedirect, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return isMobile ? <ChatGPTMobileChat /> : <ScribeAITabs />;
};

export default Index;