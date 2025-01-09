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
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [meetingType, setMeetingType] = useState<"all" | "internal" | "external">(
    "all"
  );
  const [owner, setOwner] = useState<string | null>(null);
  const [participant, setParticipant] = useState<string | null>(null);

  // Handle deep linking - set selectedRecording when recordingId is in URL
  useEffect(() => {
    if (recordingId) {
      setSelectedRecording(recordingId);
    }
  }, [recordingId]);

  const { data: recordings, isLoading, error } = useQuery({
    queryKey: [
      "recordings",
      searchQuery,
      dateRange,
      meetingType,
      owner,
      participant,
    ],
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

      if (searchQuery) {
        query = query.textSearch(
          "(event->title).text",
          searchQuery.replace(/\s+/g, " & ")
        );
      }

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }

      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }

      if (meetingType !== "all") {
        if (meetingType === "internal") {
          query = query.eq("event->is_internal", true);
        } else {
          query = query.eq("event->is_internal", false);
        }
      }

      if (owner) {
        query = query.eq("owner->email", owner);
      }

      if (participant) {
        query = query.contains("event->participants", [
          { email: participant },
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

  if (error) {
    return <LibraryError error={error} />;
  }

  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        <LibraryHeader />
        <LibraryFilters
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          meetingType={meetingType}
          onMeetingTypeChange={setMeetingType}
          owner={owner}
          onOwnerChange={setOwner}
          participant={participant}
          onParticipantChange={setParticipant}
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