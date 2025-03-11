
import { Button } from "@/components/ui/button";
import { Loader, Download, RefreshCw, Zap, CheckCircle, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { NotetakerActionsProps } from "./types";

export function NotetakerActions({
  recordingId,
  notetakerId,
  status,
  isKicking,
  isRetrieving,
  onKick,
  onRetrieve
}: NotetakerActionsProps) {
  const { toast } = useToast();
  const [lastSuccessAction, setLastSuccessAction] = useState<string | null>(null);
  const [lastFailedAction, setLastFailedAction] = useState<string | null>(null);

  const handleKick = async () => {
    try {
      console.log(`🚫 Attempting to kick notetaker [NoteTaker ID: ${notetakerId}]`);
      setLastFailedAction(null);
      await onKick();
      setLastSuccessAction('kick');
      toast({
        title: "Success",
        description: "Notetaker kicked successfully",
      });
      console.log(`✅ Successfully kicked notetaker [NoteTaker ID: ${notetakerId}]`);
    } catch (error) {
      console.error(`❌ Failed to kick notetaker [NoteTaker ID: ${notetakerId}]`, error);
      setLastSuccessAction(null);
      setLastFailedAction('kick');
      toast({
        title: "Error",
        description: "Failed to kick notetaker",
        variant: "destructive",
      });
    }
  };

  const handleRetrieve = async (forceRefresh = false) => {
    try {
      console.log(`🔄 Attempting to ${forceRefresh ? 'refresh' : 'retrieve'} media for [NoteTaker ID: ${notetakerId}]`);
      setLastFailedAction(null);
      await onRetrieve(forceRefresh);
      setLastSuccessAction(forceRefresh ? 'refresh' : 'retrieve');
      toast({
        title: "Success",
        description: forceRefresh ? "Media refreshed successfully" : "Media retrieved successfully",
      });
      console.log(`✅ Successfully ${forceRefresh ? 'refreshed' : 'retrieved'} media for [NoteTaker ID: ${notetakerId}]`);
    } catch (error) {
      console.error(`❌ Failed to ${forceRefresh ? 'refresh' : 'retrieve'} media for [NoteTaker ID: ${notetakerId}]`, error);
      setLastSuccessAction(null);
      setLastFailedAction(forceRefresh ? 'refresh' : 'retrieve');
      toast({
        title: "Error",
        description: `Failed to ${forceRefresh ? 'refresh' : 'retrieve'} media`,
        variant: "destructive",
      });
    }
  };

  const getButtonState = (action: 'kick' | 'retrieve' | 'refresh') => {
    if (lastSuccessAction === action) return 'success';
    if (lastFailedAction === action) return 'error';
    return 'default';
  };

  return (
    <div className="flex items-center space-x-3">
      <Button 
        variant="outline" 
        size="icon"
        onClick={handleKick}
        disabled={isKicking}
        title="Manual Kick"
        className="relative"
      >
        {isKicking ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : getButtonState('kick') === 'success' ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : getButtonState('kick') === 'error' ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
      </Button>
      
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => handleRetrieve(false)}
        disabled={isRetrieving}
        title="Retrieve Media"
        className="relative"
      >
        {isRetrieving ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : getButtonState('retrieve') === 'success' ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : getButtonState('retrieve') === 'error' ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <Download className="h-4 w-4" />
        )}
      </Button>
      
      <Button 
        variant="outline" 
        size="icon"
        onClick={() => handleRetrieve(true)}
        disabled={isRetrieving}
        title="Force Refresh"
        className="relative"
      >
        {isRetrieving ? (
          <Loader className="h-4 w-4 animate-spin" />
        ) : getButtonState('refresh') === 'success' ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : getButtonState('refresh') === 'error' ? (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
