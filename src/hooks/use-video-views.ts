import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useVideoViews() {
  const trackView = useCallback(async (recordingId: string) => {
    try {
      const { error } = await supabase
        .from('video_views')
        .insert({
          recording_id: recordingId,
          external_viewer_ip: null // IP tracking handled by RLS
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking video view:', error);
    }
  }, []);

  return { trackView };
}