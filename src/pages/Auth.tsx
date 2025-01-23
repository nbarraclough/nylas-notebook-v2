import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { useToast } from "@/hooks/use-toast";
import { LoginForm } from "@/components/auth/LoginForm";
import { ProfileForm } from "@/components/auth/ProfileForm";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
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
          .select('first_name, last_name')
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

        // If profile exists and is complete, redirect to calendar
        if (profile?.first_name && profile?.last_name) {
          navigate("/calendar");
          return;
        }

        // Show profile form for incomplete or missing profile
        setShowProfileForm(true);
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (currentSession) {
          setSession(currentSession);
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', currentSession.user.id)
            .maybeSingle();

          if (profile?.first_name && profile?.last_name) {
            navigate("/calendar");
          } else {
            setShowProfileForm(true);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleProfileComplete = () => {
    navigate("/calendar");
  };

  return (
    <PageLayout>
      {showProfileForm ? (
        <ProfileForm session={session} onComplete={handleProfileComplete} />
      ) : (
        <LoginForm />
      )}
    </PageLayout>
  );
}