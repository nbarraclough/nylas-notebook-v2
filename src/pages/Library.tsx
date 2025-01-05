import { useState } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { LibraryHeader } from "@/components/library/LibraryHeader";
import { LibraryFilters } from "@/components/library/LibraryFilters";
import { RecordingGrid } from "@/components/library/RecordingGrid";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Library() {
  const [filters, setFilters] = useState({
    type: null,
    meetingType: null,
    startDate: null,
    endDate: null,
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
      if (filters.type === "my-recordings") {
        query = query.eq('user_id', (await supabase.auth.getUser()).data.user?.id);
      } else if (filters.type === "organization") {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .single();
        
        if (profile?.organization_id) {
          query = query.eq('profiles.organization_id', profile.organization_id);
        }
      }

      if (filters.meetingType === "internal") {
        query = query.eq('event.is_internal', true);
      } else if (filters.meetingType === "external") {
        query = query.eq('event.is_internal', false);
      }

      if (filters.startDate) {
        query = query.gte('event.start_time', filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte('event.start_time', filters.endDate.toISOString());
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