import { useState } from 'react';
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useVideoRefresh(recordingId: string, notetakerId: string | null | undefined) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMedia = async () => {
    if (!recordingId) {
      console.error('Missing recordingId for refreshMedia');
      toast.error("Could not refresh video: missing recording ID");
      return;
    }

    try {
      setIsRefreshing(true);
      console.log('Refreshing media for recording:', recordingId, 'notetakerId:', notetakerId);
      
      const { error } = await supabase.functions.invoke('get-recording-media', {
        body: { 
          recordingId,
          notetakerId: notetakerId || undefined // Only pass if it exists
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
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refreshMedia, isRefreshing };
}