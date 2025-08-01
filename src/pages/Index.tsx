import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScribeAI } from '@/components/ScribeAI';
import { useAuth } from '@/hooks/useAuth';

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Index page - loading:', loading, 'isAuthenticated:', isAuthenticated);
    if (!loading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to auth');
      navigate('/auth');
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

  return <ScribeAI />;
};

export default Index;
