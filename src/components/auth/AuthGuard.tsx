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
          navigate('/auth', { state: { returnTo: location.pathname } });
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth page');
          navigate('/auth', { state: { returnTo: location.pathname } });
          return;
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error in auth check:', error);
        navigate('/auth', { state: { returnTo: location.pathname } });
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || (!session && !PUBLIC_ROUTES.includes(location.pathname))) {
        console.log('Auth state changed, no session, redirecting to auth');
        navigate('/auth');
      }
    });

    return () => {
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