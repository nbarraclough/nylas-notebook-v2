import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useVideoMedia(recordingId: string, notetakerId: string | null | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const refreshMedia = async () => {
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
          return;
        }
        throw error;
      }

      // Refetch recording data to get updated URLs
      queryClient.invalidateQueries({ queryKey: ['recording', recordingId] });
    } catch (error) {
      console.error('Error refreshing media:', error);
      toast({
        title: "Error",
        description: "Failed to refresh media. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { refreshMedia };
}