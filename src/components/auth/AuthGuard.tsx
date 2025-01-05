import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/auth'];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const clearAuthState = async () => {
    try {
      // Clear Supabase session
      await supabase.auth.signOut();
      
      // Clear any stored tokens from localStorage
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('sb-xqzlejcvvtjdrabofrxs-auth-token');
      
      // Clear any other auth-related items
      for (const key of Object.keys(localStorage)) {
        if (key.includes('supabase.auth.') || key.includes('-auth-token')) {
          localStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error('Error clearing auth state:', error);
    }
  };

  const handleAuthError = async (error: any, message: string) => {
    console.error(message, error);
    setIsLoading(false);
    
    // Check if error is related to invalid/expired token
    const isTokenError = error?.message?.includes('JWT') || 
                        error?.message?.includes('token') ||
                        error?.message?.includes('session_not_found');
    
    if (isTokenError) {
      console.log('Detected token error, clearing auth state');
      await clearAuthState();
    }
    
    toast({
      title: "Authentication Error",
      description: isTokenError ? "Your session has expired. Please sign in again." : "Please sign in again.",
      variant: "destructive",
    });
    
    navigate('/auth', { state: { returnTo: location.pathname } });
  };

  useEffect(() => {
    let mounted = true;
    let authListener: any = null;

    const checkAuth = async () => {
      try {
        if (PUBLIC_ROUTES.includes(location.pathname)) {
          setIsLoading(false);
          return;
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          await handleAuthError(sessionError, 'Error checking auth session:');
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth page');
          if (mounted) {
            setIsLoading(false);
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        // Verify the session is still valid
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          await handleAuthError(userError, 'Session invalid:');
          return;
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          await handleAuthError(error, 'Error in auth check:');
        }
      }
    };

    checkAuth();

    const setupAuthListener = async () => {
      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event);
          
          if (event === 'SIGNED_OUT' || (!session && !PUBLIC_ROUTES.includes(location.pathname))) {
            if (mounted) {
              setIsLoading(false);
              navigate('/auth');
            }
          } else if (event === 'SIGNED_IN' && session) {
            try {
              const { error: verifyError } = await supabase.auth.getUser();
              if (verifyError) {
                await handleAuthError(verifyError, 'New session verification failed:');
              } else if (mounted) {
                setIsLoading(false);
              }
            } catch (error) {
              if (mounted) {
                await handleAuthError(error, 'Error verifying new session:');
              }
            }
          }
        });
        
        authListener = subscription;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    setupAuthListener();

    return () => {
      mounted = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [navigate, location.pathname, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return <>{children}</>;
};