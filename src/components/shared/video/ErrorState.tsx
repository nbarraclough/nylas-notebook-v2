import React from 'react';
import { Card, CardContent } from "@/components/ui/card";

export function ErrorState() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">
            This video is no longer available or has been removed.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}