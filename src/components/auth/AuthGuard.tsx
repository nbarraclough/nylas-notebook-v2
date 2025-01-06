import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useToast } from "@/hooks/use-toast";
import { clearAuthStorage } from "@/utils/authStorage";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Define public routes that don't require authentication
  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isPublicRoute) {
          await clearAuthStorage();
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      } catch (error) {
        console.error('Session check error:', error);
        await clearAuthStorage();
        
        if (!isPublicRoute) {
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

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!session && !isPublicRoute) {
        await clearAuthStorage();
        navigate('/auth', { state: { returnTo: location.pathname } });
      }
      setIsLoading(false);
    });

    checkSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute, toast]);

  // Show loading screen only for protected routes during initial load
  if (isLoading && !isPublicRoute) {
    return <LoadingScreen />;
  }

  // Allow access to public routes regardless of auth state
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Render children (user is either authenticated or on a public route)
  return <>{children}</>;
}