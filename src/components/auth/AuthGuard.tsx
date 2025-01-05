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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const location = useLocation();
  const { redirectToAuth } = useAuthRedirect();
  const mountedRef = useRef(false);
  const authCheckedRef = useRef(false);

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
    let authListener: { unsubscribe: () => void } | undefined;

    const checkAuth = async () => {
      if (authCheckedRef.current) return;
      
      try {
        console.log('Checking initial auth state...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          await handleAuthError(sessionError);
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth page');
          if (mountedRef.current) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          redirectToAuth();
          return;
        }

        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          await handleAuthError(userError);
          return;
        }

        if (mountedRef.current) {
          setIsAuthenticated(true);
          setIsLoading(false);
        }
        
        authCheckedRef.current = true;
      } catch (error) {
        if (mountedRef.current) {
          await handleAuthError(error);
        }
      }
    };

    const setupAuthListener = () => {
      console.log('Setting up auth listener...');
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event);
          
          if (event === 'SIGNED_OUT' || (!session && !location.pathname.startsWith('/shared'))) {
            if (mountedRef.current) {
              await clearAuthStorage();
              setIsAuthenticated(false);
              setIsLoading(false);
              redirectToAuth();
            }
          } else if (event === 'SIGNED_IN' && session) {
            try {
              const { error: verifyError } = await supabase.auth.getUser();
              if (verifyError) {
                await handleAuthError(verifyError);
              } else if (mountedRef.current) {
                setIsAuthenticated(true);
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

      return subscription;
    };

    const initialize = async () => {
      authListener = setupAuthListener();
      await checkAuth();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      authCheckedRef.current = false;
      if (authListener) {
        authListener.unsubscribe();
      }
    };
  }, [location.pathname]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated && !location.pathname.startsWith('/shared')) {
    redirectToAuth();
    return <LoadingScreen />;
  }

  return <>{children}</>;
}