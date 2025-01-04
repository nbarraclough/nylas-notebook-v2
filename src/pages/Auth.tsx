import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (profileError) {
            console.error('Error checking profile:', profileError);
            toast({
              title: "Error",
              description: "Failed to check user profile.",
              variant: "destructive",
            });
            return;
          }

          // If no profile exists, create one
          if (!profile) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: session.user.id,
                  email: session.user.email,
                }
              ]);

            if (insertError) {
              console.error('Error creating profile:', insertError);
              toast({
                title: "Error",
                description: "Failed to create user profile.",
                variant: "destructive",
              });
              return;
            }
          }

          navigate("/calendar");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  // Get the current site URL for redirect
  const siteUrl = window.location.origin;

  return (
    <PageLayout>
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
    </PageLayout>
  );
}