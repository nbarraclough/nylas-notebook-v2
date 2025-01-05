import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const location = useLocation();
  const { redirectToAuth } = useAuthRedirect();

  useEffect(() => {
    // Initial session check
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session check error:', error);
          setAuthState('unauthenticated');
          return;
        }

        if (!session) {
          setAuthState('unauthenticated');
          return;
        }

        // Verify user exists
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('User verification error:', userError);
          setAuthState('unauthenticated');
          return;
        }

        setAuthState('authenticated');
      } catch (error) {
        console.error('Auth check error:', error);
        setAuthState('unauthenticated');
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);

      if (event === 'SIGNED_OUT' || !session) {
        setAuthState('unauthenticated');
      } else if (event === 'SIGNED_IN' && session) {
        const { error: verifyError } = await supabase.auth.getUser();
        if (verifyError) {
          console.error('User verification error:', verifyError);
          setAuthState('unauthenticated');
        } else {
          setAuthState('authenticated');
        }
      }
    });

    // Initial check
    checkSession();

    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Show loading screen while checking auth
  if (authState === 'loading') {
    return <LoadingScreen />;
  }

  // Allow access to shared routes even when unauthenticated
  if (location.pathname.startsWith('/shared')) {
    return <>{children}</>;
  }

  // Redirect to auth page if unauthenticated
  if (authState === 'unauthenticated') {
    redirectToAuth();
    return null;
  }

  // User is authenticated, render protected content
  return <>{children}</>;
}