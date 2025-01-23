import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { useToast } from "@/hooks/use-toast";
import { OrganizationForm } from "@/components/auth/OrganizationForm";
import { LoginForm } from "@/components/auth/LoginForm";
import { ProfileForm } from "@/components/auth/ProfileForm";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
        
        // Check if profile exists and is complete
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

        // If profile exists but incomplete, show profile form
        if (profile && (!profile.first_name || !profile.last_name)) {
          setShowProfileForm(true);
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
          setShowProfileForm(true);
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
            .select('organization_id, first_name, last_name')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (profile?.organization_id) {
            navigate("/calendar");
          } else if (!profile?.first_name || !profile?.last_name) {
            setShowProfileForm(true);
          } else {
            setShowOrgForm(true);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleProfileComplete = () => {
    setShowProfileForm(false);
    setShowOrgForm(true);
  };

  return (
    <PageLayout>
      {showProfileForm ? (
        <ProfileForm session={session} onComplete={handleProfileComplete} />
      ) : showOrgForm ? (
        <OrganizationForm session={session} />
      ) : (
        <LoginForm />
      )}
    </PageLayout>
  );
}