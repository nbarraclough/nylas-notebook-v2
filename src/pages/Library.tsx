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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

const RECORDINGS_PER_PAGE = 8;

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
  const [myRecordingsPage, setMyRecordingsPage] = useState(1);
  const [sharedRecordingsPage, setSharedRecordingsPage] = useState(1);

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

  // Calculate pagination for my recordings
  const myRecordingsStart = (myRecordingsPage - 1) * RECORDINGS_PER_PAGE;
  const myRecordingsEnd = myRecordingsStart + RECORDINGS_PER_PAGE;
  const myRecordingsPaginated = myRecordings.slice(myRecordingsStart, myRecordingsEnd);
  const myRecordingsPages = Math.ceil(myRecordings.length / RECORDINGS_PER_PAGE);

  // Calculate pagination for shared recordings
  const sharedRecordingsStart = (sharedRecordingsPage - 1) * RECORDINGS_PER_PAGE;
  const sharedRecordingsEnd = sharedRecordingsStart + RECORDINGS_PER_PAGE;
  const sharedRecordingsPaginated = sharedRecordings.slice(sharedRecordingsStart, sharedRecordingsEnd);
  const sharedRecordingsPages = Math.ceil(sharedRecordings.length / RECORDINGS_PER_PAGE);

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
                  recordings={myRecordingsPaginated} 
                  isLoading={isLoading} 
                  selectedRecording={selectedRecording}
                  onRecordingSelect={handleRecordingSelect}
                />
                {myRecordingsPages > 1 && (
                  <div className="mt-4">
                    <Pagination>
                      <PaginationContent>
                        {myRecordingsPage > 1 && (
                          <PaginationItem>
                            <PaginationPrevious 
                              onClick={() => setMyRecordingsPage(page => Math.max(1, page - 1))}
                            />
                          </PaginationItem>
                        )}
                        {Array.from({ length: myRecordingsPages }, (_, i) => i + 1).map((page) => (
                          <PaginationItem key={page}>
                            <PaginationLink
                              onClick={() => setMyRecordingsPage(page)}
                              isActive={page === myRecordingsPage}
                            >
                              {page}
                            </PaginationLink>
                          </PaginationItem>
                        ))}
                        {myRecordingsPage < myRecordingsPages && (
                          <PaginationItem>
                            <PaginationNext 
                              onClick={() => setMyRecordingsPage(page => Math.min(myRecordingsPages, page + 1))}
                            />
                          </PaginationItem>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>

              {sharedRecordings.length > 0 && (
                <>
                  <Separator className="my-8" />
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Internally Shared Recordings</h2>
                    <RecordingGrid 
                      recordings={sharedRecordingsPaginated} 
                      isLoading={isLoading} 
                      selectedRecording={selectedRecording}
                      onRecordingSelect={handleRecordingSelect}
                    />
                    {sharedRecordingsPages > 1 && (
                      <div className="mt-4">
                        <Pagination>
                          <PaginationContent>
                            {sharedRecordingsPage > 1 && (
                              <PaginationItem>
                                <PaginationPrevious 
                                  onClick={() => setSharedRecordingsPage(page => Math.max(1, page - 1))}
                                />
                              </PaginationItem>
                            )}
                            {Array.from({ length: sharedRecordingsPages }, (_, i) => i + 1).map((page) => (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setSharedRecordingsPage(page)}
                                  isActive={page === sharedRecordingsPage}
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            ))}
                            {sharedRecordingsPage < sharedRecordingsPages && (
                              <PaginationItem>
                                <PaginationNext 
                                  onClick={() => setSharedRecordingsPage(page => Math.min(sharedRecordingsPages, page + 1))}
                                />
                              </PaginationItem>
                            )}
                          </PaginationContent>
                        </Pagination>
                      </div>
                    )}
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