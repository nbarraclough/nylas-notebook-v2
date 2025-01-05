import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Define public routes that don't require authentication
  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared');

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Session check error:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      setIsAuthenticated(!!session);
      setIsLoading(false);

      // If user signs out and isn't on a public route, redirect to auth
      if (!session && !isPublicRoute) {
        navigate('/auth', { state: { returnTo: location.pathname } });
      }
    });

    // Initial check
    checkSession();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute]);

  // Show loading screen only for protected routes during initial load
  if (isLoading && !isPublicRoute) {
    return <LoadingScreen />;
  }

  // Allow access to public routes regardless of auth state
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Redirect to auth if not authenticated and trying to access protected route
  if (!isAuthenticated && !isPublicRoute) {
    navigate('/auth', { state: { returnTo: location.pathname } });
    return null;
  }

  // User is authenticated or accessing public route
  return <>{children}</>;
}