import { useEffect } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useVideoRefresh(recordingId: string, notetakerId: string | null | undefined) {
  const queryClient = useQueryClient();

  const refreshMedia = async () => {
    try {
      console.log('Refreshing media for recording:', recordingId);
      
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId
        },
      });

      if (error) {
        console.error('Error refreshing media:', error);
        toast.error("Failed to refresh video. Please try again.");
        return;
      }

      // Refetch recording data to get updated URLs
      await queryClient.invalidateQueries({ queryKey: ['recording', recordingId] });
      toast.success("Video refreshed successfully");
    } catch (error) {
      console.error('Error refreshing media:', error);
      toast.error("Failed to refresh video. Please try again.");
    }
  };

  // Call refreshMedia when component mounts
  useEffect(() => {
    refreshMedia();
  }, [recordingId, notetakerId]);

  return { refreshMedia };
}