import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageLayout } from "@/components/layout/PageLayout";
import { RecordingCard } from "@/components/recordings/RecordingCard";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

  const isInternalMeeting = (recording: any) => {
    const organizerDomain = recording.event.organizer?.email?.split('@')[1];
    if (!organizerDomain || !Array.isArray(recording.event.participants)) return false;
    
    return recording.event.participants.every((participant: any) => {
      const participantDomain = participant.email?.split('@')[1];
      return participantDomain === organizerDomain;
    });
  };

  const filterRecordings = (type: 'all' | 'internal' | 'external') => {
    if (!recordings) return [];
    if (type === 'all') return recordings;
    
    return recordings.filter(recording => 
      type === 'internal' ? isInternalMeeting(recording) : !isInternalMeeting(recording)
    );
  };

  const renderRecordingsList = (filteredRecordings: any[]) => {
    if (isLoading) {
      return (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      );
    }

    if (filteredRecordings.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">
          No recordings found in this category. Recordings will appear here once your Notetaker has joined and recorded meetings.
        </p>
      );
    }

    return (
      <div className="grid gap-4">
        {filteredRecordings.map((recording) => (
          <RecordingCard key={recording.id} recording={recording} />
        ))}
      </div>
    );
  };

  return (
    <PageLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Meeting Recordings</h1>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All Meetings</TabsTrigger>
            <TabsTrigger value="internal">Internal</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all">
            {renderRecordingsList(filterRecordings('all'))}
          </TabsContent>
          
          <TabsContent value="internal">
            {renderRecordingsList(filterRecordings('internal'))}
          </TabsContent>
          
          <TabsContent value="external">
            {renderRecordingsList(filterRecordings('external'))}
          </TabsContent>
        </Tabs>
      </div>
    </PageLayout>
  );
}