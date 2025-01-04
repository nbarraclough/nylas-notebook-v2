import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getUserDomain, isFreeDomain } from "@/utils/emailDomains";

interface CreateOrganizationProps {
  userId: string;
  userEmail: string;
  onOrganizationUpdate: () => Promise<void>;
}

export const CreateOrganization = ({ userId, userEmail, onOrganizationUpdate }: CreateOrganizationProps) => {
  const { toast } = useToast();
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

      // First create the organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert([{ name: orgName, domain }])
        .select()
        .single();

      if (orgError) throw orgError;
      if (!org) throw new Error('Failed to create organization');

      // Then update the user's profile with the organization ID
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ organization_id: org.id })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Finally add the user as an admin member
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert([{
          organization_id: org.id,
          user_id: userId,
          role: 'admin'
        }]);

      if (memberError) throw memberError;

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

  return (
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
      <Button 
        onClick={handleCreateOrg}
        disabled={!orgName || !userEmail || isLoading}
      >
        {isLoading ? "Creating..." : "Create Organization"}
      </Button>
    </div>
  );
};