import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useRecordingMedia() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const refreshMedia = async (recordingId: string, notetakerId: string | null) => {
    if (!notetakerId) return null;

    try {
      console.log('Refreshing media for recording:', recordingId);
      
      const { data, error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId
        },
      });

      if (error) {
        const errorBody = JSON.parse(error.message);
        if (errorBody?.error === 'MEDIA_NOT_READY') {
          toast({
            title: "Media Not Ready",
            description: "The recording is still being processed. Please try again in a few moments.",
          });
          return null;
        }
        throw error;
      }

      // Invalidate the recording query to get the latest URL
      queryClient.invalidateQueries({ queryKey: ['recording', recordingId] });

      toast({
        title: "Media Refreshed",
        description: "Video URL has been updated.",
      });

      return data;
    } catch (error: any) {
      console.error('Error refreshing media:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh media. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  };

  return { refreshMedia };
}