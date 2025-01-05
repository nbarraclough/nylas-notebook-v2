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
    
    if (isTokenError(error)) {
      console.log('Detected token/storage error, clearing auth state');
      await clearAuthStorage();
      redirectToAuth("Your session has expired. Please sign in again.");
    } else {
      setIsLoading(false);
      redirectToAuth("Authentication error. Please sign in again.");
    }
  };

  const setupAuthTimeout = () => {
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
    }
    
    authTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        console.log('Auth check timed out, redirecting to auth...');
        setIsLoading(false);
        setIsAuthenticated(false);
        if (!location.pathname.startsWith('/shared')) {
          redirectToAuth("Authentication timed out. Please sign in again.");
        }
      }
    }, 10000); // 10 second timeout
  };

  const completeAuthCheck = (authenticated: boolean) => {
    console.log('Completing auth check, authenticated:', authenticated);
    if (mountedRef.current) {
      setIsAuthenticated(authenticated);
      setIsLoading(false);
      authCheckedRef.current = true;
      
      if (authTimeoutRef.current) {
        clearTimeout(authTimeoutRef.current);
      }
    }
  };

  useEffect(() => {
    console.log('AuthGuard mounted, initializing...');
    mountedRef.current = true;
    let authListener: { unsubscribe: () => void } | undefined;

    const checkAuth = async () => {
      if (authCheckedRef.current) {
        console.log('Auth already checked, skipping...');
        return;
      }
      
      try {
        console.log('Checking initial auth state...');
        setupAuthTimeout();
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          await handleAuthError(sessionError);
          return;
        }

        if (!session) {
          console.log('No session found');
          completeAuthCheck(false);
          if (!location.pathname.startsWith('/shared')) {
            redirectToAuth();
          }
          return;
        }

        console.log('Session found, verifying user...');
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('User verification error:', userError);
          await handleAuthError(userError);
          return;
        }

        console.log('User verified, setting authenticated state');
        completeAuthCheck(true);
        
      } catch (error) {
        console.error('Unexpected error during auth check:', error);
        if (mountedRef.current) {
          await handleAuthError(error);
        }
      }
    };

    const setupAuthListener = () => {
      console.log('Setting up auth listener...');
      return supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, 'Session exists:', !!session);
        
        if (event === 'SIGNED_OUT' || (!session && !location.pathname.startsWith('/shared'))) {
          console.log('User signed out or session expired');
          if (mountedRef.current) {
            await clearAuthStorage();
            completeAuthCheck(false);
            redirectToAuth();
          }
        } else if (event === 'SIGNED_IN' && session) {
          console.log('User signed in, verifying session...');
          setupAuthTimeout();
          try {
            const { error: verifyError } = await supabase.auth.getUser();
            if (verifyError) {
              console.error('Session verification error:', verifyError);
              await handleAuthError(verifyError);
            } else {
              console.log('Session verified, updating state');
              completeAuthCheck(true);
            }
          } catch (error) {
            console.error('Unexpected error during session verification:', error);
            if (mountedRef.current) {
              await handleAuthError(error);
            }
          }
        }
      });
    };

    const initialize = async () => {
      console.log('Initializing AuthGuard...');
      const { data: { subscription } } = setupAuthListener();
      authListener = { unsubscribe: () => subscription.unsubscribe() };
      await checkAuth();
    };

    initialize();

    return () => {
      console.log('AuthGuard unmounting, cleaning up...');
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
    console.log('AuthGuard is loading...');
    return <LoadingScreen />;
  }

  if (!isAuthenticated && !location.pathname.startsWith('/shared')) {
    console.log('User not authenticated, redirecting to auth...');
    redirectToAuth();
    return <LoadingScreen />;
  }

  console.log('Auth check complete, rendering protected content');
  return <>{children}</>;
}