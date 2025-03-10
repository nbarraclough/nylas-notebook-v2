
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualSync } from "@/components/settings/ManualSync";

export function ManualSyncSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Manual Sync</h2>
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <ManualSync />
        </CardContent>
      </Card>
    </div>
  );
}
