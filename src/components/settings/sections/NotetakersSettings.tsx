
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { NotetakersTable } from "./notetakers/NotetakersTable";
import { useNotetakers } from "./notetakers/useNotetakers";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function NotetakersSettings({ userId }: { userId: string }) {
  console.log('NotetakersSettings rendering with userId:', userId);
  
  const { toast } = useToast();
  const [isKicking, setIsKicking] = useState<{ [key: string]: boolean }>({});
  const [isRetrieving, setIsRetrieving] = useState<{ [key: string]: boolean }>({});
  const [showScheduled, setShowScheduled] = useState(false);
  const { data: recordings, isLoading, error } = useNotetakers(userId, showScheduled);

  console.log('NotetakersSettings state:', { 
    userId,
    recordings,
    isLoading,
    error,
    isKicking,
    isRetrieving,
    showScheduled
  });

  const handleManualKick = async (notetakerId: string, recordingId: string) => {
    try {
      setIsKicking(prev => ({ ...prev, [recordingId]: true }));
      
      const { error } = await supabase.functions.invoke('kick-notetaker', {
        body: { notetakerId },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Manual kick initiated successfully",
      });

      return Promise.resolve();
    } catch (error) {
      console.error('Error kicking notetaker:', error);
      toast({
        title: "Error",
        description: "Failed to kick notetaker. Please try again.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsKicking(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  const handleRetrieveMedia = async (recordingId: string, notetakerId: string, forceRefresh: boolean = false) => {
    try {
      setIsRetrieving(prev => ({ ...prev, [recordingId]: true }));

      const { data, error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId,
          forceRefresh
        },
      });

      if (error) {
        const errorBody = JSON.parse(error.message);
        if (errorBody?.error === 'MEDIA_NOT_READY') {
          toast({
            title: "Media Not Ready",
            description: "The recording is still being processed. Please try again in a few moments.",
          });
          return Promise.reject(new Error('Media not ready'));
        }
        if (errorBody?.error === 'RECORDING_UNAVAILABLE') {
          toast({
            title: "Recording Unavailable",
            description: "This recording is not available. Please try a different meeting.",
            variant: "destructive"
          });
          return Promise.reject(new Error('Recording unavailable'));
        }
        throw error;
      }

      toast({
        title: "Success",
        description: forceRefresh ? 
          "Media refresh initiated successfully" : 
          "Media retrieved successfully",
      });

      return Promise.resolve();
    } catch (error: any) {
      console.error('Error retrieving media:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to retrieve media. Please try again.",
        variant: "destructive",
      });
      return Promise.reject(error);
    } finally {
      setIsRetrieving(prev => ({ ...prev, [recordingId]: false }));
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-100 rounded w-full" />
        <div className="h-32 bg-gray-100 rounded" />
      </div>
    );
  }

  if (error) {
    console.error('Error in NotetakersSettings:', error);
    return (
      <div className="text-red-500">
        Error loading notetakers: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Notetakers</h2>
        <div className="flex items-center space-x-2">
          <Switch
            id="show-scheduled"
            checked={showScheduled}
            onCheckedChange={setShowScheduled}
          />
          <Label htmlFor="show-scheduled">Show scheduled meetings</Label>
        </div>
      </div>

      <NotetakersTable
        recordings={recordings || []}
        isKicking={isKicking}
        isRetrieving={isRetrieving}
        onKick={handleManualKick}
        onRetrieve={handleRetrieveMedia}
      />
    </div>
  );
}
