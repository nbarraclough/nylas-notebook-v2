export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at: string
          details: Json
          id: string
          user_id: string
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json
          id?: string
          user_id: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          created_at?: string
          details?: Json
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      cron_job_logs: {
        Row: {
          error: string | null
          id: string
          job_name: string | null
          result: Json | null
          started_at: string | null
          users_found: number | null
        }
        Insert: {
          error?: string | null
          id?: string
          job_name?: string | null
          result?: Json | null
          started_at?: string | null
          users_found?: number | null
        }
        Update: {
          error?: string | null
          id?: string
          job_name?: string | null
          result?: Json | null
          started_at?: string | null
          users_found?: number | null
        }
        Relationships: []
      }
      email_notifications: {
        Row: {
          email_type: string
          id: string
          processed: boolean | null
          processed_at: string | null
          recording_id: string | null
          sent_at: string | null
          sent_date: string | null
          user_id: string | null
        }
        Insert: {
          email_type: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          recording_id?: string | null
          sent_at?: string | null
          sent_date?: string | null
          user_id?: string | null
        }
        Update: {
          email_type?: string
          id?: string
          processed?: boolean | null
          processed_at?: string | null
          recording_id?: string | null
          sent_at?: string | null
          sent_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_notifications_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_shares: {
        Row: {
          created_at: string | null
          id: string
          link_clicks: number | null
          message_id: string
          opens: number | null
          recipients: Json
          recording_id: string
          sent_at: string | null
          shared_by: string
          subject: string
          thread_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          link_clicks?: number | null
          message_id: string
          opens?: number | null
          recipients?: Json
          recording_id: string
          sent_at?: string | null
          shared_by: string
          subject: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          link_clicks?: number | null
          message_id?: string
          opens?: number | null
          recipients?: Json
          recording_id?: string
          sent_at?: string | null
          shared_by?: string
          subject?: string
          thread_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          manual_meeting_id: string | null
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
          manual_meeting_id?: string | null
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
          manual_meeting_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "events_manual_meeting_id_fkey"
            columns: ["manual_meeting_id"]
            isOneToOne: false
            referencedRelation: "manual_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_meetings: {
        Row: {
          created_at: string
          id: string
          meeting_url: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          meeting_url: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          meeting_url?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_meetings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notetaker_queue: {
        Row: {
          attempts: number | null
          created_at: string
          error: string | null
          event_id: string
          id: string
          last_attempt: string | null
          notetaker_id: string | null
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
          notetaker_id?: string | null
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
          notetaker_id?: string | null
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
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          domain: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          grant_status: string | null
          id: string
          job_title: string | null
          last_name: string | null
          notetaker_name: string | null
          nylas_grant_id: string | null
          organization_id: string | null
          record_external_meetings: boolean | null
          record_internal_meetings: boolean | null
          share_external_recordings: boolean | null
          share_internal_recordings: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          grant_status?: string | null
          id: string
          job_title?: string | null
          last_name?: string | null
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          organization_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          share_external_recordings?: boolean | null
          share_internal_recordings?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          grant_status?: string | null
          id?: string
          job_title?: string | null
          last_name?: string | null
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          organization_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          share_external_recordings?: boolean | null
          share_internal_recordings?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recordings: {
        Row: {
          created_at: string
          duration: number | null
          event_id: string
          id: string
          mux_asset_id: string | null
          mux_playback_id: string | null
          notetaker_id: string | null
          recording_url: string | null
          status: string
          transcript_content: Json | null
          transcript_url: string | null
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          event_id: string
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          notetaker_id?: string | null
          recording_url?: string | null
          status?: string
          transcript_content?: Json | null
          transcript_url?: string | null
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          event_id?: string
          id?: string
          mux_asset_id?: string | null
          mux_playback_id?: string | null
          notetaker_id?: string | null
          recording_url?: string | null
          status?: string
          transcript_content?: Json | null
          transcript_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string | null
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
      recurring_event_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          master_event_id: string
          pinned: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          master_event_id: string
          pinned?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          master_event_id?: string
          pinned?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_event_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_recording_settings: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          master_event_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          master_event_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          master_event_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_recording_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          external_token: string | null
          id: string
          organization_id: string | null
          password: string | null
          recording_id: string
          share_type: string
          shared_by: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          external_token?: string | null
          id?: string
          organization_id?: string | null
          password?: string | null
          recording_id: string
          share_type: string
          shared_by: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          external_token?: string | null
          id?: string
          organization_id?: string | null
          password?: string | null
          recording_id?: string
          share_type?: string
          shared_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_shares_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_shares_shared_by_fkey"
            columns: ["shared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      video_views: {
        Row: {
          external_viewer_ip: string | null
          id: string
          recording_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          external_viewer_ip?: string | null
          id?: string
          recording_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          external_viewer_ip?: string | null
          id?: string
          recording_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_views_recording_id_fkey"
            columns: ["recording_id"]
            isOneToOne: false
            referencedRelation: "recordings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_views_viewer_id_fkey"
            columns: ["viewer_id"]
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
      get_shared_recording: {
        Args: {
          p_recording_id: string
          p_token: string
        }
        Returns: {
          id: string
          video_url: string
          recording_url: string
          notetaker_id: string
          transcript_content: Json
          mux_playback_id: string
          event: Json
        }[]
      }
      queue_notetaker_request: {
        Args: {
          p_queue_name: string
          p_message: Json
          p_delay_seconds?: number
        }
        Returns: string
      }
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
      audit_action:
        | "video_share"
        | "password_attempt"
        | "organization_update"
        | "settings_update"
      org_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
