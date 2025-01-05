import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecordingRules } from "@/components/settings/RecordingRules";

interface RecordingSettingsProps {
  userId: string;
}

export function RecordingSettings({ userId }: RecordingSettingsProps) {
  const [recordExternal, setRecordExternal] = useState(false);
  const [recordInternal, setRecordInternal] = useState(false);

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
            recordExternal={recordExternal}
            recordInternal={recordInternal}
            shareExternal={false}
            shareInternal={false}
            onRulesChange={(updates) => {
              if (updates.record_external_meetings !== undefined) {
                setRecordExternal(updates.record_external_meetings);
              }
              if (updates.record_internal_meetings !== undefined) {
                setRecordInternal(updates.record_internal_meetings);
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}