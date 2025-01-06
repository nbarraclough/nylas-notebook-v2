import { Card, CardContent } from "@/components/ui/card";

export function LoadingVideoPlayer() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-6xl mx-4">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="aspect-video bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}