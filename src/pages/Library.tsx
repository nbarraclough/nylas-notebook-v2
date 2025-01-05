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

      // Build the main recordings query
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
          ),
          video_shares (
            share_type,
            organization_id
          )
        `)
        .or(`user_id.eq.${user.id},video_shares.share_type.eq.internal,video_shares.organization_id.eq.${profile?.organization_id}`)
        .order('created_at', { ascending: false });

      // Apply filters
      if (filters.types.length > 0) {
        if (filters.types.includes("my-recordings")) {
          query = query.eq('user_id', user.id);
        }
        if (filters.types.includes("organization")) {
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
        query = query.contains('event.participants', filters.participants.map(email => ({ email })));
      }

      if (filters.titleSearch) {
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