import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/auth'];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Skip check for public routes
        if (PUBLIC_ROUTES.includes(location.pathname)) {
          setIsLoading(false);
          return;
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error checking auth session:', error);
          if (mounted) {
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth page');
          if (mounted) {
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        // Verify the session is still valid by making a test request
        const { error: testError } = await supabase.auth.getUser();
        if (testError) {
          console.error('Session invalid:', testError);
          await supabase.auth.signOut();
          if (mounted) {
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        if (mounted) {
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || (!session && !PUBLIC_ROUTES.includes(location.pathname))) {
        console.log('Auth state changed, no session, redirecting to auth');
        if (mounted) {
          // Clear any existing session data
          await supabase.auth.signOut();
          navigate('/auth');
        }
      } else if (event === 'SIGNED_IN' && session) {
        // Verify the new session
        const { error: verifyError } = await supabase.auth.getUser();
        if (verifyError) {
          console.error('New session verification failed:', verifyError);
          if (mounted) {
            await supabase.auth.signOut();
            navigate('/auth');
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return <>{children}</>;
};