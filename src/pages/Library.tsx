
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LibraryError } from "@/components/library/LibraryError";
import { PaginationControls } from "@/components/recurring/PaginationControls";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useRecordings } from "@/hooks/use-recordings";

const ITEMS_PER_PAGE = 8;

export default function Library() {
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [myRecordingsPage, setMyRecordingsPage] = useState(1);
  const [sharedRecordingsPage, setSharedRecordingsPage] = useState(1);
  const [errorRecordingsPage, setErrorRecordingsPage] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [showScheduled, setShowScheduled] = useState(false);
  const [filters, setFilters] = useState({
    types: [] as string[],
    meetingTypes: [] as string[],
    startDate: null as Date | null,
    endDate: null as Date | null,
    participants: [] as string[],
    titleSearch: null as string | null,
    hasPublicLink: false
  });

  const { 
    data: myRecordingsData, 
    isLoading: isLoadingMyRecordings, 
    error: myRecordingsError 
  } = useRecordings({
    isAuthenticated: true,
    page: myRecordingsPage,
    pageSize: ITEMS_PER_PAGE,
    filters,
    showScheduled
  });

  const { 
    data: sharedRecordingsData, 
    isLoading: isLoadingShared, 
    error: sharedError 
  } = useQuery({
    queryKey: ["shared-recordings", filters, sharedRecordingsPage, showScheduled],
    queryFn: async () => {
      try {
        const { data: profile } = await supabase.auth.getUser();
        if (!profile.user) return { data: [], count: 0 };

        const from = (sharedRecordingsPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        const now = new Date().toISOString();

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
          `, { count: 'exact' })
          .neq('user_id', profile.user.id)
          .order("created_at", { ascending: false })
          .not('status', 'eq', 'cancelled');
        
        if (!showScheduled) {
          // Apply start time filter for scheduled meetings
          query = query.lt('event.start_time', now);
        }
        
        if (filters.titleSearch) {
          query = query.textSearch("(event->title).text", filters.titleSearch.replace(/\s+/g, " & "));
        }

        if (filters.startDate) {
          query = query.gte("created_at", filters.startDate.toISOString());
        }

        if (filters.endDate) {
          query = query.lte("created_at", filters.endDate.toISOString());
        }

        query = query.range(from, to);
        const { data, error, count } = await query;

        if (error) {
          console.error('Error fetching shared recordings:', error);
          throw error;
        }
        
        return { data: data || [], count: count || 0 };
      } catch (error) {
        console.error('Error in shared recordings query:', error);
        throw error;
      }
    },
    retry: false
  });

  const {
    data: errorRecordingsData,
    isLoading: isLoadingErrors,
    error: errorRecordingsError
  } = useRecordings({
    isAuthenticated: true,
    page: errorRecordingsPage,
    pageSize: ITEMS_PER_PAGE,
    filters,
    showErrors: true,
    showScheduled
  });

  const handleRecordingSelect = (id: string | null) => {
    setSelectedRecording(id);
  };

  if (myRecordingsError || sharedError || errorRecordingsError) {
    return <LibraryError message={(myRecordingsError || sharedError || errorRecordingsError)?.message} />;
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <LibraryHeader recordingsCount={(myRecordingsData?.count || 0) + (sharedRecordingsData?.count || 0)} />
        <LibraryFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
        
        <div className="flex items-center justify-end space-x-4 mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-scheduled"
              checked={showScheduled}
              onCheckedChange={setShowScheduled}
            />
            <Label htmlFor="show-scheduled">Show scheduled meetings</Label>
          </div>
        </div>
        
        <div className="space-y-12">
          <section>
            <h2 className="text-xl font-semibold mb-4">My Recordings</h2>
            <RecordingGrid
              recordings={myRecordingsData?.data || []}
              isLoading={isLoadingMyRecordings}
              selectedRecording={selectedRecording}
              onRecordingSelect={handleRecordingSelect}
            />
            {myRecordingsData && myRecordingsData.count > 0 && (
              <PaginationControls
                currentPage={myRecordingsPage}
                totalPages={Math.ceil(myRecordingsData.count / ITEMS_PER_PAGE)}
                onPageChange={setMyRecordingsPage}
              />
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Shared Recordings</h2>
            <RecordingGrid
              recordings={sharedRecordingsData?.data || []}
              isLoading={isLoadingShared}
              selectedRecording={selectedRecording}
              onRecordingSelect={handleRecordingSelect}
            />
            {sharedRecordingsData && sharedRecordingsData.count > 0 && (
              <PaginationControls
                currentPage={sharedRecordingsPage}
                totalPages={Math.ceil(sharedRecordingsData.count / ITEMS_PER_PAGE)}
                onPageChange={setSharedRecordingsPage}
              />
            )}
          </section>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t">
            <Switch
              id="show-errors"
              checked={showErrors}
              onCheckedChange={setShowErrors}
            />
            <Label htmlFor="show-errors">Show error recordings</Label>
          </div>

          {showErrors && (
            <section>
              <h2 className="text-xl font-semibold mb-4 text-red-600">Error Recordings</h2>
              <RecordingGrid
                recordings={errorRecordingsData?.data || []}
                isLoading={isLoadingErrors}
                selectedRecording={selectedRecording}
                onRecordingSelect={handleRecordingSelect}
                showErrors={true}
              />
              {errorRecordingsData && errorRecordingsData.count > 0 && (
                <PaginationControls
                  currentPage={errorRecordingsPage}
                  totalPages={Math.ceil(errorRecordingsData.count / ITEMS_PER_PAGE)}
                  onPageChange={setErrorRecordingsPage}
                />
              )}
            </section>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
