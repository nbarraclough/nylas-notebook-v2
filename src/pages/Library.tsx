import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LibraryError } from "@/components/library/LibraryError";
import { PaginationControls } from "@/components/recurring/PaginationControls";

const ITEMS_PER_PAGE = 8;

export default function Library() {
  const navigate = useNavigate();
  const { recordingId } = useParams();
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [myRecordingsPage, setMyRecordingsPage] = useState(1);
  const [sharedRecordingsPage, setSharedRecordingsPage] = useState(1);
  const [filters, setFilters] = useState({
    types: [] as string[],
    meetingTypes: [] as string[],
    startDate: null as Date | null,
    endDate: null as Date | null,
    participants: [] as string[],
    titleSearch: null as string | null,
    hasPublicLink: false
  });

  // Handle deep linking
  useEffect(() => {
    if (recordingId) {
      setSelectedRecording(recordingId);
    }
  }, [recordingId]);

  // Query for my recordings
  const { data: myRecordings, isLoading: isLoadingMyRecordings, error: myRecordingsError } = useQuery({
    queryKey: ["my-recordings", filters, myRecordingsPage],
    queryFn: async () => {
      let query = supabase
        .from("recordings")
        .select(`
          *,
          owner:profiles!inner (
            email
          ),
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer,
            manual_meeting:manual_meetings (*)
          ),
          video_shares (
            share_type,
            organization_id,
            external_token
          )
        `)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order("created_at", { ascending: false })
        .range((myRecordingsPage - 1) * ITEMS_PER_PAGE, myRecordingsPage * ITEMS_PER_PAGE - 1);

      // Apply filters
      if (filters.titleSearch) {
        query = query.textSearch("(event->title).text", filters.titleSearch.replace(/\s+/g, " & "));
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  // Query for shared recordings
  const { data: sharedRecordings, isLoading: isLoadingShared, error: sharedError } = useQuery({
    queryKey: ["shared-recordings", filters, sharedRecordingsPage],
    queryFn: async () => {
      const { data: profile } = await supabase.auth.getUser();
      if (!profile.user) return [];

      let query = supabase
        .from("recordings")
        .select(`
          *,
          owner:profiles!inner (
            email
          ),
          event:events (
            title,
            description,
            start_time,
            end_time,
            participants,
            organizer,
            manual_meeting:manual_meetings (*)
          ),
          video_shares (
            share_type,
            organization_id,
            external_token
          )
        `)
        .neq('user_id', profile.user.id)
        .order("created_at", { ascending: false })
        .range((sharedRecordingsPage - 1) * ITEMS_PER_PAGE, sharedRecordingsPage * ITEMS_PER_PAGE - 1);

      // Apply filters
      if (filters.titleSearch) {
        query = query.textSearch("(event->title).text", filters.titleSearch.replace(/\s+/g, " & "));
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  const handleRecordingSelect = (id: string | null) => {
    setSelectedRecording(id);
    if (id) {
      navigate(`/library/${id}`);
    } else {
      navigate("/library");
    }
  };

  if (myRecordingsError || sharedError) {
    return <LibraryError message={(myRecordingsError || sharedError)?.message} />;
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <LibraryHeader recordingsCount={(myRecordings?.length || 0) + (sharedRecordings?.length || 0)} />
        <LibraryFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        <div className="space-y-12">
          {/* My Recordings Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">My Recordings</h2>
            <RecordingGrid
              recordings={myRecordings || []}
              isLoading={isLoadingMyRecordings}
              selectedRecording={selectedRecording}
              onRecordingSelect={handleRecordingSelect}
            />
            {myRecordings && myRecordings.length > 0 && (
              <PaginationControls
                currentPage={myRecordingsPage}
                totalPages={Math.ceil((myRecordings?.length || 0) / ITEMS_PER_PAGE)}
                onPageChange={setMyRecordingsPage}
              />
            )}
          </section>

          {/* Shared Recordings Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Shared Recordings</h2>
            <RecordingGrid
              recordings={sharedRecordings || []}
              isLoading={isLoadingShared}
              selectedRecording={selectedRecording}
              onRecordingSelect={handleRecordingSelect}
            />
            {sharedRecordings && sharedRecordings.length > 0 && (
              <PaginationControls
                currentPage={sharedRecordingsPage}
                totalPages={Math.ceil((sharedRecordings?.length || 0) / ITEMS_PER_PAGE)}
                onPageChange={setSharedRecordingsPage}
              />
            )}
          </section>
        </div>
      </div>
    </PageLayout>
  );
}