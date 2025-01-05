import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        // Only redirect to auth if there's no recordingId parameter and user is not authenticated
        if (!session && !recordingId) {
          navigate('/auth', { state: { returnTo: `/library/${recordingId || ''}` } });
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // If auth check fails but we have a recordingId, we still allow access
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [navigate, recordingId]);

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['library-recordings', filters, isAuthenticated, recordingId],
    queryFn: async () => {
      console.log('Fetching recordings...');
      
      let query = supabase
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
        .order('created_at', { ascending: false });

      // If not authenticated, only fetch the shared recording
      if (!isAuthenticated) {
        if (!recordingId) return [];
        query = query.eq('id', recordingId);
      } else {
        // Get user's own recordings and recordings shared with their organization
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', user.id)
          .maybeSingle();

        // Apply filters for authenticated users
        if (filters.startDate) {
          query = query.gte('event.start_time', filters.startDate.toISOString());
        }

        if (filters.endDate) {
          query = query.lte('event.start_time', filters.endDate.toISOString());
        }

        if (filters.participants.length > 0) {
          // This is handled in post-processing
        }

        if (filters.titleSearch) {
          // This is handled in post-processing
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching recordings:', error);
        if (error.code === 'PGRST116') {
          setError('You do not have permission to view this recording.');
          return [];
        }
        throw error;
      }

      if (recordingId && data.length === 0) {
        setError('Recording not found or you do not have permission to view it.');
        return [];
      }

      // Process recordings
      const processedRecordings = data.map(recording => ({
        ...recording,
        event: {
          ...recording.event,
          participants: Array.isArray(recording.event?.participants) 
            ? recording.event.participants.map((p: any) => ({
                name: typeof p === 'object' ? p.name || '' : '',
                email: typeof p === 'object' ? p.email || '' : p
              }))
            : []
        }
      }));

      // Apply post-fetch filters
      return processedRecordings.filter(recording => {
        if (filters.participants.length > 0) {
          const hasParticipant = recording.event?.participants.some(p =>
            filters.participants.includes(p.email)
          );
          if (!hasParticipant) return false;
        }

        if (filters.titleSearch) {
          const title = recording.event?.title?.toLowerCase() || '';
          if (!title.includes(filters.titleSearch.toLowerCase())) return false;
        }

        return true;
      });
    },
    enabled: isAuthenticated !== null || !!recordingId
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

  // Show nothing while checking auth state
  if (isAuthenticated === null && !recordingId) {
    return null;
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <>
            {isAuthenticated && (
              <>
                <LibraryHeader recordingsCount={recordings?.length || 0} />
                <LibraryFilters filters={filters} onFiltersChange={setFilters} />
              </>
            )}
            <RecordingGrid 
              recordings={recordings || []} 
              isLoading={isLoading} 
              selectedRecording={selectedRecording}
              onRecordingSelect={handleRecordingSelect}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
}