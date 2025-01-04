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
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
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
          grant_status: string | null
          id: string
          notetaker_name: string | null
          nylas_grant_id: string | null
          organization_id: string | null
          record_external_meetings: boolean | null
          record_internal_meetings: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          grant_status?: string | null
          id: string
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          organization_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          grant_status?: string | null
          id?: string
          notetaker_name?: string | null
          nylas_grant_id?: string | null
          organization_id?: string | null
          record_external_meetings?: boolean | null
          record_internal_meetings?: boolean | null
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
          notetaker_id: string | null
          recording_url: string
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
          notetaker_id?: string | null
          recording_url: string
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
          notetaker_id?: string | null
          recording_url?: string
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
