import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the current site URL for redirect
  const siteUrl = window.location.origin;
  const returnTo = location.state?.returnTo || "/calendar";

  useEffect(() => {
    // Check if user is already logged in
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate(returnTo);
        }
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate(returnTo);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, returnTo]);

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