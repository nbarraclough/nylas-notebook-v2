import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session) {
          navigate("/calendar");
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

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
            />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}