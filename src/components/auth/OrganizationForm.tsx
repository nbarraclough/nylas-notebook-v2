import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface OrganizationFormProps {
  session: any;
}

export function OrganizationForm({ session }: OrganizationFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");

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

  return (
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
  );
}