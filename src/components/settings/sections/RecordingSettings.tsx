import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingRules } from "@/components/settings/RecordingRules";

interface RecordingSettingsProps {
  userId: string;
}

export function RecordingSettings({ userId }: RecordingSettingsProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Recording Rules</h2>
      <Card>
        <CardHeader>
          <CardTitle>Recording Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <RecordingRules
            userId={userId}
            onRulesChange={(updates) => {
              console.log('Recording rules updated:', updates);
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}