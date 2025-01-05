import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { clearAuthStorage, isTokenError } from "@/utils/authStorage";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const { redirectToAuth } = useAuthRedirect();
  const mountedRef = useRef(false);

  const handleAuthError = async (error: any) => {
    console.error('Auth error:', error);
    
    if (isTokenError(error)) {
      console.log('Detected token/storage error, clearing auth state');
      await clearAuthStorage();
      redirectToAuth("Your session has expired. Please sign in again.");
    } else {
      setIsLoading(false);
      redirectToAuth("Authentication error. Please sign in again.");
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          await handleAuthError(sessionError);
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth page');
          redirectToAuth();
          return;
        }

        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          await handleAuthError(userError);
          return;
        }

        if (mountedRef.current) {
          setIsLoading(false);
        }
      } catch (error) {
        if (mountedRef.current) {
          await handleAuthError(error);
        }
      }
    };

    const setupAuthListener = async () => {
      const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_OUT' || (!session && !location.pathname.startsWith('/shared'))) {
            if (mountedRef.current) {
              await clearAuthStorage();
              redirectToAuth();
            }
          } else if (event === 'SIGNED_IN' && session) {
            try {
              const { error: verifyError } = await supabase.auth.getUser();
              if (verifyError) {
                await handleAuthError(verifyError);
              } else if (mountedRef.current) {
                setIsLoading(false);
              }
            } catch (error) {
              if (mountedRef.current) {
                await handleAuthError(error);
              }
            }
          }
        }
      );

      return authListener;
    };

    let authListener: { unsubscribe: () => void } | undefined;

    const initialize = async () => {
      await checkAuth();
      authListener = await setupAuthListener();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [location.pathname]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}