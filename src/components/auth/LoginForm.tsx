import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function LoginForm() {
  // Get the current site URL for redirect
  const siteUrl = window.location.origin;

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
                  borderRadius: '0.5rem',
                  height: '2.75rem',
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