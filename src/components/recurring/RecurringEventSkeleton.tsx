import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "lucide-react";

export function RecurringEventSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((index) => (
        <Card key={index} className="p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className="mt-1 hidden sm:block">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-32 mt-2" />
                  <div className="flex -space-x-2 mt-2">
                    {[1, 2, 3].map((n) => (
                      <Skeleton key={n} className="h-6 w-6 rounded-full border-2 border-background" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </Card>
      ))}
    </div>
  );
}