import type { Json } from './json';

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          busy: boolean | null
          conference_url: string | null
          created_at: string
          description: string | null
          end_time: string
          html_link: string | null
          ical_uid: string | null
          id: string
          last_updated_at: string
          location: string | null
          master_event_id: string | null
          nylas_event_id: string
          organizer: Json | null
          original_start_time: string | null
          participants: Json | null
          read_only: boolean | null
          recurrence: string[] | null
          reminders: Json | null
          resources: Json | null
          start_time: string
          status: string | null
          title: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          busy?: boolean | null
          conference_url?: string | null
          created_at?: string
          description?: string | null
          end_time: string
          html_link?: string | null
          ical_uid?: string | null
          id?: string
          last_updated_at?: string
          location?: string | null
          master_event_id?: string | null
          nylas_event_id: string
          organizer?: Json | null
          original_start_time?: string | null
          participants?: Json | null
          read_only?: boolean | null
          recurrence?: string[] | null
          reminders?: Json | null
          resources?: Json | null
          start_time: string
          status?: string | null
          title: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          busy?: boolean | null
          conference_url?: string | null
          created_at?: string
          description?: string | null
          end_time?: string
          html_link?: string | null
          ical_uid?: string | null
          id?: string
          last_updated_at?: string
          location?: string | null
          master_event_id?: string | null
          nylas_event_id?: string
          organizer?: Json | null
          original_start_time?: string | null
          participants?: Json | null
          read_only?: boolean | null
          recurrence?: string[] | null
          reminders?: Json | null
          resources?: Json | null
          start_time?: string
          status?: string | null
          title?: string
          user_id?: string
          visibility?: string | null
        }
      }
      notetaker_queue: {
        Row: {
          attempts: number | null
          created_at: string
          error: string | null
          event_id: string
          id: string
          last_attempt: string | null
          scheduled_for: string
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string
          error?: string | null
          event_id: string
          id?: string
          last_attempt?: string | null
          scheduled_for: string
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string
          error?: string | null
          event_id?: string
          id?: string
          last_attempt?: string | null
          scheduled_for?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notetaker_queue_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notetaker_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          notetaker_name: string | null
          nylas_grant_id: string | null
          record_external_meetings: boolean | null
          record_internal_meetings: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          created_at: string
          duration: number | null
          event_id: string
          id: string
          recording_url: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          event_id: string
          id?: string
          recording_url: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          event_id?: string
          id?: string
          recording_url?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      should_record_event: {
        Args: {
          event_organizer: Json
          event_participants: Json
          record_internal: boolean
          record_external: boolean
        }
        Returns: boolean
      }
      update_profile_grant_id: {
        Args: {
          p_user_id: string
          p_grant_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
