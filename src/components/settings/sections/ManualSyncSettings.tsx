import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualSync } from "@/components/settings/ManualSync";

interface ManualSyncSettingsProps {
  userId: string;
}

export function ManualSyncSettings({ userId }: ManualSyncSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manual Sync</h2>
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualSync userId={userId} />
        </CardContent>
      </Card>
    </div>
  );
}