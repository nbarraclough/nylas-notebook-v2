import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LibraryError } from "@/components/library/LibraryError";

export default function Library() {
  const navigate = useNavigate();
  const { recordingId } = useParams();
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    types: [] as string[],
    meetingTypes: [] as string[],
    startDate: null as Date | null,
    endDate: null as Date | null,
    participants: [] as string[],
    titleSearch: null as string | null,
    hasPublicLink: false
  });

  // Handle deep linking - set selectedRecording when recordingId is in URL
  useEffect(() => {
    if (recordingId) {
      setSelectedRecording(recordingId);
    }
  }, [recordingId]);

  const { data: recordings, isLoading, error } = useQuery({
    queryKey: ["recordings", filters],
    queryFn: async () => {
      let query = supabase
        .from("recordings")
        .select(
          `
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
        `
        )
        .order("created_at", { ascending: false });

      if (filters.titleSearch) {
        query = query.textSearch(
          "(event->title).text",
          filters.titleSearch.replace(/\s+/g, " & ")
        );
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      if (filters.meetingTypes.length > 0) {
        if (filters.meetingTypes.includes("internal")) {
          query = query.eq("event->is_internal", true);
        } else {
          query = query.eq("event->is_internal", false);
        }
      }

      if (filters.types.length > 0) {
        // Add owner type filtering logic here
      }

      if (filters.participants.length > 0) {
        query = query.contains("event->participants", [
          { email: filters.participants[0] },
        ]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching recordings:", error);
        throw error;
      }

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

  if (error instanceof Error) {
    return <LibraryError message={error.message} />;
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <LibraryHeader recordingsCount={recordings?.length || 0} />
        <LibraryFilters
          filters={filters}
          onFiltersChange={setFilters}
        />
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