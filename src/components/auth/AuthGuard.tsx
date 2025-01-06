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
  const isPublicRoute = location.pathname === '/auth' || location.pathname.startsWith('/shared/');

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session && !isPublicRoute) {
          navigate('/auth', { state: { returnTo: location.pathname } });
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error: any) {
        console.error('Auth check error:', error);
        
        if (!isPublicRoute) {
          toast({
            title: "Authentication Error",
            description: "Please sign in again.",
            variant: "destructive",
          });
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
        
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      
      if (event === 'SIGNED_OUT') {
        if (!isPublicRoute) {
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      }

      if (mounted) {
        setIsLoading(false);
      }
    });

    checkSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, isPublicRoute, toast]);

  // Show loading screen only for protected routes during initial load
  if (isLoading && !isPublicRoute) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
}