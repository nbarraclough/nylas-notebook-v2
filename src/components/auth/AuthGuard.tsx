import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/auth'];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      // Skip check for public routes
      if (PUBLIC_ROUTES.includes(location.pathname)) {
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('No session found, redirecting to auth page');
        navigate('/auth', { state: { returnTo: location.pathname } });
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session && !PUBLIC_ROUTES.includes(location.pathname)) {
        console.log('Auth state changed, no session, redirecting to auth');
        navigate('/auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  return <>{children}</>;
};