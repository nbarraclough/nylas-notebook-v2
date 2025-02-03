export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      events: {
        Row: {
          id: string
          user_id: string
          nylas_event_id: string
          title: string
          description?: string | null
          location?: string | null
          start_time: string
          end_time: string
          participants?: Json | null
          conference_url?: string | null
          last_updated_at: string
          created_at: string
          ical_uid?: string | null
          busy?: boolean | null
          html_link?: string | null
          master_event_id?: string | null
          organizer?: Json | null
          resources?: Json | null
          read_only?: boolean | null
          reminders?: Json | null
          recurrence?: string[] | null
          status?: string | null
          visibility?: string | null
          original_start_time?: string | null
          manual_meeting_id?: string | null
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          notetaker_name?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          created_at: string
          updated_at: string
          nylas_grant_id?: string | null
          grant_status?: string | null
          organization_id?: string | null
        }
      }
    }
  }
}