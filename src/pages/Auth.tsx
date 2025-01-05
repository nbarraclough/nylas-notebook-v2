import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { useToast } from "@/hooks/use-toast";
import { OrganizationForm } from "@/components/auth/OrganizationForm";
import { LoginForm } from "@/components/auth/LoginForm";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
        
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('id', currentSession.user.id)
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

        // If profile exists and has organization, redirect to calendar
        if (profile?.organization_id) {
          navigate("/calendar");
          return;
        }

        // If profile exists but no organization, show org form
        if (profile && !profile.organization_id) {
          setShowOrgForm(true);
          return;
        }

        // If no profile exists, create one
        if (!profile) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: currentSession.user.id,
                email: currentSession.user.email,
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
          setShowOrgForm(true);
        }
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (currentSession) {
          setSession(currentSession);
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (profile?.organization_id) {
            navigate("/calendar");
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <PageLayout>
      {showOrgForm ? (
        <OrganizationForm session={session} />
      ) : (
        <LoginForm />
      )}
    </PageLayout>
  );
}