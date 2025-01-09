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
  conference_url?: string | null;
  description?: string | null;
  participants?: EventParticipant[];
  organizer?: EventOrganizer | null;
  notetaker_queue?: {
    id: string;
    status: string;
  }[];
}