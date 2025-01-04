import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const FREE_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'aol.com',
  'icloud.com',
  'protonmail.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
];

interface CreateJoinOrganizationProps {
  userId: string;
  onOrganizationUpdate: () => Promise<void>;
}

export const CreateJoinOrganization = ({ userId, onOrganizationUpdate }: CreateJoinOrganizationProps) => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [joinDomain, setJoinDomain] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Fetch user's email on component mount
  useState(() => {
    const fetchUserEmail = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single();
      
      if (profile?.email) {
        setUserEmail(profile.email);
      }
    };
    fetchUserEmail();
  }, [userId]);

  const getUserDomain = (email: string) => {
    return email.split('@')[1];
  };

  const isFreeDomain = (domain: string) => {
    return FREE_EMAIL_DOMAINS.includes(domain.toLowerCase());
  };

  const handleCreateOrg = async () => {
    try {
      setIsLoading(true);
      
      const domain = getUserDomain(userEmail);
      
      if (!domain || isFreeDomain(domain)) {
        toast({
          title: "Error",
          description: "Organizations can only be created with business email addresses.",
          variant: "destructive",
        });
        return;
      }

      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName, domain }])
        .select()
        .single();

      if (orgError) throw orgError;
      if (!org) throw new Error('Failed to create organization');

      // Add user as admin
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: org.id,
          user_id: userId,
          role: 'admin'
        }]);

      if (memberError) throw memberError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      await onOrganizationUpdate();
      toast({
        title: "Success",
        description: "Organization created successfully!",
      });
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create organization. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinOrg = async () => {
    try {
      setIsLoading(true);
      
      // Find organization by domain
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select()
        .eq('domain', joinDomain)
        .single();

      if (orgError) throw orgError;
      if (!org) throw new Error('Organization not found');

      // Add user as member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: org.id,
          user_id: userId,
          role: 'user'
        }]);

      if (memberError) throw memberError;

      // Update user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      await onOrganizationUpdate();
      toast({
        title: "Success",
        description: "Successfully joined organization!",
      });
    } catch (error: any) {
      console.error('Error joining organization:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join organization. Please check the domain and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join or Create Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Enter organization name"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="join-domain">Join Organization by Domain</Label>
            <Input
              id="join-domain"
              value={joinDomain}
              onChange={(e) => setJoinDomain(e.target.value)}
              placeholder="e.g., company.com"
              disabled={isLoading}
            />
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={handleCreateOrg}
              disabled={!orgName || !userEmail || isLoading}
            >
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
            <Button 
              onClick={handleJoinOrg}
              disabled={!joinDomain || isLoading}
              variant="outline"
            >
              {isLoading ? "Joining..." : "Join Organization"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};