import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";
import type { EventParticipant } from "@/types/calendar";

type RecordingWithRelations = Database['public']['Tables']['recordings']['Row'] & {
  event: Database['public']['Tables']['events']['Row'] & {
    participants: EventParticipant[];
    manual_meeting?: Database['public']['Tables']['manual_meetings']['Row'];
  };
  video_shares: Array<{
    share_type: string;
    organization_id: string;
  }>;
};

const parseParticipants = (participants: unknown): EventParticipant[] => {
  if (!Array.isArray(participants)) return [];
  
  return participants.map(p => {
    if (typeof p === 'object' && p !== null) {
      return {
        name: String(p.name || ''),
        email: String(p.email || '')
      };
    }
    return { name: '', email: '' };
  });
};

export default function Library() {
  const [filters, setFilters] = useState({
    types: [],
    meetingTypes: [],
    startDate: null,
    endDate: null,
    participants: [],
    titleSearch: null,
  });

  const { recordingId } = useParams();
  const navigate = useNavigate();
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);

  // Handle URL parameter changes
  useEffect(() => {
    setSelectedRecording(recordingId || null);
  }, [recordingId]);

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['library-recordings', filters],
    queryFn: async () => {
      console.log('Fetching recordings...');
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      console.log('Current user:', user.id);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      console.log('User profile:', profile);

      // Get user's own recordings and recordings shared with their organization
      const { data: userRecordings, error: userError } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            *,
            manual_meeting:manual_meetings (*)
          ),
          video_shares (
            share_type,
            organization_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      console.log('User recordings:', userRecordings);
      if (userError) {
        console.error('Error fetching user recordings:', userError);
        throw userError;
      }

      // Get recordings shared within the organization
      const { data: sharedRecordings, error: sharedError } = await supabase
        .from('recordings')
        .select(`
          *,
          event:events (
            *,
            manual_meeting:manual_meetings (*)
          ),
          video_shares (
            share_type,
            organization_id
          )
        `)
        .neq('user_id', user.id)
        .eq('video_shares.share_type', 'internal')
        .eq('video_shares.organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      console.log('Shared recordings:', sharedRecordings);
      if (sharedError) {
        console.error('Error fetching shared recordings:', sharedError);
        throw sharedError;
      }

      // Process recordings to handle both regular and manual meetings
      const processRecording = (recording: any) => ({
        ...recording,
        event: {
          ...recording.event,
          // Use manual meeting title if available
          title: recording.event?.manual_meeting?.title || recording.event?.title || 'Untitled Recording',
          participants: parseParticipants(recording.event?.participants)
        }
      });

      // Combine and deduplicate recordings
      const allRecordings = [...(userRecordings || []), ...(sharedRecordings || [])]
        .map(processRecording) as RecordingWithRelations[];

      console.log('All recordings after processing:', allRecordings);

      const uniqueRecordings = Array.from(new Map(allRecordings.map(r => [r.id, r])).values());

      // Apply filters
      let filteredRecordings = uniqueRecordings;

      if (filters.startDate) {
        filteredRecordings = filteredRecordings.filter(
          r => new Date(r.event.start_time) >= filters.startDate
        );
      }

      if (filters.endDate) {
        filteredRecordings = filteredRecordings.filter(
          r => new Date(r.event.start_time) <= filters.endDate
        );
      }

      if (filters.participants.length > 0) {
        filteredRecordings = filteredRecordings.filter(r =>
          r.event.participants.some(p =>
            filters.participants.includes(p.email)
          )
        );
      }

      if (filters.titleSearch) {
        filteredRecordings = filteredRecordings.filter(r =>
          r.event.title.toLowerCase().includes(filters.titleSearch.toLowerCase())
        );
      }

      console.log('Filtered recordings:', filteredRecordings);
      return filteredRecordings;
    },
    // Refresh data every 10 seconds to catch new recordings
    refetchInterval: 10000
  });

  // Update URL when a recording is selected
  const handleRecordingSelect = (id: string | null) => {
    setSelectedRecording(id);
    if (id) {
      navigate(`/library/${id}`);
    } else {
      navigate('/library');
    }
  };

  return (
    <PageLayout>
      <div className="space-y-6">
        <LibraryHeader recordingsCount={recordings?.length || 0} />
        <LibraryFilters filters={filters} onFiltersChange={setFilters} />
        <RecordingGrid 
          recordings={recordings || []} 
          isLoading={isLoading} 
          selectedRecording={selectedRecording}
          onRecordingSelect={handleRecordingSelect}
        />
      </div>
    </PageLayout>
  );
}
