import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Auth as SupabaseAuth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { PageLayout } from "@/components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showOrgForm, setShowOrgForm] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    // Check if user is already logged in
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
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
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleCreateOrganization = async () => {
    if (!session || !orgName) return;

    const userDomain = session.user.email.split('@')[1];

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert([
        {
          name: orgName,
          domain: userDomain,
        }
      ])
      .select()
      .single();

    if (orgError) {
      toast({
        title: "Error",
        description: "Failed to create organization.",
        variant: "destructive",
      });
      return;
    }

    // Add user as admin
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([
        {
          organization_id: org.id,
          user_id: session.user.id,
          role: 'admin',
        }
      ]);

    if (memberError) {
      toast({
        title: "Error",
        description: "Failed to add user to organization.",
        variant: "destructive",
      });
      return;
    }

    // Update user profile with organization
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: org.id })
      .eq('id', session.user.id);

    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
      return;
    }

    navigate("/calendar");
  };

  const handleJoinOrganization = async () => {
    if (!session) return;

    const userDomain = session.user.email.split('@')[1];

    // Find organization with matching domain
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select()
      .eq('domain', userDomain)
      .maybeSingle();

    if (orgError) {
      toast({
        title: "Error",
        description: "Failed to find organization.",
        variant: "destructive",
      });
      return;
    }

    if (!org) {
      toast({
        title: "No Organization Found",
        description: "No organization exists for your email domain. Please create a new one.",
      });
      return;
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert([
        {
          organization_id: org.id,
          user_id: session.user.id,
          role: 'user',
        }
      ]);

    if (memberError) {
      toast({
        title: "Error",
        description: "Failed to join organization.",
        variant: "destructive",
      });
      return;
    }

    // Update user profile with organization
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ organization_id: org.id })
      .eq('id', session.user.id);

    if (profileError) {
      toast({
        title: "Error",
        description: "Failed to update profile.",
        variant: "destructive",
      });
      return;
    }

    navigate("/calendar");
  };

  // Get the current site URL for redirect
  const siteUrl = window.location.origin;

  if (showOrgForm) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center min-h-[80vh]">
          <Card className="w-[400px]">
            <CardHeader>
              <CardTitle>Join or Create Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Organization Name</Label>
                <Input
                  id="orgName"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Enter organization name"
                />
              </div>
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={handleCreateOrganization}
                  disabled={!orgName}
                >
                  Create New Organization
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or
                    </span>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={handleJoinOrganization}
                >
                  Join Existing Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

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