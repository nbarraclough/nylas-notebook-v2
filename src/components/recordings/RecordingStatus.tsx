import { 
  Clock, LogIn, LogOut, Video, CheckCircle, XCircle, Loader, 
  Play, UserMinus, UserPlus, Users, AlertTriangle, 
  Headphones, CirclePause, FileCog, CircleSlash, Ban, Wifi,
  FileVideo, FileText
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecordingStatusProps {
  status: string;
  meetingState?: string | null;
  hasVideo?: boolean;
  hasTranscript?: boolean;
  variant?: "default" | "compact" | "inline";
  showLabels?: boolean;
}

export const RecordingStatus = ({ 
  status, 
  hasVideo = false,
  hasTranscript = false,
  variant = "default",
  showLabels = true
}: RecordingStatusProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'joining':
      case 'dispatched':
        return {
          icon: <LogIn className="h-4 w-4" />,
          text: "Joining Meeting",
          description: "The Notetaker is attempting to join the meeting",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case 'waiting_for_admission':
      case 'waiting_for_entry':
        return {
          icon: <Clock className="h-4 w-4" />,
          text: "Waiting to Join",
          description: "The Notetaker is waiting to be admitted to the meeting",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200"
        };
      case 'failed_entry':
      case 'entry_denied':
      case 'no_response':
        return {
          icon: <Ban className="h-4 w-4" />,
          text: "Entry Denied",
          description: "The Notetaker was not allowed to join the meeting",
          color: "bg-red-100 text-red-800 border-red-200"
        };
      case 'attending':
      case 'recording_active':
        return {
          icon: <Video className="h-4 w-4" />,
          text: "Recording",
          description: "The Notetaker is currently recording the meeting",
          color: "bg-green-100 text-green-800 border-green-200"
        };
      case 'leaving':
        return {
          icon: <LogOut className="h-4 w-4" />,
          text: "Leaving Meeting",
          description: "The Notetaker is leaving the meeting",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case 'concluded':
        return {
          icon: <CheckCircle className="h-4 w-4" />,
          text: "Completed",
          description: "The recording has been completed successfully",
          color: "bg-green-100 text-green-800 border-green-200"
        };
      case 'no_meeting_activity':
        return {
          icon: <CirclePause className="h-4 w-4" />,
          text: "No Activity",
          description: "The meeting had no activity and the recording was stopped",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case 'no_participants':
        return {
          icon: <Users className="h-4 w-4" />,
          text: "No Participants",
          description: "The Notetaker left because it was the last participant",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case 'processing':
        return {
          icon: <Loader className="h-4 w-4 animate-spin" />,
          text: "Processing",
          description: "Converting the recording for playback",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case 'media_ready':
        return {
          icon: <FileCog className="h-4 w-4" />,
          text: "Preparing Media",
          description: "Media files are ready and being prepared for viewing",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      case 'failed':
      case 'internal_error':
      case 'bad_meeting_code':
      case 'api':
        return {
          icon: <AlertTriangle className="h-4 w-4" />,
          text: "Failed",
          description: "The recording process failed due to an error",
          color: "bg-red-100 text-red-800 border-red-200"
        };
      case 'kicked':
        return {
          icon: <UserMinus className="h-4 w-4" />,
          text: "Removed",
          description: "The Notetaker was removed from the meeting",
          color: "bg-red-100 text-red-800 border-red-200"
        };
      case 'ready':
        return {
          icon: <Play className="h-4 w-4" />,
          text: "Ready",
          description: "The recording is ready for viewing",
          color: "bg-green-100 text-green-800 border-green-200"
        };
      case 'retrieving':
        return {
          icon: <Loader className="h-4 w-4 animate-spin" />,
          text: "Retrieving",
          description: "Retrieving the recording from storage",
          color: "bg-blue-100 text-blue-800 border-blue-200"
        };
      default:
        return {
          icon: <Clock className="h-4 w-4" />,
          text: status,
          description: "Current status of the recording",
          color: "bg-gray-100 text-gray-800 border-gray-200"
        };
    }
  };

  const getVideoBadge = () => {
    return {
      icon: <FileVideo className="h-4 w-4" />,
      text: "Video",
      description: "Video recording is available",
      color: "bg-gray-100 text-gray-800 border-gray-200"
    };
  };

  const getTranscriptBadge = () => {
    return {
      icon: <FileText className="h-4 w-4" />,
      text: "Transcript",
      description: "Transcript is available",
      color: "bg-gray-100 text-gray-800 border-gray-200"
    };
  };

  const { icon, text, description, color } = getStatusInfo();
  const videoBadge = getVideoBadge();
  const transcriptBadge = getTranscriptBadge();

  if (variant === "compact") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Badge variant="outline" className={cn("px-1.5 py-0.5", color)}>
                  {icon}
                  {showLabels && <span className="ml-1 text-xs">{text}</span>}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
          
          {hasVideo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("px-1.5 py-0.5", videoBadge.color)}>
                  {videoBadge.icon}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{videoBadge.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {hasTranscript && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("px-1.5 py-0.5", transcriptBadge.color)}>
                  {transcriptBadge.icon}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transcriptBadge.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  if (variant === "inline") {
    return (
      <TooltipProvider>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center">
                <Badge variant="outline" className={cn("px-2 py-0.5", color)}>
                  {icon}
                  <span className="ml-1 text-xs">{text}</span>
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
          
          {hasVideo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("px-2 py-0.5", videoBadge.color)}>
                  {videoBadge.icon}
                  <span className="ml-1 text-xs">{videoBadge.text}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{videoBadge.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {hasTranscript && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("px-2 py-0.5", transcriptBadge.color)}>
                  {transcriptBadge.icon}
                  <span className="ml-1 text-xs">{transcriptBadge.text}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transcriptBadge.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={cn("px-2 py-1", color)}>
              <div className="flex items-center">
                {icon}
                <span className="ml-1.5 text-xs font-medium">{text}</span>
              </div>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
        
        <div className="flex items-center gap-1.5">
          {hasVideo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("px-2 py-1", videoBadge.color)}>
                  <div className="flex items-center">
                    {videoBadge.icon}
                    <span className="ml-1.5 text-xs font-medium">{videoBadge.text}</span>
                  </div>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{videoBadge.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
          
          {hasTranscript && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={cn("px-2 py-1", transcriptBadge.color)}>
                  <div className="flex items-center">
                    {transcriptBadge.icon}
                    <span className="ml-1.5 text-xs font-medium">{transcriptBadge.text}</span>
                  </div>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{transcriptBadge.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
