import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Pages that don't require authentication
const PUBLIC_ROUTES = ['/auth'];

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        // Skip check for public routes
        if (PUBLIC_ROUTES.includes(location.pathname)) {
          setIsLoading(false);
          return;
        }

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error checking auth session:', sessionError);
          toast({
            title: "Authentication Error",
            description: "Please sign in again.",
            variant: "destructive",
          });
          if (mounted) {
            await supabase.auth.signOut();
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        if (!session) {
          console.log('No session found, redirecting to auth page');
          if (mounted) {
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        // Verify the session is still valid
        const { error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Session invalid:', userError);
          toast({
            title: "Session Expired",
            description: "Please sign in again.",
            variant: "destructive",
          });
          if (mounted) {
            await supabase.auth.signOut();
            navigate('/auth', { state: { returnTo: location.pathname } });
          }
          return;
        }

        if (mounted) {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error in auth check:', error);
        toast({
          title: "Authentication Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
        if (mounted) {
          await supabase.auth.signOut();
          navigate('/auth', { state: { returnTo: location.pathname } });
        }
      }
    };

    checkAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'SIGNED_OUT' || (!session && !PUBLIC_ROUTES.includes(location.pathname))) {
        console.log('Auth state changed, no session, redirecting to auth');
        if (mounted) {
          // Clear any existing session data
          await supabase.auth.signOut();
          navigate('/auth');
        }
      } else if (event === 'SIGNED_IN' && session) {
        // Verify the new session
        const { error: verifyError } = await supabase.auth.getUser();
        if (verifyError) {
          console.error('New session verification failed:', verifyError);
          toast({
            title: "Authentication Failed",
            description: "Please try signing in again.",
            variant: "destructive",
          });
          if (mounted) {
            await supabase.auth.signOut();
            navigate('/auth');
          }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return <>{children}</>;
};