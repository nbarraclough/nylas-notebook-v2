import { Clock, LogIn, LogOut, Video, CheckCircle, XCircle, Loader, Play } from "lucide-react";

interface RecordingStatusProps {
  status: string;
}

export const RecordingStatus = ({ status }: RecordingStatusProps) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'joining':
        return {
          icon: <LogIn className="h-5 w-5 text-blue-500" />,
          text: "Joining Meeting..."
        };
      case 'waiting_for_admission':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          text: "Waiting to Join..."
        };
      case 'failed_entry':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: "Failed to Join"
        };
      case 'attending':
        return {
          icon: <Video className="h-5 w-5 text-green-500" />,
          text: "Recording in Progress"
        };
      case 'leaving':
        return {
          icon: <LogOut className="h-5 w-5 text-blue-500" />,
          text: "Leaving Meeting..."
        };
      case 'concluded':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: "Notetaker left the meeting"
        };
      case 'processing':
        return {
          icon: <Loader className="h-5 w-5 text-blue-500 animate-spin" />,
          text: "Processing recording"
        };
      case 'failed':
        return {
          icon: <XCircle className="h-5 w-5 text-red-500" />,
          text: "Recording Failed"
        };
      case 'ready':
        return {
          icon: <Play className="h-5 w-5 text-green-500" />,
          text: "Recording Ready"
        };
      case 'retrieving':
        return {
          icon: <Loader className="h-5 w-5 text-blue-500 animate-spin" />,
          text: "Retrieving Recording..."
        };
      default:
        return {
          icon: <Clock className="h-5 w-5 text-gray-500" />,
          text: status
        };
    }
  };

  const { icon, text } = getStatusInfo();

  return (
    <div className="flex items-center space-x-2 whitespace-nowrap">
      {icon}
      <span className="text-sm capitalize hidden sm:inline-block">{text}</span>
    </div>
  );
};