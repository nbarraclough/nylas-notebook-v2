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
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Define public routes that don't require authentication
  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared/');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          throw sessionError;
        }

        if (!session && !isPublicRoute) {
          await clearAuthStorage();
          navigate('/auth', { state: { returnTo: location.pathname } });
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Auth check error:', error);
        await clearAuthStorage();
        
        if (!isPublicRoute) {
          let errorMessage = "Please sign in again.";
          
          if (error.message?.includes('invalid_credentials')) {
            errorMessage = "Invalid login credentials. Please try again.";
          } else if (error.message?.includes('session_not_found')) {
            errorMessage = "Your session has expired. Please sign in again.";
          }
          
          toast({
            title: "Authentication Error",
            description: errorMessage,
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_OUT') {
        await clearAuthStorage();
        if (!isPublicRoute) {
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }

      if (mounted) {
        setIsLoading(false);
      }
    });

    checkSession();

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

  // Render children (user is either authenticated or on a public route)
  return <>{children}</>;
}