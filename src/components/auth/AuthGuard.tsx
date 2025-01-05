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
  const authTimeoutRef = useRef<NodeJS.Timeout>();

  const handleAuthError = async (error: any) => {
    console.error('Auth error:', error);
    if (mountedRef.current) {
      if (isTokenError(error)) {
        console.log('Detected token/storage error, clearing auth state');
        await clearAuthStorage();
      }
      setIsLoading(false);
      setIsAuthenticated(false);
      if (!location.pathname.startsWith('/shared')) {
        redirectToAuth("Authentication error. Please sign in again.");
      }
    }
  };

  const setupAuthTimeout = () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    
    authTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        console.log('Auth check timed out');
        setIsLoading(false);
        setIsAuthenticated(false);
      }
    }, 5000); // Reduced timeout to 5 seconds
  };

  const completeAuthCheck = (authenticated: boolean) => {
    if (mountedRef.current) {
      console.log('Completing auth check, authenticated:', authenticated);
      setIsAuthenticated(authenticated);
      setIsLoading(false);
      authCheckedRef.current = true;
      
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let authListener: { unsubscribe: () => void } | undefined;

    const checkAuth = async () => {
      if (authCheckedRef.current) {
        return;
      }

      try {
        setupAuthTimeout();
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          await handleAuthError(sessionError);
          return;
        }

        if (!session) {
          completeAuthCheck(false);
          return;
        }

        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          await handleAuthError(userError);
          return;
        }

        completeAuthCheck(true);
        
      } catch (error) {
        await handleAuthError(error);
      }
    };

    const setupAuthListener = () => {
      return supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_OUT' || !session) {
          if (mountedRef.current) {
            await clearAuthStorage();
            completeAuthCheck(false);
          }
        } else if (event === 'SIGNED_IN' && session) {
          try {
            const { error: verifyError } = await supabase.auth.getUser();
            if (verifyError) {
              await handleAuthError(verifyError);
            } else {
              completeAuthCheck(true);
            }
          } catch (error) {
            await handleAuthError(error);
          }
        }
      });
    };

    const initialize = async () => {
      const { data: { subscription } } = setupAuthListener();
      authListener = { unsubscribe: () => subscription.unsubscribe() };
      await checkAuth();
    };

    initialize();

    return () => {
      mountedRef.current = false;
      authCheckedRef.current = false;
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
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
    return null;
  }

  return <>{children}</>;
}