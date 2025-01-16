import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserDomain, isFreeDomain } from "@/utils/emailDomains";
import { useOrganizationData } from "./organization/useOrganizationData";
import { OrganizationSettingsContent } from "./organization/OrganizationSettingsContent";
import { useProfileData } from "@/components/library/video/useProfileData";

export const OrganizationSettings = ({ userId }: { userId: string }) => {
  const { data: profile, isLoading: profileLoading } = useProfileData();
  const { data: organizationData, isLoading: orgLoading, error } = useOrganizationData(userId);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Error loading organization data. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (profileLoading || orgLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (profile?.email && isFreeDomain(getUserDomain(profile.email))) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Organizations can only be created or joined with a business email address. Your current email ({profile.email}) is from a free email provider.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!organizationData?.organization) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You are not currently part of an organization. Please contact your organization administrator for an invitation.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <OrganizationSettingsContent
      organization={organizationData.organization}
      members={organizationData.members}
      userId={userId}
    />
  );
};