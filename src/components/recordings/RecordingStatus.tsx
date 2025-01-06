import { Clock, Check, X, Loader } from "lucide-react";

interface RecordingStatusProps {
  status: string;
}

export const RecordingStatus = ({ status }: RecordingStatusProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <X className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  return (
    <div className="flex items-center space-x-2 whitespace-nowrap">
      {getStatusIcon()}
      <span className="text-sm capitalize hidden sm:inline-block">{status}</span>
    </div>
  );
};