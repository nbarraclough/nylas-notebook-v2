import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { CreateOrganization } from "./CreateOrganization";
import { JoinOrganization } from "./JoinOrganization";

interface CreateJoinOrganizationProps {
  userId: string;
  onOrganizationUpdate: () => Promise<void>;
}

export const CreateJoinOrganization = ({ userId, onOrganizationUpdate }: CreateJoinOrganizationProps) => {
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join or Create Organization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        <CreateOrganization 
          userId={userId}
          userEmail={userEmail}
          onOrganizationUpdate={onOrganizationUpdate}
        />
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or</span>
          </div>
        </div>
        <JoinOrganization 
          userId={userId}
          onOrganizationUpdate={onOrganizationUpdate}
        />
      </CardContent>
    </Card>
  );
};