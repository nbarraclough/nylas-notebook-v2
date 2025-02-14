
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { clearAuthStorage } from "@/utils/authStorage";

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
  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared/');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        console.log('Checking auth session for path:', location.pathname);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isPublicRoute) {
          console.log('No session found, redirecting to auth');
          navigate('/auth', { state: { returnTo: location.pathname } });
        } else if (session) {
          console.log('Session found:', session.user.id);
          setIsAuthenticated(true);
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Auth check error:', error);
        
        if (!isPublicRoute) {
          toast({
            title: "Authentication Error",
            description: "Please sign in again.",
            variant: "destructive",
          });
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        if (!isPublicRoute) {
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      } else if (event === 'SIGNED_IN' && session) {
        setIsAuthenticated(true);
      }

      if (mounted) {
        setIsLoading(false);
      }
    });

    checkSession();

    // Cleanup function to prevent memory leaks
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute, toast]);

  // Show loading screen only for protected routes during initial load
  if (isLoading && !isPublicRoute) {
    console.log('Showing loading screen for protected route');
    return <LoadingScreen />;
  }

  // If it's a public route, render regardless of auth state
  if (isPublicRoute) {
    console.log('Rendering public route');
    return <>{children}</>;
  }

  // For protected routes, only render when authenticated
  if (isAuthenticated) {
    console.log('Rendering protected route for authenticated user');
    return <>{children}</>;
  }

  // Return null while waiting for auth check on protected routes
  console.log('Waiting for auth check, rendering null');
  return null;
}
