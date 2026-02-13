import { Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthRedirectHandler } from '@/components/auth/AuthRedirectHandler';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Post-authentication redirect page that routes users based on their roles:
 * 1. Super admins -> /admin
 * 2. Dentists/Providers -> /dentist/dashboard
 * 3. Patients -> /dashboard
 */
export default function AuthRedirect() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
  }, []);

  if (isAuthenticated === null) {
    return <LoadingSpinner variant="overlay" message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <AuthRedirectHandler />;
}
