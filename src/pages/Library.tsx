import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { LibraryError } from "@/components/library/LibraryError";
import { useRecordings } from "@/hooks/use-recordings";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
        
        if (!session && !recordingId) {
          navigate('/auth', { state: { returnTo: `/library/${recordingId || ''}` } });
        }

        // Get and set current user ID
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUserId(user?.id || null);
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
      }
    };
    checkAuth();
  }, [navigate, recordingId]);

  // Subscribe to auth changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsAuthenticated(!!session);
      if (!session && !recordingId) {
        navigate('/auth');
      }
      // Update current user ID on auth state change
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    });

    return () => subscription.unsubscribe();
  }, [navigate, recordingId]);

  const { data: allRecordings, isLoading, error } = useRecordings({
    isAuthenticated,
    recordingId,
    filters
  });

  // Separate recordings into owned and shared
  const myRecordings = allRecordings?.filter(recording => 
    recording.user_id === currentUserId
  ) || [];

  const sharedRecordings = allRecordings?.filter(recording => 
    recording.user_id !== currentUserId
  ) || [];

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
                <LibraryHeader recordingsCount={allRecordings?.length || 0} />
                <LibraryFilters filters={filters} onFiltersChange={setFilters} />
              </>
            )}

            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4">My Recordings</h2>
                <RecordingGrid 
                  recordings={myRecordings} 
                  isLoading={isLoading} 
                  selectedRecording={selectedRecording}
                  onRecordingSelect={handleRecordingSelect}
                />
              </div>

              {sharedRecordings.length > 0 && (
                <>
                  <Separator className="my-8" />
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Internally Shared Recordings</h2>
                    <RecordingGrid 
                      recordings={sharedRecordings} 
                      isLoading={isLoading} 
                      selectedRecording={selectedRecording}
                      onRecordingSelect={handleRecordingSelect}
                    />
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}