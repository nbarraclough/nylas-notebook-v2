import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { LibraryError } from "@/components/library/LibraryError";
import { useRecordings } from "@/hooks/use-recordings";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

export default function Library() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    types: [] as string[],
    meetingTypes: [] as string[],
    startDate: null,
    endDate: null,
    participants: [] as string[],
    titleSearch: null,
    hasPublicLink: searchParams.get('filter') === 'public',
  });

  const { recordingId } = useParams();
  const navigate = useNavigate();
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

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
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [navigate, recordingId]);

  // Subscribe to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
      if (!session && !recordingId) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, recordingId]);

  const { data: recordings, isLoading, error } = useRecordings({
    isAuthenticated,
    recordingId,
    filters
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
        {error ? (
          <LibraryError message={error instanceof Error ? error.message : 'An error occurred'} />
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