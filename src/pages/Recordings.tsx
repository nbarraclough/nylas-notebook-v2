import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { RecordingCard } from "@/components/recordings/RecordingCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

export default function Recordings() {
  const { toast } = useToast();

  const { data: recordings, isLoading, error } = useQuery({
    queryKey: ['recordings'],
    queryFn: async () => {
      console.log('Fetching recordings...');
      const { data, error } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching recordings:', error);
        throw error;
      }

      console.log('Fetched recordings:', data);
      return data;
    },
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading recordings",
        description: "There was a problem loading your recordings. Please try again.",
        variant: "destructive",
      });
    }
  }, [error, toast]);

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Meeting Recordings</h1>
        {isLoading ? (
          <div className="grid gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
            {recordings?.map((recording) => (
              <RecordingCard key={recording.id} recording={recording} />
            ))}
            {recordings?.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No recordings found. Recordings will appear here once your Notetaker has joined and recorded meetings.
              </p>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}