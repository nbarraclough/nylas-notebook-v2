import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { clearAuthStorage } from "@/utils/authStorage";

const SESSION_TIMEOUT = 3600000; // 1 hour
const REFRESH_WINDOW = 300000; // 5 minutes before expiry

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared/');

  useEffect(() => {
    let sessionCheckInterval: NodeJS.Timeout;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isPublicRoute) {
          await clearAuthStorage();
          navigate('/auth', { state: { returnTo: location.pathname } });
          return;
        }

        if (session) {
          const expiresAt = new Date(session.expires_at!).getTime();
          const now = Date.now();

          // If session is expired
          if (now >= expiresAt) {
            await supabase.auth.signOut();
            await clearAuthStorage();
            toast({
              title: "Session Expired",
              description: "Please sign in again.",
              variant: "destructive",
            });
            navigate('/auth', { state: { returnTo: location.pathname } });
            return;
          }

          // If session is close to expiring, refresh it
          if (expiresAt - now <= REFRESH_WINDOW) {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('Session refresh error:', {
                type: 'refresh_error',
                path: location.pathname
              });
            }
          }
        }
      } catch (error) {
        console.error('Session check error:', {
          type: 'check_error',
          path: location.pathname
        });
        
        if (!isPublicRoute) {
          await clearAuthStorage();
          toast({
            title: "Authentication Error",
            description: "Please sign in again.",
            variant: "destructive",
          });
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Initial check
    checkSession();

    // Set up periodic session checks
    sessionCheckInterval = setInterval(checkSession, 60000); // Check every minute

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session && !isPublicRoute) {
        await clearAuthStorage();
        navigate('/auth', { state: { returnTo: location.pathname } });
      }
      setIsLoading(false);
    });

    return () => {
      clearInterval(sessionCheckInterval);
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute, toast]);

  if (isLoading && !isPublicRoute) {
    return <LoadingScreen />;
  }

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return <>{children}</>;
}