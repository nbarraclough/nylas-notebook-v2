import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { isTokenError } from "@/utils/authStorage";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Define public routes that don't require authentication
  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared');

  useEffect(() => {
    let mounted = true;

    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          if (isTokenError(error)) {
            console.error('Token error:', error);
            // Clear local storage and redirect to auth
            localStorage.clear();
            sessionStorage.clear();
            if (!isPublicRoute) {
              navigate('/auth', { state: { returnTo: location.pathname } });
            }
          }
          throw error;
        }
        
        if (mounted) {
          setIsAuthenticated(!!session);
          
          // If no session and not on public route, redirect to auth
          if (!session && !isPublicRoute) {
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
        if (mounted) {
          setIsAuthenticated(false);
          if (!isPublicRoute) {
            toast({
              title: "Authentication Error",
              description: "Please sign in again",
              variant: "destructive",
            });
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (mounted) {
        setIsAuthenticated(!!session);
        
        // Handle various auth events
        switch (event) {
          case 'SIGNED_IN':
            // Refresh the session
            await supabase.auth.getSession();
            break;
          case 'SIGNED_OUT':
            if (!isPublicRoute) {
              navigate('/auth', { state: { returnTo: location.pathname } });
            }
            break;
          case 'TOKEN_REFRESHED':
            setIsAuthenticated(true);
            break;
          case 'USER_UPDATED':
            // Refresh the session to get updated user data
            await supabase.auth.getSession();
            break;
        }
        
        setIsLoading(false);
      }
    });

    // Initial check
    checkSession();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute, toast]);

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