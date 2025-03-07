
import { 
  Clock, LogIn, LogOut, Video, CheckCircle, XCircle, Loader, 
  Play, UserMinus, UserPlus, Users, AlertTriangle, 
  Headphones, CirclePause, FileCog, CircleSlash, Ban, Wifi
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecordingStatusProps {
  status: string;
  meetingState?: string | null;
}

export const RecordingStatus = ({ status, meetingState }: RecordingStatusProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'joining':
      case 'dispatched':
        return {
          icon: <LogIn className="h-5 w-5 text-blue-500" />,
          text: "Joining Meeting",
          description: "The Notetaker is attempting to join the meeting"
        };
      case 'waiting_for_admission':
      case 'waiting_for_entry':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          text: "Waiting to Join",
          description: "The Notetaker is waiting to be admitted to the meeting"
        };
      case 'failed_entry':
      case 'entry_denied':
      case 'no_response':
        return {
          icon: <Ban className="h-5 w-5 text-red-500" />,
          text: "Entry Denied",
          description: "The Notetaker was not allowed to join the meeting"
        };
      case 'attending':
      case 'recording_active':
        return {
          icon: <Video className="h-5 w-5 text-green-500" />,
          text: "Recording",
          description: "The Notetaker is currently recording the meeting"
        };
      case 'leaving':
        return {
          icon: <LogOut className="h-5 w-5 text-blue-500" />,
          text: "Leaving Meeting",
          description: "The Notetaker is leaving the meeting"
        };
      case 'concluded':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Completed",
          description: "The recording has been completed successfully"
        };
      case 'no_meeting_activity':
        return {
          icon: <CirclePause className="h-5 w-5 text-blue-500" />,
          text: "No Activity",
          description: "The meeting had no activity and the recording was stopped"
        };
      case 'no_participants':
        return {
          icon: <Users className="h-5 w-5 text-blue-500" />,
          text: "No Participants",
          description: "The Notetaker left because it was the last participant"
        };
      case 'processing':
        return {
          icon: <Loader className="h-5 w-5 text-blue-500 animate-spin" />,
          text: "Processing",
          description: "Converting the recording for playback"
        };
      case 'media_ready':
        return {
          icon: <FileCog className="h-5 w-5 text-blue-500" />,
          text: "Preparing Media",
          description: "Media files are ready and being prepared for viewing"
        };
      case 'failed':
      case 'internal_error':
      case 'bad_meeting_code':
      case 'api':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          text: "Failed",
          description: "The recording process failed due to an error"
        };
      case 'kicked':
        return {
          icon: <UserMinus className="h-5 w-5 text-red-500" />,
          text: "Removed",
          description: "The Notetaker was removed from the meeting"
        };
      case 'ready':
        return {
          icon: <Play className="h-5 w-5 text-green-500" />,
          text: "Ready",
          description: "The recording is ready for viewing"
        };
      case 'retrieving':
        return {
          icon: <Loader className="h-5 w-5 text-blue-500 animate-spin" />,
          text: "Retrieving",
          description: "Retrieving the recording from storage"
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          text: status,
          description: "Current status of the recording"
        };
    }
  };

  const getMeetingStateInfo = () => {
    if (!meetingState) return null;
    
    switch (meetingState) {
      case 'api':
        return {
          icon: <CircleSlash className="h-4 w-4 text-red-500" />,
          text: "API Error",
          description: "The Notetaker left due to an API error"
        };
      case 'bad_meeting_code':
        return {
          icon: <CircleSlash className="h-4 w-4 text-red-500" />,
          text: "Invalid Meeting",
          description: "The meeting isn't active and can't be joined"
        };
      case 'dispatched':
        return {
          icon: <Wifi className="h-4 w-4 text-blue-500" />,
          text: "Connecting",
          description: "The Notetaker has loaded the meeting page"
        };
      case 'entry_denied':
        return {
          icon: <Ban className="h-4 w-4 text-red-500" />,
          text: "Entry Denied",
          description: "The Notetaker's admission request was rejected"
        };
      case 'internal_error':
        return {
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
          text: "Error",
          description: "The Notetaker encountered an internal error"
        };
      case 'kicked':
        return {
          icon: <UserMinus className="h-4 w-4 text-red-500" />,
          text: "Kicked",
          description: "The Notetaker was removed from the meeting"
        };
      case 'no_meeting_activity':
        return {
          icon: <CirclePause className="h-4 w-4 text-blue-500" />,
          text: "No Activity",
          description: "The Notetaker left due to no participant activity"
        };
      case 'no_participants':
        return {
          icon: <Users className="h-4 w-4 text-blue-500" />,
          text: "No Participants",
          description: "The Notetaker was the last participant in the meeting"
        };
      case 'no_response':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          text: "Timed Out",
          description: "The Notetaker's admission request timed out"
        };
      case 'recording_active':
        return {
          icon: <Video className="h-4 w-4 text-green-500" />,
          text: "Recording",
          description: "The Notetaker is attending and recording the meeting"
        };
      case 'waiting_for_entry':
        return {
          icon: <Clock className="h-4 w-4 text-yellow-500" />,
          text: "Waiting",
          description: "The Notetaker is waiting to be admitted"
        };
      default:
        return {
          icon: <Clock className="h-4 w-4 text-gray-500" />,
          text: meetingState,
          description: "Current state of the meeting"
        };
    }
  };

  const { icon, text, description } = getStatusInfo();
  const meetingStateInfo = getMeetingStateInfo();

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center space-x-2 whitespace-nowrap">
              {icon}
              <span className="text-sm capitalize hidden sm:inline-block">{text}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{description}</p>
          </TooltipContent>
        </Tooltip>
        
        {meetingStateInfo && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-1 whitespace-nowrap text-xs text-muted-foreground">
                {meetingStateInfo.icon}
                <span className="hidden sm:inline-block">{meetingStateInfo.text}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{meetingStateInfo.description}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
