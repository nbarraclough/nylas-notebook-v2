import { Button } from "@/components/ui/button";
import { Calendar, Eye, Mail, MousePointerClick, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

interface StatsCardProps {
  publicShares: any[];
}

export function StatsCard({ publicShares }: StatsCardProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between pb-2">
        <h3 className="text-lg font-semibold">Public Links</h3>
        <Button 
          variant="ghost" 
          className="text-sm" 
          onClick={() => navigate("/library?filter=public")}
        >
          <span className="hidden sm:inline">View more</span>
          <ArrowRight className="h-4 w-4 ml-0 sm:ml-2" />
        </Button>
      </div>
      <div className="space-y-3 sm:space-y-4">
        {publicShares?.map((share) => (
          <div key={share.id} className="space-y-2 border-b pb-3 sm:pb-4 last:border-0">
            <div className="flex items-center justify-between">
              <p className="text-sm line-clamp-1 flex-1 mr-2">
                {share.recording?.event?.title || 'Untitled Event'}
              </p>
              <div className="flex items-center gap-1 text-sm text-muted-foreground whitespace-nowrap">
                <Calendar className="h-4 w-4" />
                <span>
                  {share.recording?.event?.start_time ? 
                    format(new Date(share.recording.event.start_time), 'MMM d') : 
                    'No date'
                  }
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4 text-blue-500" />
                <span>{share.recording?.views?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Mail className="h-4 w-4 text-purple-500" />
                <span>{share.recording?.email_metrics?.[0]?.opens || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <MousePointerClick className="h-4 w-4 text-green-500" />
                <span>{share.recording?.email_metrics?.[0]?.link_clicks || 0}</span>
              </div>
            </div>
          </div>
        ))}
        {(!publicShares || publicShares.length === 0) && (
          <p className="text-center py-3 sm:py-4 text-muted-foreground">
            No public shares yet
          </p>
        )}
      </div>
    </div>
  );
}