import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the current site URL for redirect
  const siteUrl = window.location.origin;
  const returnTo = location.state?.returnTo || "/calendar";

  useEffect(() => {
    let mounted = true;

    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Auth session error:", error);
          toast({
            title: "Authentication Error",
            description: "There was a problem checking your login status.",
            variant: "destructive",
          });
          return;
        }

        if (session && mounted) {
          console.log("User is already logged in, redirecting to:", returnTo);
          navigate(returnTo, { replace: true });
        }
      } catch (error) {
        console.error("Error checking session:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      if (event === 'SIGNED_IN' && session && mounted) {
        console.log("User signed in, redirecting to:", returnTo);
        navigate(returnTo, { replace: true });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate, returnTo, toast]);

  if (isLoading) {
    return null; // Or a loading spinner if you prefer
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <Card className="w-[400px]">
        <CardHeader>
          <CardTitle>Sign in to Notebook</CardTitle>
        </CardHeader>
        <CardContent>
          <SupabaseAuth 
            supabaseClient={supabase}
            appearance={{ 
              theme: ThemeSupa,
              style: {
                button: {
                  backgroundColor: 'hsl(var(--primary))',
                  borderRadius: '0.5rem',
                  height: '2.75rem',
                  color: 'white',
                },
                input: {
                  borderRadius: '0.5rem',
                },
              },
              className: {
                button: 'hover:bg-primary/90',
              },
            }}
            theme="light"
            providers={[]}
            redirectTo={`${siteUrl}/auth/callback`}
          />
        </CardContent>
      </Card>
    </div>
  );
}