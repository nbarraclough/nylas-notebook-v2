export type Database = {
  public: {
    Tables: {
      notetaker_queue: {
        Row: {
          id: string;
          user_id: string;
          event_id: string;
          status: string;
          attempts: number | null;
          last_attempt: string | null;
          error: string | null;
          created_at: string;
          scheduled_for: string;
          notetaker_id: string | null;
        }
      }
      events: {
        Row: {
          id: string;
          conference_url: string | null;
          manual_meeting_id: string | null;
          user_id: string;
          profiles: {
            nylas_grant_id: string | null;
          }
        }
      }
      recordings: {
        Row: {
          user_id: string;
          event_id: string;
          recording_url: string;
          notetaker_id: string | null;
          status: string;
        }
      }
    }
  }
}