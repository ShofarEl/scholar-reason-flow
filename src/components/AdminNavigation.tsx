import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ADMIN_EMAIL = 'officialthinqscribe@gmail.com';

export const AdminNavigation: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  // Only show admin link to authorized user
  if (user?.email !== ADMIN_EMAIL) {
    return null;
  }

  const isAdminPage = location.pathname === '/admin';

  return (
    <div className="fixed top-4 right-4 z-50">
      {isAdminPage ? (
        <Button asChild variant="outline" size="sm">
          <Link to="/">
            <Home className="h-4 w-4 mr-2" />
            Back to App
          </Link>
        </Button>
      ) : (
        <Button asChild variant="outline" size="sm">
          <Link to="/admin">
            <Shield className="h-4 w-4 mr-2" />
            Admin
          </Link>
        </Button>
      )}
    </div>
  );
};