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
      let query = supabase
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
          profiles:user_id (
            organization_id
          )
        `)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.types.length > 0) {
        if (filters.types.includes("my-recordings")) {
          query = query.eq('user_id', (await supabase.auth.getUser()).data.user?.id);
        }
        if (filters.types.includes("organization")) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('organization_id')
            .single();
          
          if (profile?.organization_id) {
            query = query.eq('profiles.organization_id', profile.organization_id);
          }
        }
      }

      if (filters.meetingTypes.length > 0) {
        if (filters.meetingTypes.includes("internal")) {
          query = query.eq('event.is_internal', true);
        }
        if (filters.meetingTypes.includes("external")) {
          query = query.eq('event.is_internal', false);
        }
      }

      if (filters.startDate) {
        query = query.gte('event.start_time', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('event.start_time', filters.endDate.toISOString());
      }

      if (filters.participants.length > 0) {
        // Filter by participants using containment operator
        query = query.contains('event.participants', filters.participants.map(email => ({ email })));
      }

      if (filters.titleSearch) {
        // Case-insensitive search in title
        query = query.ilike('event.title', `%${filters.titleSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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