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
}