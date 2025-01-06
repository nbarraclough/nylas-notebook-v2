import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function LoginForm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Get the current site URL for redirect
  const siteUrl = window.location.origin;

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/calendar");
      }
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/calendar");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

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
                  '&:hover': {
                    backgroundColor: 'hsl(var(--primary) / 0.9)',
                  },
                },
                input: {
                  borderRadius: '0.5rem',
                },
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