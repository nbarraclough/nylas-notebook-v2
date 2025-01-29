export interface EventParticipant {
  name: string;
  email: string;
}

export interface EventOrganizer {
  name: string;
  email: string;
}

export interface Event {
  id: string;
  title: string;
  start_time: string;
  end_time?: string;
  participants?: EventParticipant[];
  organizer?: EventOrganizer;
  description?: string;
  conference_url?: string;
  html_link?: string;
  master_event_id?: string;
  recordings?: Array<{
    id: string;
    recording_url: string;
    video_url?: string;
    duration?: number;
    transcript_content?: any;
    created_at: string;
  }>;
  recurring_event_notes?: Array<{
    id: string;
    pinned: boolean;
  }>;
}