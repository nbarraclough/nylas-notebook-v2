
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export const useRealtimeUpdates = (userId: string | null) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    console.log('Setting up realtime listeners for user:', userId);

    // Listen for events table changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes
          schema: 'public',
          table: 'events',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Events table change received:', payload);
          // Invalidate events query to trigger a refetch
          queryClient.invalidateQueries({ queryKey: ['events', userId] });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Event',
              description: 'A new calendar event has been added.',
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recordings',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('Recordings change received:', payload);
          // Invalidate recordings queries
          queryClient.invalidateQueries({ queryKey: ['recordings'] });
          
          if (payload.eventType === 'INSERT') {
            toast({
              title: 'New Recording',
              description: 'A new meeting recording is available.',
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      console.log('Cleaning up realtime listeners');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient, toast]);
};
