import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SharingRules } from "@/components/settings/SharingRules";

interface SharingSettingsProps {
  userId: string;
}

export function SharingSettings({ userId }: SharingSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Sharing Rules</h2>
      <Card>
        <CardHeader>
          <CardTitle>Sharing Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <SharingRules userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}