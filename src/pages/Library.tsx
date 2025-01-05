import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Library() {
  const [filters, setFilters] = useState({
    types: [],
    meetingTypes: [],
    startDate: null,
    endDate: null,
    participants: [],
    titleSearch: null,
  });

  const { data: recordings, isLoading } = useQuery({
    queryKey: ['library-recordings', filters],
    queryFn: async () => {
      // First, get the current user's profile to know their organization
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      // Get user's own recordings and recordings shared with their organization
      const { data: userRecordings, error: userError } = await supabase
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
          ),
          video_shares (
            share_type,
            organization_id
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (userError) throw userError;

      // Get recordings shared within the organization
      const { data: sharedRecordings, error: sharedError } = await supabase
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
          ),
          video_shares (
            share_type,
            organization_id
          )
        `)
        .neq('user_id', user.id) // Exclude user's own recordings
        .eq('video_shares.share_type', 'internal')
        .eq('video_shares.organization_id', profile?.organization_id)
        .order('created_at', { ascending: false });

      if (sharedError) throw sharedError;

      // Combine and deduplicate recordings
      const allRecordings = [...(userRecordings || []), ...(sharedRecordings || [])];
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

      return filteredRecordings;
    }
  });

  return (
    <PageLayout>
      <div className="space-y-6">
        <LibraryHeader recordingsCount={recordings?.length || 0} />
        <LibraryFilters filters={filters} onFiltersChange={setFilters} />
        <RecordingGrid recordings={recordings || []} isLoading={isLoading} />
      </div>
    </PageLayout>
  );
}