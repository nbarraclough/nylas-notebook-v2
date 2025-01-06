import { Card, CardContent } from "@/components/ui/card";

export function ErrorVideoPlayer() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <Card className="w-full max-w-6xl mx-4">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Recording not found</p>
        </CardContent>
      </Card>
    </div>
  );
}